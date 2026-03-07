import { NextRequest, NextResponse } from 'next/server';
import { getApprovalItem, initializeQueue, getAuditLog } from '@/lib/approval-queue';

// GET /api/approvals/:id - Get single approval item with audit log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    initializeQueue();
    const { id } = await params;

    const item = getApprovalItem(id);
    if (!item) {
      return NextResponse.json({ error: 'Approval item not found' }, { status: 404 });
    }

    const auditLog = getAuditLog(id);

    return NextResponse.json({
      ...item,
      auditLog,
    });
  } catch (error) {
    console.error('Failed to fetch approval item:', error);
    return NextResponse.json({ error: 'Failed to fetch approval item' }, { status: 500 });
  }
}
