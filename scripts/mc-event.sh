#!/bin/bash
# mc-event.sh — Push an event to Mission Control's Live Feed
# Usage: mc-event.sh <type> <message> [task_id] [agent_id] [metadata_json]
#
# Examples:
#   mc-event.sh system "Sub-agent started: WP SEO Optimizer"
#   mc-event.sh task_status_changed "Post 36956 optimized" seo-wp-batch-2026-02-28
#   mc-event.sh agent_status_changed "Processing batch 1/7" "" agent-id '{"batch":1}'

TYPE="${1:?Usage: mc-event.sh <type> <message> [task_id] [agent_id] [metadata_json]}"
MESSAGE="${2:?Message required}"
TASK_ID="${3:-}"
AGENT_ID="${4:-}"
METADATA="${5:-}"

MC_URL="${MC_URL:-http://localhost:3001}"

PAYLOAD=$(jq -n \
  --arg type "$TYPE" \
  --arg message "$MESSAGE" \
  --arg task_id "$TASK_ID" \
  --arg agent_id "$AGENT_ID" \
  --argjson metadata "${METADATA:-null}" \
  '{type: $type, message: $message} +
   (if $task_id != "" then {task_id: $task_id} else {} end) +
   (if $agent_id != "" then {agent_id: $agent_id} else {} end) +
   (if $metadata != null then {metadata: $metadata} else {} end)')

curl -sf -X POST "${MC_URL}/api/events" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" > /dev/null 2>&1

echo "✅ Event pushed: ${TYPE} — ${MESSAGE}"
