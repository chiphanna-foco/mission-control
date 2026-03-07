import { NextRequest, NextResponse } from 'next/server';
import { rejectItem, initializeQueue } from '@/lib/approval-queue';
import { notifySlackApprovalDecision } from '@/lib/slack-notifications';

// POST /api/approvals/:id/reject - Reject an item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initializeQueue();
    const { id } = await params;
    
    const body = await request.json().catch(() => ({}));
    const rejectedBy = (body as { rejectedBy?: string }).rejectedBy || 'system';
    const reason = (body as { reason?: string }).reason || '';

    const item = rejectItem(id, rejectedBy, reason);

    // Send Slack notification
    try {
      await notifySlackApprovalDecision(item, 'rejected', rejectedBy, reason);
    } catch (slackError) {
      console.error('Failed to send Slack notification:', slackError);
      // Don't fail the request if Slack notification fails
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to reject item:', error);
    const message = error instanceof Error ? error.message : 'Failed to reject item';
    return NextResponse.json({ error: message }, { status: error instanceof Error && error.message.includes('not found') ? 404 : 400 });
  }
}
