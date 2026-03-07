import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';
// File system imports removed - using OpenClaw API instead

// Planning session prefix for OpenClaw (must match agent:main: format)
const PLANNING_SESSION_PREFIX = 'agent:main:planning:';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Helper to call OpenClaw with timeout
async function callOpenClawWithTimeout(
  sessionKey: string,
  message: string,
  timeoutMs: number = 15000
): Promise<string> {
  const startTime = Date.now();
  console.log(`[Planning] [${new Date().toISOString()}] START: Calling OpenClaw with ${timeoutMs}ms timeout`);
  
  const client = getOpenClawClient();
  
  if (!client.isConnected()) {
    console.log(`[Planning] [T+${Date.now() - startTime}ms] Checking connection...`);
    try {
      console.log(`[Planning] [T+${Date.now() - startTime}ms] Connecting to OpenClaw...`);
      await client.connect();
      console.log(`[Planning] [T+${Date.now() - startTime}ms] Connected successfully`);
    } catch (connErr) {
      console.error(`[Planning] [T+${Date.now() - startTime}ms] Connection failed:`, connErr);
      throw connErr;
    }
  } else {
    console.log(`[Planning] [T+${Date.now() - startTime}ms] Already connected`);
  }

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.error(`[Planning] [T+${elapsed}ms] TIMEOUT: Request exceeded ${timeoutMs}ms`);
      reject(new Error(`OpenClaw request timeout after ${elapsed}ms (limit: ${timeoutMs}ms)`));
    }, timeoutMs);
    
    // Log timeout setup
    console.log(`[Planning] [T+${Date.now() - startTime}ms] Timeout safety net installed (${timeoutMs}ms)`);
  });

  try {
    // Send the message using sessions.send
    console.log(`[Planning] [T+${Date.now() - startTime}ms] Sending message to session: ${sessionKey}`);
    const sendStart = Date.now();
    
    await Promise.race([
      (async () => {
        try {
          const sendResult = await client.call('chat.send', {
            sessionKey: sessionKey,
            message: message,
            idempotencyKey: `planning-${sessionKey}-${Date.now()}`
          }, 8000); // 8 second timeout for chat.send
          console.log(`[Planning] [T+${Date.now() - startTime}ms] chat.send returned after ${Date.now() - sendStart}ms:`, 
            typeof sendResult === 'object' ? JSON.stringify(sendResult).slice(0, 100) : String(sendResult).slice(0, 100));
          return sendResult;
        } catch (sendErr) {
          console.error(`[Planning] [T+${Date.now() - startTime}ms] chat.send threw:`, sendErr);
          throw sendErr;
        }
      })(),
      timeoutPromise,
    ]);

    // Poll for response with timeout
    console.log(`[Planning] [T+${Date.now() - startTime}ms] Message sent, starting poll for response...`);
    const pollStartTime = Date.now();
    const pollTimeoutMs = timeoutMs - 1000; // Reserve 1s for fallback
    let pollCount = 0;
    
    while (Date.now() - pollStartTime < pollTimeoutMs) {
      pollCount++;
      try {
        const historyStart = Date.now();
        const result = await client.call<any>('chat.history', {
          sessionKey: sessionKey,
          limit: 100
        }, 5000); // 5 second timeout for chat.history polling
        const historyTime = Date.now() - historyStart;
        
        const messages = Array.isArray(result) ? result : (result as any)?.messages || [];
        console.log(`[Planning] [T+${Date.now() - startTime}ms] Poll #${pollCount} (${historyTime}ms): Got ${messages.length} messages, result type: ${typeof result}`);
        
        // Result might be wrapped in { messages: [...] }
        const messageList = Array.isArray(result) ? result : result?.messages || [];
        const latestAssistant = [...messageList].reverse().find((m: any) => m.role === 'assistant');

        if (latestAssistant && latestAssistant.content) {
          console.log(`[Planning] [T+${Date.now() - startTime}ms] ✓ SUCCESS: Got response from OpenClaw after ${pollCount} polls`);
          // Extract text from content (could be string or array)
          if (typeof latestAssistant.content === 'string') {
            return latestAssistant.content;
          } else if (Array.isArray(latestAssistant.content)) {
            const textParts = latestAssistant.content
              .filter((c: any) => c.type === 'text' && c.text)
              .map((c: any) => c.text)
              .join('\n');
            if (textParts) return textParts;
          }
        }
      } catch (pollErr) {
        console.error(`[Planning] [T+${Date.now() - startTime}ms] Poll #${pollCount} error:`, 
          pollErr instanceof Error ? pollErr.message : String(pollErr));
      }

      // Wait before next poll
      console.log(`[Planning] [T+${Date.now() - startTime}ms] Waiting 500ms before poll #${pollCount + 1}...`);
      await new Promise(r => setTimeout(r, 500));
    }

    const elapsed = Date.now() - pollStartTime;
    console.error(`[Planning] [T+${Date.now() - startTime}ms] TIMEOUT: Poll exhausted after ${elapsed}ms / ${pollTimeoutMs}ms`);
    throw new Error(`Timeout waiting for OpenClaw response (${elapsed}ms after polling started, ${Date.now() - startTime}ms total)`);
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[Planning] [T+${elapsed}ms] FAILED: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
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

// Helper to get messages from OpenClaw API with timeout
async function getMessagesFromOpenClaw(sessionKey: string, timeoutMs: number = 5000): Promise<Array<{ role: string; content: string }>> {
  try {
    const client = getOpenClawClient();
    if (!client.isConnected()) {
      await client.connect();
    }
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('getMessagesFromOpenClaw timeout')), timeoutMs);
    });

    // Use chat.history API to get session messages
    const result = await Promise.race([
      client.call<any>('chat.history', {
        sessionKey: sessionKey,
        limit: 100
      }, 4000), // 4 second timeout for this call
      timeoutPromise,
    ]);
    
    const messages: Array<{ role: string; content: string }> = [];
    const msgArray = Array.isArray(result) ? result : (result as any)?.messages || [];
    
    for (const msg of msgArray) {
      if (msg.role === 'assistant') {
        let text = '';
        
        if (typeof msg.content === 'string') {
          // Content is already a string
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          // Content is an array of content blocks - concatenate all text blocks
          text = msg.content
            .filter((c: any) => c.type === 'text' && c.text)
            .map((c: any) => c.text!)
            .join('\n');
        } else if (msg.content && typeof msg.content === 'object') {
          // Content might be an object with text property
          text = msg.content.text || '';
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
    
    console.log('[Planning GET] Found', messages.length, 'assistant messages via API');
    return messages;
  } catch (err) {
    console.error('[Planning GET] Failed to get messages from OpenClaw:', err instanceof Error ? err.message : String(err));
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

    // Call OpenClaw with timeout
    let response: string | null = null;
    let error: Error | null = null;
    
    try {
      console.log('[Planning POST] Starting OpenClaw call for task:', taskId);
      response = await callOpenClawWithTimeout(sessionKey, planningPrompt, 12000);
      console.log('[Planning POST] Got response:', response?.slice(0, 150));
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      console.error('[Planning POST] OpenClaw call failed:', error.message);
    }

    // If we got a response, save it and try to parse
    if (response && response.trim()) {
      messages.push({ role: 'assistant', content: response, timestamp: Date.now() });
      
      getDb().prepare(`
        UPDATE tasks SET planning_messages = ? WHERE id = ?
      `).run(JSON.stringify(messages), taskId);

      const parsed = extractJSON(response);
      if (parsed && 'question' in parsed) {
        console.log('[Planning POST] Successfully parsed question');
        return NextResponse.json({
          success: true,
          sessionKey,
          currentQuestion: parsed,
          messages,
        });
      } else {
        console.log('[Planning POST] Got response but could not parse as question');
        return NextResponse.json({
          success: true,
          sessionKey,
          rawResponse: response,
          messages,
        });
      }
    }

    // If timeout or error, return waiting status
    // Frontend will poll GET endpoint to check for updates
    console.log('[Planning POST] Returning waiting status for polling');
    getDb().prepare(`
      UPDATE tasks SET planning_messages = ? WHERE id = ?
    `).run(JSON.stringify(messages), taskId);

    return NextResponse.json({
      success: true,
      sessionKey,
      messages,
      note: error ? `Started planning (${error.message}). Waiting for response...` : 'Planning started, waiting for response. Poll GET endpoint for updates.',
    });
  } catch (error) {
    console.error('Failed to start planning:', error);
    return NextResponse.json({ error: 'Failed to start planning: ' + (error as Error).message }, { status: 500 });
  }
}
