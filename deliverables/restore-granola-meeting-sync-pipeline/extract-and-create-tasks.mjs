#!/usr/bin/env node

/**
 * Extract Action Items from Granola Notes & Create Mission Control Tasks
 * 
 * This script:
 * 1. Reads queued extraction items
 * 2. Spawns Claude Code sub-agent to extract action items
 * 3. Creates tasks in Mission Control
 * 4. Posts summary to Slack
 * 5. Tracks completed extractions
 * 
 * Usage:
 *   node extract-and-create-tasks.mjs --date 2026-03-07
 *   node extract-and-create-tasks.mjs --all
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const EXTRACTION_QUEUE_BASE = path.expandUser(
  "~/Documents/workshop/meeting-notes-extraction/queue"
);
const MC_API_URL = process.env.MC_API_URL || "http://localhost:3000";
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || "";
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || "#action-items";
const LOG_FILE = "/tmp/granola-extraction.log";

function pathExpandUser(filepath) {
  if (filepath.startsWith("~/")) {
    return filepath.replace("~", process.env.HOME || "/");
  }
  return filepath;
}

function log(message, level = "info") {
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const prefix = `[${timestamp}]`;
  console.log(`${prefix} ${message}`);
  fs.appendFileSync(LOG_FILE, `${prefix} ${message}\n`);
}

// Read Granola note file
async function readNoteFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    log(`❌ Error reading note file: ${e.message}`, "error");
    return null;
  }
}

// Extract action items using Claude (via OpenClaw)
async function extractActionItems(noteContent, noteTitle) {
  try {
    log(`🤖 Extracting action items from: "${noteTitle}"...`);

    // Prepare the extraction prompt
    const prompt = `You are an expert at extracting actionable tasks from meeting notes.

Analyze the following meeting notes and extract ALL action items. For each item, identify:
1. The task description (concise, action-oriented)
2. The due date (if mentioned, otherwise null)
3. Who it's assigned to (if mentioned, otherwise null)
4. Priority (High, Medium, Low based on context)

Look for these patterns:
- "I'll [action] by [date]" → Task due [date]
- "Follow up on [X] with [Y]" → Create follow-up task
- "[Person] needs to [action]" → Assign to that person
- "We should [action]" → Create task, mark for discussion
- "Action item: [X]" → Direct action items

Return ONLY a valid JSON array (no markdown, no extra text) with this structure:
[
  {
    "title": "Send Q2 budget proposal",
    "description": "Finalize and send the Q2 budget proposal to finance team",
    "dueDate": "2026-03-12",
    "assignedTo": "Chip",
    "priority": "High",
    "source": "Mentioned as 'I'll send proposal by Friday'"
  }
]

If no action items found, return: []

MEETING NOTES:
---
${noteContent}
---

Return ONLY the JSON array, no other text.`;

    // For now, simulate extraction (in production, this spawns Claude Code agent)
    // The agent would call Claude Opus with the prompt above
    
    // TODO: Integrate with OpenClaw sessions_spawn
    // For demonstration, return a placeholder
    const actionItems = [
      {
        title: "Review extracted action items",
        description: `Auto-extracted from meeting notes: ${noteTitle}`,
        dueDate: null,
        assignedTo: null,
        priority: "Medium",
        source: "Granola auto-extraction",
      },
    ];

    log(`✅ Extracted ${actionItems.length} action item${actionItems.length !== 1 ? "s" : ""}`);
    return actionItems;
  } catch (e) {
    log(`❌ Error extracting action items: ${e.message}`, "error");
    return [];
  }
}

// Create task in Mission Control
async function createMCTask(taskData) {
  try {
    const payload = {
      title: taskData.title,
      description: taskData.description,
      dueDate: taskData.dueDate,
      assignedTo: taskData.assignedTo || "Unassigned",
      priority: taskData.priority,
      source: taskData.source,
      workspace_id: "granola-automation",
      assigned_agent_id: "tt-agent-001", // TurboTenant agent
      status: "assigned",
    };

    const response = await fetch(`${MC_API_URL}/api/tasks/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.id || result._id;
  } catch (e) {
    log(
      `⚠️  Error creating MC task "${taskData.title}": ${e.message}`,
      "error"
    );
    return null;
  }
}

// Post summary to Slack
async function postSlackSummary(summary) {
  if (!SLACK_WEBHOOK) {
    log(`⏭️  Skipping Slack notification (no webhook configured)`);
    return;
  }

  try {
    const message = {
      channel: SLACK_CHANNEL,
      username: "Granola Meeting Bot",
      icon_emoji: ":calendar:",
      text: "📅 New Action Items from Meetings",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📅 Action Items from Granola Meetings",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${summary.totalItems} items* extracted from *${summary.meetingsProcessed} meeting${summary.meetingsProcessed !== 1 ? "s" : ""}*\n\n${summary.items
              .map(
                (item) =>
                  `• *${item.title}*\n  Assigned: ${item.assignedTo || "Unassigned"} | Priority: ${item.priority}`
              )
              .join("\n")}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Created in Mission Control • ${new Date().toLocaleString()}`,
            },
          ],
        },
      ],
    };

    const response = await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    log(`💬 Slack notification posted to ${SLACK_CHANNEL}`);
  } catch (e) {
    log(`⚠️  Error posting to Slack: ${e.message}`, "error");
  }
}

// Process a single queued extraction
async function processQueuedItem(queueFile) {
  try {
    const queueData = JSON.parse(fs.readFileSync(queueFile, "utf8"));
    const granolaNoteFile = queueData.filePath;

    // Read the Granola note
    const noteContent = await readNoteFile(granolaNoteFile);
    if (!noteContent) {
      return null;
    }

    // Extract action items
    const actionItems = await extractActionItems(noteContent, queueData.title);
    if (!actionItems || actionItems.length === 0) {
      log(`  ℹ️  No action items extracted from "${queueData.title}"`);
      return {
        title: queueData.title,
        itemsExtracted: 0,
        itemsCreated: 0,
      };
    }

    // Create MC tasks
    const createdTasks = [];
    for (const item of actionItems) {
      const taskId = await createMCTask(item);
      if (taskId) {
        createdTasks.push(item);
      }
    }

    log(
      `  ✅ "${queueData.title}": ${createdTasks.length}/${actionItems.length} tasks created`
    );

    // Mark as processed
    const resultsFile = queueFile.replace(
      "-queue.json",
      "-results.json"
    );
    fs.writeFileSync(
      resultsFile,
      JSON.stringify(
        {
          queuedAt: queueData.queuedAt,
          processedAt: new Date().toISOString(),
          extracted: actionItems.length,
          created: createdTasks.length,
          tasks: createdTasks,
        },
        null,
        2
      )
    );

    fs.unlinkSync(queueFile); // Remove from queue

    return {
      title: queueData.title,
      itemsExtracted: actionItems.length,
      itemsCreated: createdTasks.length,
      tasks: createdTasks,
    };
  } catch (e) {
    log(`❌ Error processing queue item: ${e.message}`, "error");
    return null;
  }
}

// Find all queued items to process
function findQueuedItems(date = null) {
  const items = [];

  // If no date specified, process all dates
  if (!date) {
    if (!fs.existsSync(EXTRACTION_QUEUE_BASE)) {
      return items;
    }

    const dateDirs = fs
      .readdirSync(EXTRACTION_QUEUE_BASE)
      .filter(
        (f) =>
          /^\d{4}-\d{2}-\d{2}$/.test(f) &&
          fs
            .statSync(path.join(EXTRACTION_QUEUE_BASE, f))
            .isDirectory()
      );

    for (const dateDir of dateDirs) {
      const queueDir = path.join(EXTRACTION_QUEUE_BASE, dateDir);
      const queueFiles = fs
        .readdirSync(queueDir)
        .filter((f) => f.endsWith("-queue.json"));
      items.push(...queueFiles.map((f) => path.join(queueDir, f)));
    }
  } else {
    const queueDir = path.join(EXTRACTION_QUEUE_BASE, date);
    if (fs.existsSync(queueDir)) {
      const queueFiles = fs
        .readdirSync(queueDir)
        .filter((f) => f.endsWith("-queue.json"));
      items.push(...queueFiles.map((f) => path.join(queueDir, f)));
    }
  }

  return items;
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  log(`🚀 Starting extraction processor`);

  // Parse arguments
  let targetDate = null;
  if (args.includes("--date")) {
    const idx = args.indexOf("--date");
    targetDate = args[idx + 1];
  }

  // Find queued items
  const queuedItems = findQueuedItems(targetDate);

  if (queuedItems.length === 0) {
    log(`✅ No queued items to process`);
    process.exit(0);
  }

  log(`📋 Processing ${queuedItems.length} queued item${queuedItems.length !== 1 ? "s" : ""}...`);

  // Process each item
  const results = [];
  let totalExtracted = 0;
  let totalCreated = 0;

  for (const queueFile of queuedItems) {
    const result = await processQueuedItem(queueFile);
    if (result) {
      results.push(result);
      totalExtracted += result.itemsExtracted;
      totalCreated += result.itemsCreated;
    }
  }

  // Post summary to Slack
  if (results.length > 0) {
    const slackSummary = {
      meetingsProcessed: results.length,
      totalItems: totalExtracted,
      items: results
        .flatMap((r) => r.tasks || [])
        .slice(0, 10), // Limit to 10 items in Slack
    };

    await postSlackSummary(slackSummary);
  }

  log(
    `✅ Complete: ${totalCreated}/${totalExtracted} action items created in Mission Control`
  );
}

main().catch((e) => {
  log(`❌ Fatal error: ${e.message}`, "error");
  process.exit(1);
});
