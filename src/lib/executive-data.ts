import fs from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';

export type Priority = 'overdue' | 'dueSoon' | 'onTrack';

export interface DigestEmail {
  id: string;
  subject: string;
  from: string;
  lastReplyAt: string;
  daysStalled: number;
  priority: Priority;
  url?: string;
}

export interface PendingIntro {
  id: string;
  requester: string;
  introducee: string;
  requestedAt: string;
  status: string;
  priority: Priority;
  url?: string;
}

export interface CalendarConflict {
  id: string;
  startAt: string;
  endAt: string;
  events: string[];
  priority: Priority;
}

export interface ActionItem {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  source: string;
  owner: string | null;
  url: string | null;
  priority: Priority;
}

export interface MeetingAttendee {
  name: string;
  email: string;
  responseStatus: string;
}

export interface MeetingBrief {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  attendees: MeetingAttendee[];
  emailContext: string;
  keyOutcomes: string[];
  meetingUrl: string | null;
}

export interface WeeklyMetric {
  id: string;
  label: string;
  value: string;
  target: string;
  trend: 'up' | 'down' | 'flat';
  status: Priority;
}

export interface WeeklyMetricsPayload {
  weekLabel: string;
  generatedAt: string;
  affluentIoCommissions: WeeklyMetric[];
  gameBuzzFollowers: WeeklyMetric[];
  healthData: WeeklyMetric[];
}

const MC_DATA_DIR = path.join(process.cwd(), 'mission-control', 'data');

function parseDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null;

  if (input instanceof Date && !Number.isNaN(input.valueOf())) {
    return input;
  }

  if (typeof input === 'number') {
    const ms = input > 1_000_000_000_000 ? input : input * 1000;
    const dateFromNumber = new Date(ms);
    return Number.isNaN(dateFromNumber.valueOf()) ? null : dateFromNumber;
  }

  if (typeof input === 'string') {
    const maybeNumeric = Number(input);
    if (!Number.isNaN(maybeNumeric) && input.trim() !== '') {
      return parseDate(maybeNumeric);
    }

    const parsed = new Date(input);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
  }

  return null;
}

