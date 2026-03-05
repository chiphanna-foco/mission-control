import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

/**
 * GET /api/upcoming-meetings
 * Frontend expects this endpoint for calendar events
 */
export async function GET() {
  try {
    const personalCalendarId = 'chip.hanna@gmail.com';
    const workCalendarId = 'chip@turbotenant.com';

    const now = new Date().toISOString();
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    let personalEvents: any[] = [];
    try {
      const { stdout: personalStdout } = await execAsync(
        `gws calendar events list --params '{"calendarId":"${personalCalendarId}","timeMin":"${now}","timeMax":"${inTwoDays}","maxResults":5,"singleEvents":true,"orderBy":"startTime"}'`,
        { timeout: 15000, env: { ...process.env } }
      );
      const personalData = JSON.parse(personalStdout);
      personalEvents = personalData.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || '(No title)',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        calendar: 'personal',
      })) || [];
    } catch (e) {
      console.warn('Personal calendar failed');
    }

    let workEvents: any[] = [];
    try {
      const { stdout: workStdout } = await execAsync(
        `gws calendar events list --params '{"calendarId":"${workCalendarId}","timeMin":"${now}","timeMax":"${inTwoDays}","maxResults":5,"singleEvents":true,"orderBy":"startTime"}'`,
        { timeout: 15000, env: { ...process.env } }
      );
      const workData = JSON.parse(workStdout);
      workEvents = workData.items?.map((event: any) => ({
        id: event.id,
        title: event.summary || '(No title)',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        calendar: 'work',
      })) || [];
    } catch (e) {
      console.warn('Work calendar failed');
    }

    const allEvents = [...personalEvents, ...workEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return NextResponse.json({
      meetings: allEvents.slice(0, 10).map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        calendar: event.calendar,
      })),
      live: true,
      note: 'Real Google Calendar data fetched successfully',
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      meetings: [],
      live: false,
      note: 'Failed to fetch upcoming meetings',
    });
  }
}
