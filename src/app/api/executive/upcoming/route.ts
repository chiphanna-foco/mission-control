import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * GET /api/executive/upcoming
 * Fetch upcoming calendar events from Google Calendar via gws CLI
 */
export async function GET() {
  try {
    // Fetch events from both personal and work calendars
    const personalCalendarId = 'chip.hanna@gmail.com';
    const workCalendarId = 'chip@turbotenant.com';

    const now = new Date().toISOString();
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch personal calendar events
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
      console.warn('Personal calendar fetch failed:', e);
    }

    // Fetch work calendar events
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
      console.warn('Work calendar fetch failed:', e);
    }

    // Combine and sort by start time
    const allEvents = [...personalEvents, ...workEvents].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return NextResponse.json({
      success: true,
      data: allEvents.slice(0, 10),
      count: allEvents.length,
      message: 'Calendar events fetched successfully',
    });
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch calendar events',
        data: [],
      },
      { status: 500 }
    );
  }
}
