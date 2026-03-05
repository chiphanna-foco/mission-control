import { useState } from 'react';
import type {
  ActionItem,
  CalendarConflict,
  DigestEmail,
  MeetingBrief,
  PendingIntro,
  Priority,
  WeeklyMetricsPayload,
} from '@/lib/executive-data';
import { AttendeeProfileCard } from './AttendeeProfileCard';

type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  note: string | null;
  lastUpdated: string | null;
};

type DigestResponse = {
  stalledEmails: DigestEmail[];
  pendingIntros: PendingIntro[];
  overdueTasks: ActionItem[];
  calendarConflicts: CalendarConflict[];
  notes?: string[];
};

type UpcomingResponse = {
  meetings: MeetingBrief[];
  live: boolean;
  note: string | null;
};

type ActionItemsResponse = {
  items: ActionItem[];
  live: boolean;
  note: string | null;
};

type MetricsResponse = {
  metrics: WeeklyMetricsPayload;
  note: string | null;
};

type ExecutiveDashboardTabProps = {
  digest: ApiState<DigestResponse>;
  upcoming: ApiState<UpcomingResponse>;
  actionItems: ApiState<ActionItemsResponse>;
  metrics: ApiState<MetricsResponse>;
  onRefreshDigest: () => void;
  onRefreshUpcoming: () => void;
  onRefreshActionItems: () => void;
  onRefreshMetrics: () => void;
};

const mockDigest: DigestResponse = {
  stalledEmails: [
    { id: 'mock-email-1', subject: 'Partnership term sheet follow-up', from: 'Sarah Kim', lastReplyAt: new Date().toISOString(), daysStalled: 9, priority: 'overdue' },
    { id: 'mock-email-2', subject: 'Q2 campaign creative approvals', from: 'Growth Team', lastReplyAt: new Date().toISOString(), daysStalled: 6, priority: 'dueSoon' },
    { id: 'mock-email-3', subject: 'Board prep data request', from: 'Finance Ops', lastReplyAt: new Date().toISOString(), daysStalled: 4, priority: 'dueSoon' },
  ],
  pendingIntros: [
    { id: 'mock-intro-1', requester: 'Maya Patel', introducee: 'Devon Ortiz', requestedAt: new Date().toISOString(), status: 'Needs draft', priority: 'dueSoon' },
    { id: 'mock-intro-2', requester: 'Chris Lee', introducee: 'Olivia Reed', requestedAt: new Date().toISOString(), status: 'Waiting on context', priority: 'onTrack' },
  ],
  overdueTasks: [
    { id: 'mock-overdue-1', title: 'Finalize partner rev-share update', dueDate: new Date(Date.now() - 86_400_000).toISOString(), status: 'open', source: 'Mission Control', owner: 'Chip', url: null, priority: 'overdue' },
  ],
  calendarConflicts: [],
};

const mockUpcomingMeetings: MeetingBrief[] = [
  {
    id: 'mock-meeting-1',
    title: 'Affluent growth sync',
    startAt: new Date(Date.now() + 3_600_000).toISOString(),
    endAt: new Date(Date.now() + 5_400_000).toISOString(),
    attendees: [
      { name: 'Taylor Stone', email: 'taylor@example.com', responseStatus: 'accepted' },
      { name: 'Rina Park', email: 'rina@example.com', responseStatus: 'tentative' },
    ],
    emailContext: 'Need alignment on conversion bottlenecks and creative pipeline.',
    keyOutcomes: ['Decide weekly target', 'Assign owners'],
    meetingUrl: null,
  },
  {
    id: 'mock-meeting-2',
    title: 'GameBuzz creator ops review',
    startAt: new Date(Date.now() + 7_200_000).toISOString(),
    endAt: new Date(Date.now() + 9_000_000).toISOString(),
    attendees: [
      { name: 'Alex Chen', email: 'alex@example.com', responseStatus: 'accepted' },
    ],
    emailContext: 'Review creator onboarding throughput and response SLAs.',
    keyOutcomes: ['Confirm onboarding checklist'],
    meetingUrl: null,
  },
  {
    id: 'mock-meeting-3',
    title: 'Weekly operating review',
    startAt: new Date(Date.now() + 10_800_000).toISOString(),
    endAt: new Date(Date.now() + 12_600_000).toISOString(),
    attendees: [
      { name: 'Executive Assistant', email: 'ea@example.com', responseStatus: 'accepted' },
      { name: 'Jordan Bell', email: 'jordan@example.com', responseStatus: 'accepted' },
    ],
    emailContext: 'Status review of priorities and risk register.',
    keyOutcomes: ['Escalate blockers', 'Confirm next-week focus'],
    meetingUrl: null,
  },
];

