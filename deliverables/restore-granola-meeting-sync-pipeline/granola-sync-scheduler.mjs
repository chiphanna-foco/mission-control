#!/usr/bin/env node

/**
 * Granola Meeting Sync Scheduler
 * Runs every 30 minutes during work hours (9 AM - 6 PM MT)
 * Detects new/updated Granola notes and queues them for extraction
 * 
 * Usage:
 *   node granola-sync-scheduler.mjs --once  # Run once and exit (for cron)
 *   node granola-sync-scheduler.mjs         # Run as daemon
 */

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const GRANOLA_NOTES_DIR = path.expandUser(
  "~/Documents/claude/skills/clawd/granola-notes"
);
const EXTRACTION_QUEUE_BASE = path.expandUser(
  "~/Documents/workshop/meeting-notes-extraction/queue"
);
const SYNC_HISTORY_FILE = path.expandUser("~/.granola-sync-history.json");
const LOG_FILE = "/tmp/granola-sync-scheduler.log";
const ERROR_LOG = "/tmp/granola-sync-errors.log";

// Expand user paths like shell does
function pathExpandUser(filepath) {
  if (filepath.startsWith("~/")) {
    return filepath.replace("~", process.env.HOME || "/");
  }
  return filepath;
}

// Logging helper
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
  const line = `${prefix} ${message}`;

  console.log(line);

  // Always log to main log
  fs.appendFileSync(LOG_FILE, line + "\n");

  // Also log errors to error log
  if (level === "error") {
    fs.appendFileSync(ERROR_LOG, line + "\n");
  }
}

// Check if we're in work hours (9 AM - 6 PM MT, Mon-Fri)
function isWorkHours() {
  const now = new Date();
  const mtTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Denver" })
  );

  const hour = mtTime.getHours();
  const dayOfWeek = mtTime.getDay();

  // 9 AM = 9, 6 PM = 18
  const inWorkHours = hour >= 9 && hour < 18;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri

  return inWorkHours && isWeekday;
}

// Load sync history
function loadSyncHistory() {
  if (!fs.existsSync(SYNC_HISTORY_FILE)) {
    return {
      lastSyncTime: null,
      processedNotes: {}, // { noteId: lastModified }
    };
  }
  try {
    return JSON.parse(fs.readFileSync(SYNC_HISTORY_FILE, "utf8"));
  } catch (e) {
    log(`⚠️  Error loading sync history: ${e.message}`, "error");
    return { lastSyncTime: null, processedNotes: {} };
  }
}

// Save sync history
function saveSyncHistory(history) {
  fs.writeFileSync(SYNC_HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Extract metadata from Granola markdown file
function extractMetadata(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const metadata = {
      path: filePath,
      filename: path.basename(filePath),
      title: "",
      date: "",
      attendees: [],
      hasActionItems: false,
    };

    // Parse markdown headers
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];

      if (line.startsWith("# ")) {
        metadata.title = line.replace(/^# /, "").trim();
      }

      if (line.startsWith("**Date:**")) {
        metadata.date = line.replace(/^\*\*Date:\*\*\s*/, "").trim();
      }

      if (line.startsWith("**Attendees:**")) {
        const attendeeStr = line
          .replace(/^\*\*Attendees:\*\*\s*/, "")
          .trim();
        metadata.attendees = attendeeStr
          .split(",")
          .map((a) => a.trim())
          .filter((a) => a);
      }

      // Check for action items patterns
      if (
        line.includes("Action item:") ||
        line.includes("I'll ") ||
        line.includes("to do") ||
        line.includes("needs to")
      ) {
        metadata.hasActionItems = true;
      }
    }

    return metadata;
  } catch (e) {
    log(
      `⚠️  Error extracting metadata from ${path.basename(filePath)}: ${e.message}`,
      "error"
    );
    return null;
  }
}

// Find new/updated Granola notes
async function findNewNotes(history) {
  if (!fs.existsSync(GRANOLA_NOTES_DIR)) {
    log(`⚠️  Granola notes directory not found: ${GRANOLA_NOTES_DIR}`, "error");
    return [];
  }

  try {
    const files = fs
      .readdirSync(GRANOLA_NOTES_DIR)
      .filter((f) => f.endsWith(".md") && !f.startsWith("."));

    const newNotes = [];

    for (const file of files) {
      const filePath = path.join(GRANOLA_NOTES_DIR, file);
      const stats = fs.statSync(filePath);
      const noteId = file; // Use filename as unique ID
      const lastModified = stats.mtimeMs.toString();

      // Check if this is new or updated
      if (
        !history.processedNotes[noteId] ||
        history.processedNotes[noteId] !== lastModified
      ) {
        const metadata = extractMetadata(filePath);
        if (metadata && metadata.hasActionItems) {
          newNotes.push({
            id: noteId,
            ...metadata,
            lastModified,
          });
        }
      }
    }

    return newNotes;
  } catch (e) {
    log(`❌ Error scanning Granola notes: ${e.message}`, "error");
    return [];
  }
}

