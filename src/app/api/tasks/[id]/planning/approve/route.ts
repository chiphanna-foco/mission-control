import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { PlanningQuestion, PlanningCategory } from '@/lib/types';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

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

function extractJSON(text: string): object | null {
  try { return JSON.parse(text.trim()); } catch { /* continue */ }
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) { try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* continue */ } }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
  }
  return null;
}

// Generate markdown spec from answered questions
function generateSpecMarkdown(task: { title: string; description?: string }, questions: PlanningQuestion[]): string {
  const lines: string[] = [];
  
  lines.push(`# ${task.title}`);
  lines.push('');
  lines.push('**Status:** SPEC LOCKED ✅');
  lines.push('');
  
  if (task.description) {
    lines.push('## Original Request');
    lines.push(task.description);
    lines.push('');
  }

  // Group questions by category
  const byCategory = questions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, PlanningQuestion[]>);

  const categoryLabels: Record<PlanningCategory, string> = {
    goal: '🎯 Goal & Success Criteria',
    audience: '👥 Target Audience',
    scope: '📋 Scope',
    design: '🎨 Design & Visual',
    content: '📝 Content',
    technical: '⚙️ Technical Requirements',
    timeline: '📅 Timeline',
    constraints: '⚠️ Constraints'
  };

  const categoryOrder: PlanningCategory[] = ['goal', 'audience', 'scope', 'design', 'content', 'technical', 'timeline', 'constraints'];

  for (const category of categoryOrder) {
    const categoryQuestions = byCategory[category];
    if (!categoryQuestions || categoryQuestions.length === 0) continue;

    lines.push(`## ${categoryLabels[category]}`);
    lines.push('');

    for (const q of categoryQuestions) {
      if (q.answer) {
        lines.push(`**${q.question}**`);
        lines.push(`> ${q.answer}`);
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push(`*Spec locked at ${new Date().toISOString()}*`);

  return lines.join('\n');
}

// POST /api/tasks/[id]/planning/approve - Lock spec and move to inbox
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    // Get task
    const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as { id: string; title: string; description?: string; status: string } | undefined;
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if already locked
    const existingSpec = getDb().prepare(
      'SELECT * FROM planning_specs WHERE task_id = ?'
    ).get(taskId);

    if (existingSpec) {
      return NextResponse.json({ error: 'Spec already locked' }, { status: 400 });
    }

    // Handle useDefaults: skip Q&A, generate spec from description via OpenClaw
    const body = await request.json().catch(() => ({}));
    if (body.useDefaults) {
      const sessionKey = `agent:main:planning-skip:${taskId}-${Date.now()}`;
      const prompt = `Generate a complete project spec from this task description. Return ONLY valid JSON.

Task: ${task.title}
Description: ${task.description || 'No description provided'}

Return JSON:
{
  "title": "${task.title}",
  "summary": "...",
  "deliverables": ["..."],
  "success_criteria": ["..."],
  "constraints": {}
}`;

      let spec: Record<string, unknown> | null = null;
      try {
        const raw = await callOpenClawHTTP(sessionKey, prompt);
        spec = extractJSON(raw) as Record<string, unknown> | null;
      } catch (err) {
        console.error('[Planning Skip] OpenClaw call failed:', err);
      }

      if (!spec) {
        // Fallback: generate a basic spec from the description
        spec = {
          title: task.title,
          summary: task.description || 'No description provided',
          deliverables: [],
          success_criteria: [],
          constraints: {},
        };
      }

      const specMarkdown = `# ${task.title}\n\n**Status:** SPEC LOCKED ✅\n\n## Summary\n${(spec.summary as string) || task.description || ''}\n\n---\n*Spec locked (defaults) at ${new Date().toISOString()}*`;

      const specId = crypto.randomUUID();
      getDb().prepare(`
        INSERT INTO planning_specs (id, task_id, spec_markdown, locked_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(specId, taskId, specMarkdown);

      getDb().prepare(`
        UPDATE tasks
        SET description = ?, status = 'inbox', planning_complete = 1, planning_spec = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(specMarkdown, JSON.stringify(spec), taskId);

      const activityId = crypto.randomUUID();
      getDb().prepare(`
        INSERT INTO task_activities (id, task_id, activity_type, message)
        VALUES (?, ?, 'status_changed', 'Planning skipped — spec generated from description defaults')
      `).run(activityId, taskId);

      return NextResponse.json({ success: true, spec, specMarkdown });
    }

    // Get all questions
    const questions = getDb().prepare(
      'SELECT * FROM planning_questions WHERE task_id = ? ORDER BY sort_order'
    ).all(taskId) as PlanningQuestion[];

    // Check if all questions are answered
    const unanswered = questions.filter(q => !q.answer);
    if (unanswered.length > 0) {
      return NextResponse.json({
        error: 'All questions must be answered before locking',
        unanswered: unanswered.length
      }, { status: 400 });
    }

    // Parse options for each question
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options as unknown as string) : undefined
    }));

    // Generate spec markdown
    const specMarkdown = generateSpecMarkdown(task, parsedQuestions);

    // Create spec record
    const specId = crypto.randomUUID();
    getDb().prepare(`
      INSERT INTO planning_specs (id, task_id, spec_markdown, locked_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(specId, taskId, specMarkdown);

    // Update task description with spec and move to inbox
    getDb().prepare(`
      UPDATE tasks 
      SET description = ?, status = 'inbox', updated_at = datetime('now')
      WHERE id = ?
    `).run(specMarkdown, taskId);

    // Log activity
    const activityId = crypto.randomUUID();
    getDb().prepare(`
      INSERT INTO task_activities (id, task_id, activity_type, message)
      VALUES (?, ?, 'status_changed', 'Planning complete - spec locked and moved to inbox')
    `).run(activityId, taskId);

    // Get the created spec
    const spec = getDb().prepare(
      'SELECT * FROM planning_specs WHERE id = ?'
    ).get(specId);

    return NextResponse.json({
      success: true,
      spec,
      specMarkdown
    });
  } catch (error) {
    console.error('Failed to approve spec:', error);
    return NextResponse.json({ error: 'Failed to approve spec' }, { status: 500 });
  }
}
