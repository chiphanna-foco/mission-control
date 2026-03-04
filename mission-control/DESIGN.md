# Mission Control - Executive Dashboard Design

## Goal
Ship a testable MVP for Chip's life dashboard under Mission Control with clear operational visibility across digest, meetings, action items, and weekly metrics.

## Information Architecture
- Route: `/mission-control`
- Mission Control page remains a thin route wrapper (`src/app/mission-control/page.tsx`) and renders `MissionControlClient`.
- Tab shell (implemented in `MissionControlClient`):
  - `Mission Control` (placeholder, disabled)
  - `Executive Dashboard` (active MVP tab)
- Executive Dashboard UI is now isolated in `src/components/mission-control/ExecutiveDashboardTab.tsx`.
- Four dashboard sections:
  - DIGEST (stalled emails, pending intros, overdue tasks, calendar conflicts)
  - UPCOMING MEETINGS (next 3 meetings + attendees + brief CTA)
  - ACTION ITEMS (open tasks sorted by urgency and due date + quick actions)
  - METRICS (weekly scorecard visual cards)

## API Contract
Implemented endpoints:
- `/api/executive-digest`
- `/api/upcoming-meetings`
- `/api/action-items`
- `/api/weekly-metrics`

All endpoints include:
- `generatedAt`
- `cache` metadata (`ttlSeconds`, `cached`, `expiresAt`)
- query flag `?refresh=1` to bypass cache
- structured errors (`error`, `details`)

## Cache Strategy
- In-memory server TTL cache (`src/lib/ttlCache.ts`)
- TTL: 5 minutes (300 seconds)
- Cache keys are per-endpoint payload
- Manual invalidation is achieved by requesting `?refresh=1`

## Data Source Decisions
- Gmail (Digest):
  - MVP scaffold reads `mission-control/data/gmail-digest.json`
  - Filters stalled emails to `>3 days`
  - Pending intros sourced from the same digest file
- Google Calendar (Upcoming + conflicts in Digest):
  - Live integration via Google Calendar API
  - Supports:
    - `GOOGLE_CALENDAR_ID` + `GOOGLE_CALENDAR_ACCESS_TOKEN` for private calendars
    - or `GOOGLE_CALENDAR_ID` + `GOOGLE_CALENDAR_API_KEY` for public calendars
  - If missing config, API returns note + safe empty list
- Mission Control SQLite (Action Items):
  - Reads from `MISSION_CONTROL_DATABASE_URL` fallback to `DATABASE_URL`
  - Detects task table by common names: `tasks`, `task`, `action_items`, `actionitems`
  - If no task table exists, returns empty list + note
- Weekly metrics:
  - Prefers latest `mission-control/data/weekly-scorecard-YYYY-MM-DD.md` if present
  - Supports explicit markdown override via `WEEKLY_METRICS_FILE=<file>.md`
  - Falls back to `mission-control/data/weekly-metrics.json`

## UI Decisions
- Card-based layout with responsive 2-column grid on desktop
- Priority color system:
  - Red: overdue/off-track
  - Yellow: due soon/watch
  - Green: on track
- Refresh controls:
  - Global `Refresh All`
  - Section-level `Refresh`
- Actionability:
  - Inline action buttons (`Reply`, `Draft Intro`, `Resolve`, `Generate brief`, `Complete`, `Reschedule`, `View details`)
- UX resilience:
  - Per-section loading indicators
  - Per-section error messages
  - Data-source notes surfaced inline for missing integrations
  - Mock fallback data for digest + upcoming meetings so tab stays useful during early integration

## Why This Structure
- Keeping fetch/state orchestration in `MissionControlClient` preserves the existing API flow and refresh controls.
- Moving rendering into `ExecutiveDashboardTab` makes the new dashboard easier to iterate on without touching routing logic.
- Adding markdown scorecard support aligns with the desired weekly-scorecard workflow while retaining JSON compatibility for existing data.

## Known Gaps (MVP intentional)
- Gmail live OAuth integration not yet wired
- Email context for meeting prep is scaffolded text
- Action buttons are non-mutating placeholders
- Task table mapping is schema-agnostic heuristic; can be tightened once MC schema is finalized

## Testing Readiness
- UI and endpoints are ready for local testing
- Configure env vars for live calendar data
- If SQLite lacks task tables, ACTION ITEMS and related DIGEST overdue tasks intentionally show empty with diagnostics