function priorityBadge(priority: Priority) {
  switch (priority) {
    case 'overdue':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'dueSoon':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'onTrack':
    default:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
}

function priorityCard(priority: Priority) {
  switch (priority) {
    case 'overdue':
      return 'border-red-200 bg-red-50';
    case 'dueSoon':
      return 'border-amber-200 bg-amber-50';
    case 'onTrack':
    default:
      return 'border-emerald-200 bg-emerald-50';
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function actionSortValue(item: ActionItem) {
  if (item.priority === 'overdue') return 0;
  if (item.priority === 'dueSoon') return 1;
  return 2;
}

export default function ExecutiveDashboardTab({
  digest,
  upcoming,
  actionItems,
  metrics,
  onRefreshDigest,
  onRefreshUpcoming,
  onRefreshActionItems,
  onRefreshMetrics,
}: ExecutiveDashboardTabProps) {
  const [selectedAttendee, setSelectedAttendee] = useState<{ name: string; email: string } | null>(null);
  const digestData = digest.data ?? mockDigest;

  const activeActionItems = (actionItems.data?.items ?? [])
    .filter((item) => !item.status.toLowerCase().includes('done'))
    .sort((a, b) => {
      const priorityDiff = actionSortValue(a) - actionSortValue(b);
      if (priorityDiff !== 0) return priorityDiff;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).valueOf() - new Date(b.dueDate).valueOf();
    });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="rounded-2xl bg-white border border-stone-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black">DIGEST</h2>
          <button
            onClick={onRefreshDigest}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-500"
          >
            Refresh
          </button>
        </div>

        {digest.loading ? <p className="text-sm text-stone-500">Loading digest...</p> : null}
        {digest.error ? <p className="text-sm text-red-600">{digest.error}</p> : null}
        {digest.note ? <p className="text-xs text-amber-700 mb-3">{digest.note}</p> : null}

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-bold mb-2">Stalled Emails</p>
            <div className="space-y-2">
              {digestData.stalledEmails.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-red-900">{item.subject}</p>
                    <p className="text-xs text-red-700">{item.from} • {item.daysStalled} days stalled</p>
                  </div>
                  <button className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-100">Reply</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-bold mb-2">Pending Intros</p>
            <div className="space-y-2">
              {digestData.pendingIntros.slice(0, 3).map((item) => (
                <div key={item.id} className={`rounded-xl border p-3 flex items-start justify-between gap-3 ${priorityCard(item.priority)}`}>
                  <div>
                    <p className="font-semibold">{item.requester} to {item.introducee}</p>
                    <p className="text-xs text-stone-600">Requested {formatDateTime(item.requestedAt)} • {item.status}</p>
                  </div>
                  <button className="text-xs px-2 py-1 rounded-md border border-stone-300 hover:bg-stone-100">Draft Intro</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-bold mb-2">Overdue Tasks</p>
            {digestData.overdueTasks.length === 0 ? <p className="text-stone-500">No overdue tasks detected.</p> : null}
            <div className="space-y-2">
              {digestData.overdueTasks.map((item) => (
                <div key={item.id} className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-red-900">{item.title}</p>
                    <p className="text-xs text-red-700">Due {formatDateTime(item.dueDate)}</p>
                  </div>
                  <button className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-100">Resolve</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-bold mb-2">Calendar Conflicts</p>
            {digestData.calendarConflicts.length === 0 ? <p className="text-stone-500">No conflicts found.</p> : null}
            <div className="space-y-2">
              {digestData.calendarConflicts.map((item) => (
                <div key={item.id} className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-red-900">{item.events.join(' overlaps ')}</p>
                    <p className="text-xs text-red-700">{formatDateTime(item.startAt)} to {formatDateTime(item.endAt)}</p>
                  </div>
                  <button className="text-xs px-2 py-1 rounded-md border border-red-300 text-red-700 hover:bg-red-100">Reschedule</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-stone-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black">UPCOMING MEETINGS - WORK</h2>
          <button
            onClick={onRefreshUpcoming}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-500"
          >
            Refresh
          </button>
        </div>

        {upcoming.loading ? <p className="text-sm text-stone-500">Loading upcoming meetings...</p> : null}
        {upcoming.error ? <p className="text-sm text-red-600">{upcoming.error}</p> : null}
        {upcoming.note ? <p className="text-xs text-amber-700 mb-3">{upcoming.note}</p> : null}

        <div className="space-y-3">
          {((upcoming.data as any)?.workMeetings || []).slice(0, 3).map((meeting: any) => (
            <div key={meeting.id} className="rounded-xl border border-blue-200 bg-blue-50 p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-blue-900 truncate">{meeting.title}</p>
                  <p className="text-xs text-blue-700 truncate">{formatDateTime(meeting.startAt)} - {formatDateTime(meeting.endAt)}</p>
                </div>
                <button className="text-xs px-2 py-1 rounded-md border border-blue-300 bg-white hover:bg-blue-100 flex-shrink-0">Brief</button>
              </div>
              <p className="text-xs text-blue-800 mt-2 line-clamp-2">{meeting.emailContext}</p>
              <div className="text-xs font-semibold mt-2 text-blue-900 relative">
                <p className="mb-1">Attendees:</p>
                <div className="flex flex-wrap gap-1">
                  {(meeting.attendees || []).slice(0, 4).map((a: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAttendee({ name: a.name, email: a.email })}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-900 px-2 py-1 rounded truncate cursor-pointer"
                      title={a.email}
                    >
                      {a.name}
                    </button>
                  ))}
                  {meeting.attendees?.length > 4 && (
                    <span className="text-xs bg-blue-100 text-blue-900 px-2 py-1 rounded">
                      +{meeting.attendees.length - 4}
                    </span>
                  )}
                </div>
                {selectedAttendee && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <AttendeeProfileCard
                      attendee={selectedAttendee}
                      onClose={() => setSelectedAttendee(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!upcoming.data || (upcoming.data as any)?.workMeetings?.length === 0) && !upcoming.loading && (
            <p className="text-sm text-stone-500">No upcoming work meetings.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-stone-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black">UPCOMING MEETINGS - PERSONAL</h2>
          <button
            onClick={onRefreshUpcoming}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-500"
          >
            Refresh
          </button>
        </div>

        <div className="space-y-3">
          {((upcoming.data as any)?.personalMeetings || []).slice(0, 3).map((meeting: any) => (
            <div key={meeting.id} className="rounded-xl border border-stone-200 p-4 hover:border-stone-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{meeting.title}</p>
                  <p className="text-xs text-stone-600 truncate">{formatDateTime(meeting.startAt)} - {formatDateTime(meeting.endAt)}</p>
                </div>
                <button className="text-xs px-2 py-1 rounded-md border border-stone-300 hover:bg-stone-100 flex-shrink-0">Brief</button>
              </div>
              <p className="text-xs text-stone-700 mt-2 line-clamp-2">{meeting.emailContext}</p>
              <div className="text-xs font-semibold mt-2 relative">
                <p className="mb-1">Attendees:</p>
                <div className="flex flex-wrap gap-1">
                  {(meeting.attendees || []).slice(0, 4).map((a: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAttendee({ name: a.name, email: a.email })}
                      className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-900 px-2 py-1 rounded truncate cursor-pointer"
                      title={a.email}
                    >
                      {a.name}
                    </button>
                  ))}
                  {meeting.attendees?.length > 4 && (
                    <span className="text-xs bg-stone-100 text-stone-900 px-2 py-1 rounded">
                      +{meeting.attendees.length - 4}
                    </span>
                  )}
                </div>
                {selectedAttendee && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <AttendeeProfileCard
                      attendee={selectedAttendee}
                      onClose={() => setSelectedAttendee(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          {(!upcoming.data || (upcoming.data as any)?.personalMeetings?.length === 0) && !upcoming.loading && (
            <p className="text-sm text-stone-500">No upcoming personal meetings.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-stone-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black">ACTION ITEMS</h2>
          <button
            onClick={onRefreshActionItems}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-500"
          >
            Refresh
          </button>
        </div>

        {actionItems.loading ? <p className="text-sm text-stone-500">Loading action items...</p> : null}
        {actionItems.error ? <p className="text-sm text-red-600">{actionItems.error}</p> : null}
        {actionItems.note ? <p className="text-xs text-amber-700 mb-3">{actionItems.note}</p> : null}

        <div className="space-y-2">
          {activeActionItems.length ? activeActionItems.map((item) => (
            <div key={item.id} className={`rounded-xl border p-3 ${priorityCard(item.priority)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-stone-600">{item.source} • Due {formatDateTime(item.dueDate)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${priorityBadge(item.priority)}`}>
                  {item.priority === 'overdue' ? 'Overdue' : item.priority === 'dueSoon' ? 'Due Soon' : 'On Track'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="text-xs px-2 py-1 rounded-md border border-stone-300 hover:bg-stone-100">Complete</button>
                <button className="text-xs px-2 py-1 rounded-md border border-stone-300 hover:bg-stone-100">Reschedule</button>
                <button className="text-xs px-2 py-1 rounded-md border border-stone-300 hover:bg-stone-100">View details</button>
              </div>
            </div>
          )) : <p className="text-sm text-stone-500">No open action items found.</p>}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-stone-200 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black">METRICS</h2>
          <button
            onClick={onRefreshMetrics}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 hover:border-stone-500"
          >
            Refresh
          </button>
        </div>

        {metrics.loading ? <p className="text-sm text-stone-500">Loading weekly scorecard...</p> : null}
        {metrics.error ? <p className="text-sm text-red-600">{metrics.error}</p> : null}
        {metrics.note ? <p className="text-xs text-amber-700 mb-3">{metrics.note}</p> : null}

        {metrics.data?.metrics ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-600 font-semibold">{metrics.data.metrics.weekLabel}</p>
            {[
              { title: 'Affluent commissions', items: metrics.data.metrics.affluentIoCommissions },
              { title: 'GameBuzz followers', items: metrics.data.metrics.gameBuzzFollowers },
              { title: 'Health metrics', items: metrics.data.metrics.healthData },
            ].map((group) => (
              <div key={group.title}>
                <p className="text-sm font-bold mb-2">{group.title}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.items.map((metric) => (
                    <div key={metric.id} className={`rounded-xl border p-3 ${priorityCard(metric.status)}`}>
                      <p className="text-xs text-stone-600">{metric.label}</p>
                      <p className="text-2xl font-black mt-1">{metric.value}</p>
                      <p className="text-xs text-stone-600 mt-1">Target {metric.target}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
