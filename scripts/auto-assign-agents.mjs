#!/usr/bin/env node

/**
 * Auto-Assign Agents to In-Progress Tasks
 * 
 * Watches for tasks that are in_progress but have no assigned agent,
 * then intelligently assigns the best agent based on task spec.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../mission-control.db');

const db = new Database(dbPath);

/**
 * Agent profiles with keywords they handle best
 */
const AGENT_PROFILES = {
  '605bdcf5-a86d-427e-8219-67523e305e59': {
    name: 'ChipAI',
    keywords: ['architecture', 'infrastructure', 'system', 'build', 'framework', 'engineering', 'technical', 'dashboard', 'performance', 'database', 'innovation', 'scouting', 'strategy'],
    bias: 0
  },
  '36be4369-653e-4bac-9825-726699588c97': {
    name: 'Social Distributor',
    keywords: ['twitter', 'social', 'content', 'post', 'media', 'pinterest', 'brand', 'account', 'distribution', 'engagement'],
    bias: 1
  },
  '25cda26c-1da2-4bbc-b609-9196826f8b21': {
    name: 'Content Writer',
    keywords: ['page', 'content', 'write', 'alternative', 'review', 'article', 'blog', 'copy', 'text', 'description'],
    bias: 2
  },
  '44d1f207-457b-4399-9d33-27361829e13f': {
    name: 'Growth Architect',
    keywords: ['database', 'product', 'build', 'data', 'catalog', 'spreadsheet', 'product database', 'collection'],
    bias: 3
  }
};

/**
 * Score agents based on task content
 */
function scoreAgents(taskTitle, taskDescription, planningSpec) {
  const text = `${taskTitle} ${taskDescription || ''} ${planningSpec ? JSON.stringify(planningSpec) : ''}`.toLowerCase();

  const scores = {};

  for (const [agentId, profile] of Object.entries(AGENT_PROFILES)) {
    let score = profile.bias; // Start with bias (lower = more preferred)
    
    // Count keyword matches
    for (const keyword of profile.keywords) {
      const count = (text.match(new RegExp(keyword, 'g')) || []).length;
      score -= count * 10; // Subtract for each match (negative score = better)
    }

    scores[agentId] = score;
  }

  // Return agent with lowest score (best match)
  const bestAgent = Object.entries(scores).sort(([, a], [, b]) => a - b)[0];
  return bestAgent ? bestAgent[0] : Object.keys(AGENT_PROFILES)[0]; // Default to ChipAI
}

/**
 * Auto-assign unassigned in-progress tasks
 */
function autoAssignAgents() {
  console.log(`[${new Date().toISOString()}] Checking for unassigned in-progress tasks...`);

  const unassigned = db.prepare(`
    SELECT id, title, description, planning_spec 
    FROM tasks 
    WHERE status = 'in_progress' AND assigned_agent_id IS NULL AND planning_complete = 1
  `).all();

  if (unassigned.length === 0) {
    console.log('No unassigned tasks found.');
    return;
  }

  console.log(`Found ${unassigned.length} unassigned task(s). Assigning agents...`);

  const now = new Date().toISOString();

  for (const task of unassigned) {
    let spec = null;
    try {
      spec = JSON.parse(task.planning_spec || '{}');
    } catch {
      // Keep spec null if parse fails
    }

    const bestAgentId = scoreAgents(task.title, task.description, spec);
    const agentName = AGENT_PROFILES[bestAgentId]?.name || 'Unknown';

    // Assign agent
    db.prepare('UPDATE tasks SET assigned_agent_id = ?, updated_at = ? WHERE id = ?')
      .run(bestAgentId, now, task.id);

    console.log(`✅ Assigned "${task.title}" to ${agentName}`);
  }

  console.log(`Auto-assignment complete.`);
}

// Run immediately and show results
autoAssignAgents();
