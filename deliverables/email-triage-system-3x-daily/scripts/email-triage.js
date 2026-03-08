#!/usr/bin/env node

/**
 * Email Triage System - Standalone Script
 * Runs email classification, action extraction, and urgency detection
 * Called by launchd (3x daily: 8 AM, 12 PM, 5 PM MST)
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// Configuration
const PROJECT_ROOT = path.join(__dirname, "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "triage.config.json");
const STATE_PATH = path.join(PROJECT_ROOT, "triage-state.json");
const RESULTS_DIR = path.join(PROJECT_ROOT, "results");
const DB_PATH = path.join(PROJECT_ROOT, "triage.db");

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Load configuration
function loadConfig() {
  const configContent = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(configContent);
}

// Load environment variables
function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local not found. Please set up Gmail API credentials.");
    process.exit(1);
  }

  const env = {};
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2];
    }
  }

  return env;
}

// Initialize Gmail API
async function initializeGmail(env) {
  const auth = new google.auth.GoogleAuth({
    keyFile: env.GOOGLE_KEY_FILE || path.join(PROJECT_ROOT, "service-account.json"),
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  return google.gmail({ version: "v1", auth });
}

// Fetch unread emails
async function fetchUnreadEmails(gmail) {
  try {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
      maxResults: 20,
    });

    const messages = response.data.messages || [];

    // Get full message details
    const emailDetails = [];
    for (const message of messages) {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      emailDetails.push({
        id: detail.data.id,
        ...parseMessage(detail.data),
      });
    }

    return emailDetails;
  } catch (error) {
    console.error("❌ Error fetching emails:", error.message);
    return [];
  }
}

// Parse Gmail message
function parseMessage(message) {
  const headers = message.payload.headers || [];
  const getHeader = (name) =>
    headers.find((h) => h.name === name)?.value || "";

  let body = "";
  if (message.payload.parts) {
    body = message.payload.parts
      .map((p) => (p.body.data ? Buffer.from(p.body.data, "base64").toString() : ""))
      .join("\n");
  } else if (message.payload.body?.data) {
    body = Buffer.from(message.payload.body.data, "base64").toString();
  }

  return {
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    body: body.slice(0, 1000), // First 1000 chars
    internalDate: message.internalDate,
  };
}

// Classify email
function classifyEmail(email, config) {
  const text = `${email.from} ${email.subject} ${email.body}`.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [domain, cfg] of Object.entries(config.domains)) {
    let score = 0;

    // Email domain match
    for (const emailDomain of cfg.emails) {
      if (email.from.toLowerCase().includes(emailDomain)) {
        score += 100;
      }
    }

    // Keyword matches
    for (const keyword of cfg.keywords) {
      const count = (text.match(new RegExp(keyword.toLowerCase(), "g")) || []).length;
      score += count * 10;
    }

    const confidence = Math.min(score / 100, 1);

    if (confidence > bestScore) {
      bestScore = confidence;
      bestMatch = {
        domain,
        label: cfg.label,
        priority: cfg.priority,
        context: cfg.context,
        confidence,
      };
    }
  }

  return (
    bestMatch || {
      domain: "uncategorized",
      label: "Uncategorized",
      priority: "low",
      context: "Other",
      confidence: 0,
    }
  );
}

// Extract action items
function extractActions(subject, body, config) {
  const text = `${subject}\n${body}`;
  const lowerText = text.toLowerCase();
  const actions = [];

  for (const keyword of config.actionKeywords.todo) {
    if (lowerText.includes(keyword.toLowerCase())) {
      actions.push({
        type: "todo",
        text: keyword,
        confidence: 0.8,
      });
      break;
    }
  }

  for (const keyword of config.actionKeywords.decision) {
    if (lowerText.includes(keyword.toLowerCase())) {
      actions.push({
        type: "decision",
        text: keyword,
        confidence: 0.85,
      });
      break;
    }
  }

  for (const keyword of config.actionKeywords.waiting) {
    if (lowerText.includes(keyword.toLowerCase())) {
      actions.push({
        type: "waiting",
        text: keyword,
        confidence: 0.75,
      });
      break;
    }
  }

  return {
    hasAction: actions.length > 0,
    actions: actions.slice(0, 3),
  };
}

// Detect urgency
function detectUrgency(subject, body, from, config) {
  const text = `${subject}\n${body}`;
  const lowerText = text.toLowerCase();
  let maxLevel = 1;
  const reasons = [];

  for (const [, pattern] of Object.entries(config.urgencyPatterns)) {
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        reasons.push(`Contains "${keyword}"`);
        maxLevel = Math.max(maxLevel, pattern.level);
      }
    }
  }

  const levelNames = {
    5: "CRITICAL",
    4: "HIGH",
    3: "MEDIUM",
    2: "LOW",
    1: "MINIMAL",
  };

  return {
    level: maxLevel,
    levelName: levelNames[maxLevel],
    isUrgent: maxLevel >= 3,
    reasons,
  };
}

// Save triage results
function saveResults(emails, config) {
  const results = {
    timestamp: new Date().toISOString(),
    emailsProcessed: emails.length,
    actionItems: [],
    urgent: [],
    byDomain: {},
  };

  for (const email of emails) {
    const classification = classifyEmail(email, config);
    const actions = extractActions(email.subject, email.body, config);
    const urgency = detectUrgency(
      email.subject,
      email.body,
      email.from,
      config
    );

    // Track by domain
    if (!results.byDomain[classification.domain]) {
      results.byDomain[classification.domain] = [];
    }

    const triageEntry = {
      id: email.id,
      from: email.from,
      subject: email.subject,
      classification,
      actions,
      urgency,
    };

    results.byDomain[classification.domain].push(triageEntry);

    if (actions.hasAction) {
      results.actionItems.push(triageEntry);
    }

    if (urgency.isUrgent) {
      results.urgent.push(triageEntry);
    }
  }

  // Count actions
  const actionCount = {
    todo: results.actionItems.filter((e) =>
      e.actions.some((a) => a.type === "todo")
    ).length,
    decision: results.actionItems.filter((e) =>
      e.actions.some((a) => a.type === "decision")
    ).length,
    waiting: results.actionItems.filter((e) =>
      e.actions.some((a) => a.type === "waiting")
    ).length,
  };

  return { ...results, actionCount };
}

// Update state
function updateState() {
  const state = {
    lastRun: new Date().toISOString(),
    success: true,
  };

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// Main execution
async function main() {
  try {
    console.log("📧 Email Triage Starting...");

    const config = loadConfig();
    const env = loadEnv();
    const gmail = await initializeGmail(env);

    console.log("📨 Fetching unread emails...");
    const emails = await fetchUnreadEmails(gmail);

    if (emails.length === 0) {
      console.log("✅ No unread emails to triage.");
      updateState();
      return;
    }

    console.log(`📊 Processing ${emails.length} emails...`);
    const results = saveResults(emails, config);

    // Save results to file
    const timestamp = new Date().toISOString().split("T")[0];
    const resultsFile = path.join(
      RESULTS_DIR,
      `triage-${timestamp}-${Date.now()}.json`
    );
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    // Log summary
    console.log(`\n📊 Triage Summary:`);
    console.log(`   Total Emails: ${results.emailsProcessed}`);
    console.log(`   Action Items: ${results.actionItems.length}`);
    console.log(`   Urgent: ${results.urgent.length}`);
    console.log(`   Domains: ${Object.keys(results.byDomain).join(", ")}`);

    if (results.urgent.length > 0) {
      console.log(`\n🚨 URGENT ITEMS DETECTED: ${results.urgent.length}`);
      results.urgent.forEach((item, i) => {
        console.log(
          `   ${i + 1}. [${item.classification.label}] ${item.subject}`
        );
        console.log(`      From: ${item.from}`);
        console.log(`      Urgency: ${item.urgency.levelName}`);
      });
    }

    updateState();
    console.log(`\n✅ Results saved to ${resultsFile}`);
  } catch (error) {
    console.error("❌ Triage failed:", error.message);
    process.exit(1);
  }
}

// Handle command-line arguments
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = {
  classifyEmail,
  extractActions,
  detectUrgency,
  saveResults,
  fetchUnreadEmails,
};
