import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/executive/digest
 * Fetch unread emails from Gmail using gws CLI
 */
export async function GET(request: Request) {
  try {
    // Fetch unread emails (last 7 days, limit 10)
    const { stdout } = await execAsync(
      `gws gmail users messages list --params '{"userId":"me","q":"is:unread newer_than:7d","maxResults":10,"format":"full"}'`,
      {
        timeout: 30000,
        env: { ...process.env },
      }
    );

    const messagesData = JSON.parse(stdout);
    const messages = messagesData.messages || [];

    // Fetch full message details for each one
    const emails = [];
    for (const msg of messages.slice(0, 5)) {
      try {
        const { stdout: msgDetail } = await execAsync(
          `gws gmail users messages get --params '{"userId":"me","id":"${msg.id}","format":"full"}'`,
          {
            timeout: 10000,
            env: { ...process.env },
          }
        );

        const fullMsg = JSON.parse(msgDetail);
        const headers = fullMsg.payload?.headers || [];

        // Extract email fields from headers
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || 'Unknown';

        const from = getHeader('from');
        const subject = getHeader('subject');
        const date = getHeader('date');

        // Extract snippet from payload
        const snippet = fullMsg.snippet?.substring(0, 100) || '';

        emails.push({
          id: msg.id,
          from,
          subject,
          snippet,
          date,
          unread: true,
        });
      } catch (e) {
        console.warn(`Failed to fetch message ${msg.id}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      data: emails,
      count: emails.length,
      message: `${emails.length} unread emails fetched successfully`,
    });
  } catch (error) {
    console.error('Gmail API error:', error);

    // Return empty array if gws CLI fails
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch unread emails',
        data: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
