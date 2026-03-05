import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

/**
 * GET /api/executive-digest
 * Frontend expects this endpoint for unread emails + pending items
 */
export async function GET() {
  try {
    // Fetch unread emails
    const { stdout } = await execAsync(
      `gws gmail users messages list --params '{"userId":"me","q":"is:unread newer_than:7d","maxResults":10,"format":"full"}'`,
      { timeout: 30000, env: { ...process.env } }
    );

    const messagesData = JSON.parse(stdout);
    const messages = messagesData.messages || [];

    const emails = [];
    for (const msg of messages.slice(0, 5)) {
      try {
        const { stdout: msgDetail } = await execAsync(
          `gws gmail users messages get --params '{"userId":"me","id":"${msg.id}","format":"full"}'`,
          { timeout: 10000, env: { ...process.env } }
        );

        const fullMsg = JSON.parse(msgDetail);
        const headers = fullMsg.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || 'Unknown';

        emails.push({
          id: msg.id,
          from: getHeader('from'),
          subject: getHeader('subject'),
          snippet: fullMsg.snippet?.substring(0, 100) || '',
          date: getHeader('date'),
          unread: true,
        });
      } catch (e) {
        console.warn(`Failed to fetch message ${msg.id}`);
      }
    }

    return NextResponse.json({
      stalledEmails: emails,
      pendingIntros: [],
      overdueTasks: [],
      calendarConflicts: [],
      notes: ['Real Gmail data fetched successfully'],
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      stalledEmails: [],
      pendingIntros: [],
      overdueTasks: [],
      calendarConflicts: [],
      error: 'Failed to fetch digest',
    });
  }
}