function priorityFromDueDate(dueDate: Date | null, status: string): Priority {
  if (status.toLowerCase().includes('done') || status.toLowerCase().includes('complete')) {
    return 'onTrack';
  }

  if (!dueDate) return 'onTrack';

  const now = Date.now();
  const msUntilDue = dueDate.valueOf() - now;
  if (msUntilDue < 0) return 'overdue';
  if (msUntilDue <= 1000 * 60 * 60 * 24 * 2) return 'dueSoon';
  return 'onTrack';
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

async function readJsonFile<T>(fileName: string): Promise<T | null> {
  const fullPath = path.join(MC_DATA_DIR, fileName);
  try {
    const raw = await fs.readFile(fullPath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'metric';
}

function parseMetricStatus(input: string): Priority {
  const normalized = input.toLowerCase();
  if (normalized.includes('off track') || normalized.includes('overdue') || normalized.includes('behind')) {
    return 'overdue';
  }
  if (normalized.includes('watch') || normalized.includes('soon') || normalized.includes('at risk')) {
    return 'dueSoon';
  }
  return 'onTrack';
}

function parseScorecardMarkdown(raw: string, fileDate: string): WeeklyMetricsPayload | null {
  const sectionKeys = {
    affluent: 'affluentIoCommissions',
    gamebuzz: 'gameBuzzFollowers',
    health: 'healthData',
  } as const;

  type SectionName = keyof typeof sectionKeys;
  const buckets: Record<SectionName, WeeklyMetric[]> = {
    affluent: [],
    gamebuzz: [],
    health: [],
  };

  let currentSection: SectionName | null = null;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#')) {
      const normalized = trimmed.toLowerCase();
      if (normalized.includes('affluent')) currentSection = 'affluent';
      else if (normalized.includes('gamebuzz')) currentSection = 'gamebuzz';
      else if (normalized.includes('health')) currentSection = 'health';
      continue;
    }

    if (!currentSection) continue;
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (!bullet) continue;

    const body = bullet[1];
    const separatorIndex = body.indexOf(':');
    if (separatorIndex <= 0) continue;

    const label = body.slice(0, separatorIndex).trim();
    let valueWithNotes = body.slice(separatorIndex + 1).trim();
    if (!label || !valueWithNotes) continue;

    let target = 'N/A';
    const targetMatch = valueWithNotes.match(/\btarget\b[:\s-]*([^()[\]|;]+)$/i);
    if (targetMatch) {
      target = targetMatch[1].trim();
      valueWithNotes = valueWithNotes.slice(0, targetMatch.index).trim();
    }

    const metric: WeeklyMetric = {
      id: `${currentSection}-${slugify(label)}-${buckets[currentSection].length + 1}`,
      label,
      value: valueWithNotes,
      target,
      trend: 'flat',
      status: parseMetricStatus(body),
    };
    buckets[currentSection].push(metric);
  }

  if (buckets.affluent.length === 0 && buckets.gamebuzz.length === 0 && buckets.health.length === 0) {
    return null;
  }

  const timestamp = Number.isNaN(new Date(`${fileDate}T00:00:00.000Z`).valueOf())
    ? new Date().toISOString()
    : new Date(`${fileDate}T00:00:00.000Z`).toISOString();

  return {
    weekLabel: `Week of ${fileDate}`,
    generatedAt: timestamp,
    affluentIoCommissions: buckets.affluent,
    gameBuzzFollowers: buckets.gamebuzz,
    healthData: buckets.health,
  };
}

async function readWeeklyScorecardMarkdownByName(fileName: string): Promise<WeeklyMetricsPayload | null> {
  if (!fileName.endsWith('.md')) return null;
  try {
    const raw = await fs.readFile(path.join(MC_DATA_DIR, fileName), 'utf8');
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    const fileDate = dateMatch?.[1] ?? new Date().toISOString().slice(0, 10);
    return parseScorecardMarkdown(raw, fileDate);
  } catch {
    return null;
  }
}

async function readLatestWeeklyScorecardMarkdown(): Promise<{ metrics: WeeklyMetricsPayload; fileName: string } | null> {
  try {
    const files = await fs.readdir(MC_DATA_DIR);
    const candidates = files
      .map((fileName) => {
        const match = fileName.match(/^weekly-scorecard-(\d{4}-\d{2}-\d{2})\.md$/);
        return match ? { fileName, date: match[1] } : null;
      })
      .filter((entry): entry is { fileName: string; date: string } => entry !== null)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (candidates.length === 0) return null;

    const latest = candidates[0];
    const raw = await fs.readFile(path.join(MC_DATA_DIR, latest.fileName), 'utf8');
    const metrics = parseScorecardMarkdown(raw, latest.date);
    if (!metrics) return null;

    return { metrics, fileName: latest.fileName };
  } catch {
    return null;
  }
}

function resolveDatabasePath(): string {
  const rawUrl = process.env.MISSION_CONTROL_DATABASE_URL ?? process.env.DATABASE_URL ?? 'file:./dev.db';
  const filePath = rawUrl.startsWith('file:') ? rawUrl.slice(5) : rawUrl;
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
}

function getCalendarConfig() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? process.env.MISSION_CONTROL_CALENDAR_ID;
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY ?? process.env.MISSION_CONTROL_GOOGLE_API_KEY;
  const accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN ?? process.env.MISSION_CONTROL_GOOGLE_ACCESS_TOKEN;
  return { calendarId, apiKey, accessToken };
}

function extractKeyOutcomes(description: string | undefined | null): string[] {
  if (!description) {
    return ['Confirm agenda and desired decision before call'];
  }

  const lines = description
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return ['Confirm agenda and desired decision before call'];
  }

  return lines.slice(0, 3);
}

type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  htmlLink?: string;
  description?: string;
  organizer?: { email?: string; displayName?: string };
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