// Queue notes for extraction
async function queueNotesForExtraction(notes) {
  const today = new Date()
    .toLocaleDateString("en-CA")
    .replace(/\//g, "-");
  const queueDir = path.join(EXTRACTION_QUEUE_BASE, today);

  // Create queue directory if it doesn't exist
  try {
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
  } catch (e) {
    log(`❌ Error creating queue directory: ${e.message}`, "error");
    return 0;
  }

  let queued = 0;

  for (const note of notes) {
    try {
      const queueItem = {
        id: note.id,
        title: note.title,
        date: note.date,
        attendees: note.attendees,
        filePath: note.path,
        filename: note.filename,
        queuedAt: new Date().toISOString(),
      };

      const queueFile = path.join(
        queueDir,
        `${note.id.replace(/\.[^.]+$/, "")}-queue.json`
      );

      fs.writeFileSync(queueFile, JSON.stringify(queueItem, null, 2));
      log(`  ✅ Queued: "${note.title}"`);
      queued++;
    } catch (e) {
      log(
        `  ❌ Error queueing note "${note.title}": ${e.message}`,
        "error"
      );
    }
  }

  return queued;
}

// Trigger extraction via OpenClaw sub-agent
async function triggerExtraction(notesCount) {
  if (notesCount === 0) {
    log(`📝 No new notes to process`);
    return 0;
  }

  try {
    log(
      `🔄 Spawning extraction agent for ${notesCount} note${notesCount > 1 ? "s" : ""}...`
    );

    // Note: In production, this would call OpenClaw's sessions_spawn API
    // For now, we'll trigger the extraction script directly
    const extractScript = path.join(EXTRACTION_QUEUE_BASE, "..", "process-queue.mjs");

    if (fs.existsSync(extractScript)) {
      const { stdout, stderr } = await execAsync(
        `node "${extractScript}" --extract-all 2>&1`,
        { timeout: 120000 } // 2 minute timeout
      );

      log(`✅ Extraction completed`);

      // Parse output for metrics
      const outputLines = stdout.split("\n");
      for (const line of outputLines) {
        if (
          line.includes("✅") ||
          line.includes("created") ||
          line.includes("extracted")
        ) {
          log(`  ${line}`);
        }
      }

      return notesCount;
    } else {
      log(
        `⚠️  Extraction script not found: ${extractScript}`,
        "error"
      );
      return 0;
    }
  } catch (e) {
    log(`❌ Error during extraction: ${e.message}`, "error");
    return 0;
  }
}

// Main scheduler logic
async function runScheduler() {
  log(`📅 Scheduled check`);

  // Check if we're in work hours
  if (!isWorkHours()) {
    const now = new Date();
    const mtTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Denver" })
    );
    log(`⏰ Outside work hours (current: ${mtTime.toLocaleTimeString()})`);
    return;
  }

  // Load history
  const history = loadSyncHistory();

  // Find new/updated notes
  log(`📝 Scanning for new Granola notes...`);
  const newNotes = await findNewNotes(history);

  if (newNotes.length === 0) {
    log(`✅ No new action items found`);
    return;
  }

  log(`✅ Found ${newNotes.length} new note${newNotes.length > 1 ? "s" : ""}`);

  // Queue them
  log(`🔄 Queuing for extraction...`);
  const queued = await queueNotesForExtraction(newNotes);

  // Update history
  for (const note of newNotes) {
    history.processedNotes[note.id] = note.lastModified;
  }
  history.lastSyncTime = new Date().toISOString();
  saveSyncHistory(history);

  // Trigger extraction
  await triggerExtraction(queued);
}

// Daemon mode (runs every 30 min)
async function runDaemon() {
  log(`🚀 Granola Scheduler Started (checking every 30 min)`);
  log(`⏰ Work hours: 9 AM - 6 PM MT, Monday-Friday`);

  // Run immediately
  await runScheduler();

  // Then every 30 minutes
  setInterval(runScheduler, 30 * 60 * 1000);
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--once")) {
    // Run once and exit (for cron)
    await runScheduler();
    process.exit(0);
  } else {
    // Run as daemon
    await runDaemon();
  }
}

main().catch((e) => {
  log(`❌ Fatal error: ${e.message}`, "error");
  process.exit(1);
});
