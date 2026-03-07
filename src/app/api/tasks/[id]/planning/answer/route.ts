import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOpenClawClient } from '@/lib/openclaw/client';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

// Helper to call OpenClaw with timeout
async function callOpenClawWithTimeout(
  sessionKey: string,
  message: string,
  timeoutMs: number = 15000
): Promise<string> {
  const client = getOpenClawClient();
  if (!client.isConnected()) {
    await client.connect();
  }

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`OpenClaw request timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    // Send the message using sessions.send
    await Promise.race([
      client.call('sessions.send', {
        session_id: sessionKey,
        content: message,
      }),
      timeoutPromise,
    ]);

    // Poll for response with timeout
    const pollStartTime = Date.now();
    const pollTimeoutMs = timeoutMs - 1000;
    
    while (Date.now() - pollStartTime < pollTimeoutMs) {
      try {
        const result = await client.call<unknown[]>('sessions.history', {
          session_id: sessionKey,
        });

        const msgArray = Array.isArray(result) ? result : (result as any)?.messages || [];
        const latestAssistant = [...msgArray].reverse().find((m: any) => m.role === 'assistant');

        if (latestAssistant && latestAssistant.content) {
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
        console.error('[Planning Answer] Error polling:', pollErr);
      }

      // Wait before next poll
      await new Promise(r => setTimeout(r, 500));
    }

    throw new Error('Timeout waiting for OpenClaw response');
  } catch (err) {
    console.error('[Planning Answer] OpenClaw call failed:', err instanceof Error ? err.message : String(err));
    throw err;
  }
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

    // Send the answer prompt to the planning session with timeout
    let response: string | null = null;
    try {
      response = await callOpenClawWithTimeout(task.planning_session_key!, answerPrompt, 12000);
    } catch (err) {
      console.error('[Planning Answer] OpenClaw call failed (will retry via GET polling):', err instanceof Error ? err.message : String(err));
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