async function fetchGoogleCalendarEvents(maxResults: number): Promise<{ items: GoogleCalendarEvent[]; live: boolean; note: string | null }> {
  const { calendarId, apiKey, accessToken } = getCalendarConfig();

  if (!calendarId || (!apiKey && !accessToken)) {
    return {
      items: [],
      live: false,
      note: 'Google Calendar not configured. Set GOOGLE_CALENDAR_ID and GOOGLE_CALENDAR_ACCESS_TOKEN (or GOOGLE_CALENDAR_API_KEY for public calendars).',
    };
  }

  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
  });

  if (apiKey) {
    params.set('key', apiKey);
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const response = await fetch(url, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Calendar API error (${response.status}): ${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as { items?: GoogleCalendarEvent[] };
  return {
    items: payload.items ?? [],
    live: true,
    note: null,
  };
}

export async function getUpcomingMeetings(limit = 5): Promise<{ meetings: MeetingBrief[]; live: boolean; note: string | null }> {
  const { items, live, note } = await fetchGoogleCalendarEvents(limit);

  const meetings: MeetingBrief[] = items.map((item) => {
    const attendees = (item.attendees ?? [])
      .filter((attendee) => attendee.email)
      .map((attendee) => ({
        name: attendee.displayName ?? attendee.email ?? 'Unknown attendee',
        email: attendee.email ?? '',
        responseStatus: attendee.responseStatus ?? 'needsAction',
      }));

    const organizer = item.organizer?.displayName ?? item.organizer?.email ?? 'Organizer not available';

    return {
      id: item.id,
      title: item.summary ?? 'Untitled meeting',
      startAt: item.start?.dateTime ?? item.start?.date ?? new Date().toISOString(),
      endAt: item.end?.dateTime ?? item.end?.date ?? new Date().toISOString(),
      attendees,
      emailContext: `Latest related email thread unavailable; organizer is ${organizer}.`,
      keyOutcomes: extractKeyOutcomes(item.description),
      meetingUrl: item.htmlLink ?? null,
    };
  });

  return { meetings, live, note };
}

export async function getActionItems(limit = 100): Promise<{ items: ActionItem[]; live: boolean; note: string | null }> {
  const dbPath = resolveDatabasePath();

  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    const targetTable = tables.find(({ name }) => {
      const table = name.toLowerCase();
      return table === 'tasks' || table === 'task' || table === 'action_items' || table === 'actionitems';
    });

    if (!targetTable) {
      return {
        items: [],
        live: false,
        note: 'No tasks table found in SQLite. Expected one of: tasks, task, action_items, actionitems.',
      };
    }

    const rows = db
      .prepare(`SELECT * FROM "${targetTable.name}" LIMIT ?`)
      .all(limit * 4) as Array<Record<string, unknown>>;

    const mapped = rows
      .map((row, index) => {
        const status = pickString(row, ['status', 'state']) ?? 'pending';
        const dueDate = parseDate(row.due_date ?? row.dueDate ?? row.deadline ?? row.target_date ?? null);

        return {
          id: pickString(row, ['id', 'task_id']) ?? `${targetTable.name}-${index}`,
          title: pickString(row, ['title', 'task', 'name', 'summary']) ?? 'Untitled action item',
          dueDate: dueDate?.toISOString() ?? null,
          status,
          source: pickString(row, ['source', 'origin']) ?? 'Mission Control',
          owner: pickString(row, ['owner', 'assignee', 'assigned_to']),
          url: pickString(row, ['url', 'link']),
          priority: priorityFromDueDate(dueDate, status),
        } satisfies ActionItem;
      })
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).valueOf() - new Date(b.dueDate).valueOf();
      })
      .slice(0, limit);

    return {
      items: mapped,
      live: true,
      note: null,
    };
  } catch (error) {
    return {
      items: [],
      live: false,
      note: error instanceof Error ? error.message : 'Unable to load action items from SQLite.',
    };
  } finally {
    db?.close();
  }
}

