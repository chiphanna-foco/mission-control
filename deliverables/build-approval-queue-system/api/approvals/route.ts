import { NextRequest, NextResponse } from 'next/server';
import { createApprovalItem, getPendingItems, initializeQueue } from '@/lib/approval-queue';
import type { ApprovalItemRequest } from '@/lib/approval-queue';
import { notifySlackApprovalQueue } from '@/lib/slack-notifications';

// GET /api/approvals - List pending items with pagination
export async function GET(request: NextRequest) {
  try {
    initializeQueue();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = getPendingItems(page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch approval items:', error);
    return NextResponse.json({ error: 'Failed to fetch approval items' }, { status: 500 });
  }
}

// POST /api/approvals - Create a new approval item
export async function POST(request: NextRequest) {
  try {
    initializeQueue();
    
    const body: ApprovalItemRequest = await request.json();

    // Validation
    if (!body.type || !body.title || !body.content || !body.source_agent) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, content, source_agent' },
        { status: 400 }
      );
    }

    if (!['email', 'social', 'blog', 'content'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: email, social, blog, content' },
        { status: 400 }
      );
    }

    const item = createApprovalItem(body);

    // Send Slack notification
    try {
      await notifySlackApprovalQueue(item);
    } catch (slackError) {
      console.error('Failed to send Slack notification:', slackError);
      // Don't fail the request if Slack notification fails
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Failed to create approval item:', error);
    return NextResponse.json({ error: 'Failed to create approval item' }, { status: 500 });
  }
}
