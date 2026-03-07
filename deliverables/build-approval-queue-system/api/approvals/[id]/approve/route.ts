import { NextRequest, NextResponse } from 'next/server';
import { approveItem, initializeQueue } from '@/lib/approval-queue';
import { notifySlackApprovalDecision } from '@/lib/slack-notifications';

// POST /api/approvals/:id/approve - Approve an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initializeQueue();
    const { id } = await params;
    
    const body = await request.json().catch(() => ({}));
    const approvedBy = (body as { approvedBy?: string }).approvedBy || 'system';

    const item = approveItem(id, approvedBy);

    // Send Slack notification
    try {
      await notifySlackApprovalDecision(item, 'approved', approvedBy);
    } catch (slackError) {
      console.error('Failed to send Slack notification:', slackError);
      // Don't fail the request if Slack notification fails
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to approve item:', error);
    const message = error instanceof Error ? error.message : 'Failed to approve item';
    return NextResponse.json({ error: message }, { status: error instanceof Error && error.message.includes('not found') ? 404 : 400 });
  }
}