export async function getDigest(): Promise<{
  stalledEmails: DigestEmail[];
  pendingIntros: PendingIntro[];
  overdueTasks: ActionItem[];
  calendarConflicts: CalendarConflict[];
  notes: string[];
}> {
  const notes: string[] = [];

  const digestFile = await readJsonFile<{
    stalledEmails?: Array<Omit<DigestEmail, 'daysStalled' | 'priority'> & { daysStalled?: number }>;
    pendingIntros?: PendingIntro[];
  }>('gmail-digest.json');

  const stalledEmails: DigestEmail[] = [];
  for (const [index, email] of (digestFile?.stalledEmails ?? []).entries()) {
    const lastReply = parseDate(email.lastReplyAt) ?? new Date();
    const daysStalled = Math.floor((Date.now() - lastReply.valueOf()) / (1000 * 60 * 60 * 24));
    if (daysStalled <= 3) continue;

    stalledEmails.push({
      id: email.id ?? `stalled-${index}`,
      subject: email.subject,
      from: email.from,
      lastReplyAt: lastReply.toISOString(),
      daysStalled,
      priority: daysStalled > 7 ? 'overdue' : 'dueSoon',
      url: email.url,
    });
  }

  if (!digestFile) {
    notes.push('Gmail digest file not found. Using scaffolded empty digest data.');
  }

  const pendingIntros = (digestFile?.pendingIntros ?? []).map((intro, index) => ({
    ...intro,
    id: intro.id ?? `intro-${index}`,
    priority: intro.priority ?? 'dueSoon',
  }));

  const actionItemsResult = await getActionItems(100);
  if (!actionItemsResult.live && actionItemsResult.note) {
    notes.push(actionItemsResult.note);
  }

  const overdueTasks = actionItemsResult.items.filter((item) => item.priority === 'overdue').slice(0, 12);

  const calendarResult = await fetchGoogleCalendarEvents(20);
  if (!calendarResult.live && calendarResult.note) {
    notes.push(calendarResult.note);
  }

  const eventsForConflict = calendarResult.items
    .map((event) => {
      const start = parseDate(event.start?.dateTime ?? event.start?.date ?? null);
      const end = parseDate(event.end?.dateTime ?? event.end?.date ?? null);
      if (!start || !end) return null;
      return {
        id: event.id,
        title: event.summary ?? 'Untitled',
        start,
        end,
      };
    })
    .filter((event): event is { id: string; title: string; start: Date; end: Date } => event !== null)
    .sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const calendarConflicts: CalendarConflict[] = [];

  for (let i = 1; i < eventsForConflict.length; i += 1) {
    const previous = eventsForConflict[i - 1];
    const current = eventsForConflict[i];

    if (previous.end.valueOf() > current.start.valueOf()) {
      calendarConflicts.push({
        id: `${previous.id}-${current.id}`,
        startAt: current.start.toISOString(),
        endAt: previous.end > current.end ? previous.end.toISOString() : current.end.toISOString(),
        events: [previous.title, current.title],
        priority: 'overdue',
      });
    }
  }

  return {
    stalledEmails,
    pendingIntros,
    overdueTasks,
    calendarConflicts,
    notes,
  };
}

export async function getWeeklyMetrics(): Promise<{ metrics: WeeklyMetricsPayload; note: string | null }> {
  const fileName = process.env.WEEKLY_METRICS_FILE ?? 'weekly-metrics.json';
  const explicitMarkdown = await readWeeklyScorecardMarkdownByName(fileName);
  if (explicitMarkdown) {
    return { metrics: explicitMarkdown, note: `Loaded from mission-control/data/${fileName}.` };
  }

  const latestScorecard = await readLatestWeeklyScorecardMarkdown();
  if (latestScorecard) {
    return {
      metrics: latestScorecard.metrics,
      note: `Loaded from mission-control/data/${latestScorecard.fileName}.`,
    };
  }

  const metrics = await readJsonFile<WeeklyMetricsPayload>(fileName);

  if (!metrics) {
    const today = new Date();
    return {
      note: `Metrics file not found at mission-control/data/${fileName}. Returning scaffold values.`,
      metrics: {
        weekLabel: `Week of ${today.toISOString().slice(0, 10)}`,
        generatedAt: new Date().toISOString(),
        affluentIoCommissions: [
          { id: 'affluent-revenue', label: 'Commission Revenue', value: '$0', target: '$25,000', trend: 'flat', status: 'dueSoon' },
        ],
        gameBuzzFollowers: [
          { id: 'gamebuzz-total', label: 'Net Followers', value: '0', target: '+1,500', trend: 'flat', status: 'dueSoon' },
        ],
        healthData: [
          { id: 'health-steps', label: 'Average Daily Steps', value: '0', target: '10,000', trend: 'flat', status: 'dueSoon' },
        ],
      },
    };
  }

  return { metrics, note: null };
}
