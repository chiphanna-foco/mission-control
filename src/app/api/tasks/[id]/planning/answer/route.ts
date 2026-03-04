import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Helper to call the OpenClaw HTTP API
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
      max_tokens: 1024,
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

// Helper to extract JSON from a response (handles markdown code blocks)
function extractJSON(text: string): object | null {
  try {
    return JSON.parse(text.trim());
  } catch {
    // Try to extract from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // Continue to other methods
      }
    }
    
    // Try to find JSON in the text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// POST /api/tasks/[id]/planning/answer - Submit an answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    const body = await request.json();
    const { answer, otherText } = body;

    if (!answer) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    // Get task
    const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as {
      id: string;
      title: string;
      description: string;
      planning_session_key?: string;
      planning_messages?: string;
    } | undefined;

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.planning_session_key) {
      return NextResponse.json({ error: 'Planning not started' }, { status: 400 });
    }

    // Build the answer message
    const answerText = answer === 'other' && otherText 
      ? `Other: ${otherText}`
      : answer;

    // Parse existing messages FIRST
    const messages = task.planning_messages ? JSON.parse(task.planning_messages) : [];

    // Build full conversation history for context (last 5 Q&A pairs + current answer)
    const conversationHistory = messages.slice(-10).map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`).join('\n');
    
    const answerPrompt = `PLANNING CONVERSATION HISTORY:
${conversationHistory}

User's answer to the last question: ${answerText}

Based on this answer and the full conversation above, either:
1. Ask your next question (if you need more information) — ask ONLY ONE question
2. Complete the planning (if you have enough information)

CRITICAL: Return ONLY valid JSON. Do not wrap it in code blocks or markdown.

For another question, respond with ONLY this JSON (no markdown, no code blocks):
{"question": "Your next question?", "options": [{"id": "A", "label": "Option A"}, {"id": "B", "label": "Option B"}, {"id": "other", "label": "Other"}]}

If planning is complete, respond with ONLY this JSON (no markdown, no code blocks):
{"status": "complete", "spec": {"title": "Task title", "summary": "Summary of what needs to be done", "deliverables": ["List of deliverables"], "success_criteria": ["How we know it's done"], "constraints": {}}, "agents": [{"name": "Agent Name", "role": "Agent role", "avatar_emoji": "🎯", "soul_md": "Agent personality...", "instructions": "Specific instructions..."}], "execution_plan": {"approach": "How to execute", "steps": ["Step 1", "Step 2"]}}`;

    // Add user's answer to messages
    messages.push({ role: 'user', content: answerText, timestamp: Date.now() });

    // Update messages in DB immediately with the user's answer
    getDb().prepare(`
      UPDATE tasks SET planning_messages = ? WHERE id = ?
    `).run(JSON.stringify(messages), taskId);

    // Send the answer prompt to the planning session via HTTP API with a timeout
    // We use Promise.race to handle potential hangs
    let response: string | null = null;
    try {
      const timeoutPromise = new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('OpenClaw timeout after 30s')), 30000)
      );
      
      const responsePromise = callOpenClawHTTP(task.planning_session_key!, answerPrompt);
      response = await Promise.race([responsePromise, timeoutPromise]);
    } catch (err) {
      console.error('[Planning] HTTP API error (will retry via GET polling):', err);
      // Return immediately; let the frontend poll for the response
      return NextResponse.json({
        complete: false,
        messages,
        note: 'Answer submitted. Fetching next question...',
      });
    }

    // Process the response if we got one
    if (response) {
      messages.push({ role: 'assistant', content: response, timestamp: Date.now() });

      // Update DB with the response
      getDb().prepare(`
        UPDATE tasks SET planning_messages = ? WHERE id = ?
      `).run(JSON.stringify(messages), taskId);

      // Check if the response contains valid JSON for the next question or completion
      const parsed = extractJSON(response) as {
        status?: string;
        question?: string;
        spec?: object;
        agents?: Array<{
          name: string;
          role: string;
          avatar_emoji?: string;
          soul_md?: string;
          instructions?: string;
        }>;
        execution_plan?: object;
      } | null;

      if (parsed && parsed.status === 'complete') {
        // Planning is complete
        getDb().prepare(`
          UPDATE tasks 
          SET planning_messages = ?, 
              planning_complete = 1,
              planning_spec = ?,
              planning_agents = ?,
              status = 'inbox'
          WHERE id = ?
        `).run(
          JSON.stringify(messages),
          JSON.stringify(parsed.spec),
          JSON.stringify(parsed.agents),
          taskId
        );

        return NextResponse.json({
          complete: true,
          spec: parsed.spec,
          agents: parsed.agents,
          executionPlan: parsed.execution_plan,
          messages,
        });
      }

      // Return the next question or the response
      return NextResponse.json({
        complete: false,
        currentQuestion: parsed && 'question' in parsed ? parsed : null,
        messages,
      });
    }

    // No response from OpenClaw yet; frontend will poll
    return NextResponse.json({
      complete: false,
      messages,
      note: 'Answer submitted. Fetching next question...',
    });
  } catch (error) {
    console.error('Failed to submit answer:', error);
    return NextResponse.json({ error: 'Failed to submit answer: ' + (error as Error).message }, { status: 500 });
  }
}
