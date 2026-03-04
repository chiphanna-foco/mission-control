import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
// File system imports removed - using OpenClaw API instead

// Planning session prefix for OpenClaw (must match agent:main: format)
const PLANNING_SESSION_PREFIX = 'agent:main:planning:';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Helper to call the OpenClaw HTTP API (avoids operator.write scope requirement)
async function callOpenClawHTTP(sessionKey: string, message: string): Promise<string> {
  const httpUrl = GATEWAY_URL.replace(/^ws/, 'http');
  const response = await fetch(`${httpUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-haiku-4-5',
      messages: [{ role: 'user', content: message }],
      max_tokens: 4096,
      'x-session-key': sessionKey,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenClaw HTTP API error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Helper to extract JSON from a response that might have markdown code blocks or surrounding text
function extractJSON(text: string): object | null {
  // First, try direct parse
  try {
    return JSON.parse(text.trim());
  } catch {
    // Continue to other methods
  }

  // Try to extract from markdown code block (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Try to find JSON object in the text (first { to last })
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      // Continue
    }
  }

  return null;
}

// Helper to get messages from OpenClaw API
async function getMessagesFromOpenClaw(sessionKey: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const client = getOpenClawClient();
    if (!client.isConnected()) {
      await client.connect();
    }
    
    // Use chat.history API to get session messages
    const result = await client.call<{ messages: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }> }>('chat.history', {
      sessionKey,
      limit: 20,
    });
    
    const messages: Array<{ role: string; content: string }> = [];
    
    for (const msg of result.messages || []) {
      if (msg.role === 'assistant') {
        let text = '';
        
        if (typeof msg.content === 'string') {
          // Content is already a string
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          // Content is an array of content blocks - concatenate all text blocks
          text = msg.content
            .filter((c) => c.type === 'text' && c.text)
            .map((c) => c.text!)
            .join('\n');
        }
        
        // Only include non-empty messages (skip partial/streaming responses)
        if (text && text.trim().length > 5) {
          messages.push({
            role: 'assistant',
            content: text
          });
        }
      }
    }
    
    console.log('[Planning] Found', messages.length, 'assistant messages via API');
    return messages;
  } catch (err) {
    console.error('[Planning] Failed to get messages from OpenClaw:', err);
    return [];
  }
}

// GET /api/tasks/[id]/planning - Get planning state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get task
    const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as {
      id: string;
      title: string;
      description: string;
      status: string;
      planning_session_key?: string;
      planning_messages?: string;
      planning_complete?: number;
      planning_spec?: string;
      planning_agents?: string;
    } | undefined;
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Parse planning messages from JSON
    const messages = task.planning_messages ? JSON.parse(task.planning_messages) : [];
    
    // Find the latest question (last assistant message with question structure)
    let lastAssistantMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'assistant');
    let currentQuestion = null;
    
    // If no assistant response in DB but session exists, check OpenClaw for new messages
    if (!lastAssistantMessage && task.planning_session_key && messages.length > 0) {
      console.log('[Planning GET] No assistant message in DB, checking OpenClaw...');
      const openclawMessages = await getMessagesFromOpenClaw(task.planning_session_key);
      if (openclawMessages.length > 0) {
        const newAssistant = [...openclawMessages].reverse().find(m => m.role === 'assistant');
        if (newAssistant) {
          console.log('[Planning GET] Found assistant message in OpenClaw, syncing to DB');
          messages.push({ role: 'assistant', content: newAssistant.content, timestamp: Date.now() });
          getDb().prepare('UPDATE tasks SET planning_messages = ? WHERE id = ?')
            .run(JSON.stringify(messages), taskId);
          lastAssistantMessage = { role: 'assistant', content: newAssistant.content };
        }
      }
    }
    
    if (lastAssistantMessage) {
      // Use extractJSON to handle code blocks and surrounding text
      const parsed = extractJSON(lastAssistantMessage.content);
      if (parsed && 'question' in parsed) {
        currentQuestion = parsed;
      }
    }

    return NextResponse.json({
      taskId,
      sessionKey: task.planning_session_key,
      messages,
      currentQuestion,
      isComplete: !!task.planning_complete,
      spec: task.planning_spec ? JSON.parse(task.planning_spec) : null,
      agents: task.planning_agents ? JSON.parse(task.planning_agents) : null,
      isStarted: messages.length > 0,
    });
  } catch (error) {
    console.error('Failed to get planning state:', error);
    return NextResponse.json({ error: 'Failed to get planning state' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/planning - Start planning session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get task
    const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as {
      id: string;
      title: string;
      description: string;
      status: string;
      planning_session_key?: string;
      planning_messages?: string;
    } | undefined;
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if planning already started
    const url = new URL(request.url);
    const forceReset = url.searchParams.get('reset') === 'true';
    if (task.planning_session_key) {
      if (forceReset) {
        // Reset planning session — use a NEW session key so OpenClaw history does not bleed in
        getDb().prepare('UPDATE tasks SET planning_session_key = NULL, planning_messages = NULL, planning_complete = 0, planning_spec = NULL, planning_agents = NULL WHERE id = ?').run(taskId);
      } else {
        return NextResponse.json({ error: 'Planning already started', sessionKey: task.planning_session_key }, { status: 400 });
      }
    }

    // Use timestamped session key so each fresh start has clean OpenClaw history
    const sessionKeySuffix = forceReset ? `-${Date.now()}` : '';

    // Create session key for this planning task (suffix added on reset for clean history)
    const sessionKey = `${PLANNING_SESSION_PREFIX}${taskId}${sessionKeySuffix || ''}`;

    // Build the initial planning prompt
    const planningPrompt = `PLANNING REQUEST

Task Title: ${task.title}

Task Description (READ THIS CAREFULLY — your questions must be grounded in this spec):
---
${task.description || 'No description provided'}
---

You are starting a planning session for this task. Your job is to ask clarifying questions that fill in GAPS or DECISIONS not already covered by the description above.

IMPORTANT RULES:
- Read the description thoroughly before generating questions
- DO NOT ask about things already specified in the description
- Questions must resolve genuine ambiguities or trade-offs for THIS specific task
- Every question must directly reference context from the description above
- Questions must be multiple choice with 3-4 options
- Include an "Other" option
- **ASK ONLY ONE QUESTION AT A TIME.** Do not ask multiple questions in a single response.
- Do not wrap your JSON in markdown code blocks (no triple backticks)

Respond with ONLY valid JSON (no markdown code blocks, no triple backticks). Output pure JSON, nothing else:
{"question": "Your question here?", "options": [{"id": "A", "label": "First option"}, {"id": "B", "label": "Second option"}, {"id": "C", "label": "Third option"}, {"id": "other", "label": "Other"}]}`;

    // Store the session key and initial message
    const messages = [{ role: 'user', content: planningPrompt, timestamp: Date.now() }];
    
    getDb().prepare(`
      UPDATE tasks 
      SET planning_session_key = ?, planning_messages = ?, status = 'planning'
      WHERE id = ?
    `).run(sessionKey, JSON.stringify(messages), taskId);

    // Call OpenClaw HTTP API (bypasses operator.write scope requirement)
    let response: string | null = null;
    try {
      response = await callOpenClawHTTP(sessionKey, planningPrompt);
      console.log('[Planning] Got HTTP API response:', response?.slice(0, 100));
    } catch (err) {
      console.error('[Planning] HTTP API call failed:', err);
    }

    if (response) {
      messages.push({ role: 'assistant', content: response, timestamp: Date.now() });
      
      getDb().prepare(`
        UPDATE tasks SET planning_messages = ? WHERE id = ?
      `).run(JSON.stringify(messages), taskId);

      const parsed = extractJSON(response);
      if (parsed && 'question' in parsed) {
        return NextResponse.json({
          success: true,
          sessionKey,
          currentQuestion: parsed,
          messages,
        });
      } else {
        return NextResponse.json({
          success: true,
          sessionKey,
          rawResponse: response,
          messages,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionKey,
      messages,
      note: 'Planning started, waiting for response. Poll GET endpoint for updates.',
    });
  } catch (error) {
    console.error('Failed to start planning:', error);
    return NextResponse.json({ error: 'Failed to start planning: ' + (error as Error).message }, { status: 500 });
  }
}
