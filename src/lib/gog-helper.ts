import { execSync } from 'child_process';
import type { DigestEmail, MeetingBrief, MeetingAttendee } from './executive-data';

// Safely execute gog commands with error handling
function runGog(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 15000 });
  } catch (error) {
    console.error(`gog failed: ${cmd}`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch stalled emails from Gmail (unanswered for >3 days)
 */
export async function fetchStalledEmailsFromGmail(): Promise<DigestEmail[]> {
  // Search for inbox emails from past 14 days, exclude sent/draft/spam
  const cmd = `gog gmail search "newer_than:14d label:inbox -label:sent -label:draft -label:spam" --max 50 --json 2>/dev/null`;
  const output = runGog(cmd);

  if (!output) {
    console.log('gog Gmail fetch failed, returning empty list');
    return [];
  }

  try {
    const emails = JSON.parse(output);
    const stalled: DigestEmail[] = [];
    const now = Date.now();

    for (const email of emails || []) {
      try {
        const timestamp = parseInt(email.internalDate, 10);
        const daysSince = (now - timestamp) / (1000 * 60 * 60 * 24);

        // Only include if stalled >3 days
        if (daysSince > 3) {
          // Extract from address
          const fromHeader = email.payload?.headers?.find((h: any) => h.name === 'From')?.value || 'Unknown';
          const fromMatch = fromHeader.match(/<([^>]+)>/);
          const fromEmail = fromMatch ? fromMatch[1] : fromHeader.split('<')[0].trim();
          const fromName = fromHeader.split('<')[0].trim() || 'Unknown';

          stalled.push({
            id: email.id,
            subject: email.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(no subject)',
            from: fromName || fromEmail,
            lastReplyAt: new Date(timestamp).toISOString(),
            daysStalled: Math.floor(daysSince),
            priority: daysSince > 7 ? 'overdue' : 'dueSoon',
            url: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
          });
        }
      } catch (parseErr) {
        console.error('Failed to parse email:', parseErr);
        continue;
      }
    }

    return stalled.sort((a, b) => b.daysStalled - a.daysStalled).slice(0, 10);
  } catch (parseErr) {
    console.error('Failed to parse Gmail response:', parseErr);
    return [];
  }
}

/**
 * Fetch upcoming meetings from Google Calendar
 */
export async function fetchUpcomingMeetingsFromCalendar(): Promise<MeetingBrief[]> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Get calendar ID (default to primary)
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  const cmd = `gog calendar events "${calendarId}" --from "${now.toISOString()}" --to "${in24h.toISOString()}" --json 2>/dev/null`;
  const output = runGog(cmd);

  if (!output) {
    console.log('gog Calendar fetch failed, returning empty list');
    return [];
  }

  try {
    const events = JSON.parse(output);
    const meetings: MeetingBrief[] = [];

    for (const event of events || []) {
      try {
        const startTime = new Date(event.start?.dateTime || event.start?.date);
        const endTime = new Date(event.end?.dateTime || event.end?.date);

        // Skip all-day events
        if (!event.start?.dateTime) {
          continue;
        }

        const attendees: MeetingAttendee[] = (event.attendees || []).map((att: any) => ({
          name: att.displayName || att.email.split('@')[0],
          email: att.email,
          responseStatus: att.responseStatus || 'needsAction',
        }));

        meetings.push({
          id: event.id,
          title: event.summary || '(no title)',
          startAt: startTime.toISOString(),
          endAt: endTime.toISOString(),
          attendees,
          emailContext: event.description || 'No description provided',
          keyOutcomes: [], // TODO: parse from description or use AI
          meetingUrl: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
        });
      } catch (eventErr) {
        console.error('Failed to parse calendar event:', eventErr);
        continue;
      }
    }

    return meetings.slice(0, 5); // Limit to next 5 meetings
  } catch (parseErr) {
    console.error('Failed to parse Calendar response:', parseErr);
    return [];
  }
}
