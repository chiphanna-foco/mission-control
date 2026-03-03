/**
 * Task Deliverables API
 * Endpoints for managing task deliverables (files, URLs, artifacts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { broadcast } from '@/lib/events';
import { existsSync } from 'fs';
import path from 'path';
import type { TaskDeliverable } from '@/lib/types';

/**
 * GET /api/tasks/[id]/deliverables
 * Retrieve all deliverables for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const db = getDb();

    const deliverables = db.prepare(`
      SELECT *
      FROM task_deliverables
      WHERE task_id = ?
      ORDER BY created_at DESC
    `).all(taskId) as TaskDeliverable[];

    return NextResponse.json(deliverables);
  } catch (error) {
    console.error('Error fetching deliverables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliverables' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]/deliverables
 * Add a new deliverable to a task
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    
    const { deliverable_type, title, path, description } = body;

    if (!deliverable_type || !title) {
      return NextResponse.json(
        { error: 'deliverable_type and title are required' },
        { status: 400 }
      );
    }

    // Validate file existence for file deliverables
    let fileExists = true;
    let normalizedPath = path;
    if (deliverable_type === 'file' && path) {
      // Expand tilde
      normalizedPath = path.replace(/^~/, process.env.HOME || '');
      fileExists = existsSync(normalizedPath);
      if (!fileExists) {
        console.warn(`[DELIVERABLE] Warning: File does not exist: ${normalizedPath}`);
      }
    }

    const db = getDb();
    const id = crypto.randomUUID();

    // Insert deliverable
    db.prepare(`
      INSERT INTO task_deliverables (id, task_id, deliverable_type, title, path, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      taskId,
      deliverable_type,
      title,
      path || null,
      description || null
    );

    // Get the created deliverable
    const deliverable = db.prepare(`
      SELECT *
      FROM task_deliverables
      WHERE id = ?
    `).get(id) as TaskDeliverable;

    // Broadcast to SSE clients
    broadcast({
      type: 'deliverable_added',
      payload: deliverable,
    });

    // Return with warning if file doesn't exist
    if (deliverable_type === 'file' && !fileExists) {
      return NextResponse.json(
        {
          ...deliverable,
          warning: `File does not exist at path: ${normalizedPath}. Please create the file.`
        },
        { status: 201 }
      );
    }

    return NextResponse.json(deliverable, { status: 201 });
  } catch (error) {
    console.error('Error creating deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to create deliverable' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]/deliverables
 * Update a deliverable's status or other fields
 * Body: { deliverable_id, status?, title?, description? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const body = await request.json();
    const { deliverable_id, status, title, description } = body;

    if (!deliverable_id) {
      return NextResponse.json(
        { error: 'deliverable_id is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['not_started', 'in_progress', 'done'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const db = getDb();

    // Build dynamic update
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (status) { updates.push('status = ?'); values.push(status); }
    if (title) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    updates.push("updated_at = datetime('now')");

    if (updates.length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(deliverable_id);
    values.push(taskId);

    db.prepare(`
      UPDATE task_deliverables
      SET ${updates.join(', ')}
      WHERE id = ? AND task_id = ?
    `).run(...values);

    const updated = db.prepare('SELECT * FROM task_deliverables WHERE id = ?').get(deliverable_id) as TaskDeliverable;

    broadcast({
      type: 'deliverable_updated',
      payload: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating deliverable:', error);
    return NextResponse.json(
      { error: 'Failed to update deliverable' },
      { status: 500 }
    );
  }
}
