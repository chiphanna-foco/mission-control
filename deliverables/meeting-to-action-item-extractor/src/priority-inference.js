/**
 * Priority Inference Engine
 * 
 * Determines task priority based on:
 * - Keywords in action text
 * - Context and surrounding discussion
 * - Time sensitivity
 * - Pattern type
 */

/**
 * Infer priority from action item context
 * @param {object} context - { action, context, hasDate, dateStr, pattern }
 * @returns {string} 'High', 'Medium', or 'Low'
 */
export function inferPriority(context) {
  const { action, context: contextText, hasDate, dateStr, pattern } = context;

  let score = 50; // Base score (0-100, mapped to priority)

  // ============ KEYWORD SCORING ============
  
  // High priority keywords
  const highPriorityKeywords = [
    'urgent', 'critical', 'asap', 'immediately', 'emergency',
    'blocking', 'blocked', 'halt', 'stop', 'production',
    'security', 'breach', 'compliance', 'audit', 'legal',
    'customer impact', 'revenue', 'launch', 'ship', 'release',
    'deadline', 'promised', 'committed', 'contract'
  ];

  // Medium priority keywords
  const mediumPriorityKeywords = [
    'important', 'significant', 'major', 'substantial',
    'improvement', 'enhancement', 'feature', 'release',
    'next week', 'this week', 'soon', 'next month',
    'approval', 'review', 'decision', 'planning'
  ];

  // Low priority keywords
  const lowPriorityKeywords = [
    'nice to have', 'someday', 'maybe', 'optional',
    'consider', 'explore', 'nice', 'would be nice',
    'could', 'when you get a chance', 'whenever'
  ];

  const actionLower = (action || '').toLowerCase();
  const contextLower = (contextText || '').toLowerCase();
  const fullText = actionLower + ' ' + contextLower;

  // Count keyword matches
  const highMatches = highPriorityKeywords.filter(kw => fullText.includes(kw)).length;
  const mediumMatches = mediumPriorityKeywords.filter(kw => fullText.includes(kw)).length;
  const lowMatches = lowPriorityKeywords.filter(kw => fullText.includes(kw)).length;

  score += highMatches * 15;
  score += mediumMatches * 8;
  score -= lowMatches * 10;

  // ============ TIME SENSITIVITY ============

  if (hasDate && dateStr) {
    const dateLower = dateStr.toLowerCase();
    
    // Very soon = high priority
    if (dateLower.includes('today') || dateLower.includes('tomorrow')) {
      score += 20;
    }
    // This week = medium-high
    else if (dateLower.includes('this week') || dateLower.includes('friday')) {
      score += 10;
    }
    // Next week = medium
    else if (dateLower.includes('next week') || dateLower.includes('monday')) {
      score += 5;
    }
    // Later = no boost
  } else if (!hasDate) {
    // No deadline might indicate lower priority, but depends on context
    score -= 5;
  }

  // ============ PATTERN TYPE SCORING ============

  const patternScores = {
    'time_bound_commitment': 15,     // "I'll X by Y" - high commitment
    'assignment': 12,                // "Person needs to X" - clear ownership
    'approval_item': 10,             // Approvals are usually time-critical
    'timeline_commitment': 12,       // "We need to X by Y"
    'follow_up': 5,                  // Follow-ups are lower priority
    'discussion_item': 3,            // Discussions are lower priority
    'context_inferred': 2,           // Inferred items are lowest
    'responsibility': 8,             // Ownership is medium
    'conditional_commitment': 6      // Conditional items are deferred
  };

  score += patternScores[pattern] || 0;

  // ============ ACTION TYPE SCORING ============

  // Approval/decision/review actions
  if (/^(?:approve|review|sign|authorize|decide|finalize|confirm)/i.test(actionLower)) {
    score += 8; // Approvals are usually urgent
  }

  // Implementation/coding actions
  else if (/^(?:implement|build|create|code|develop|engineer|deploy)/i.test(actionLower)) {
    score += 5; // Medium priority
  }

  // Documentation/communication actions
  else if (/^(?:document|write|send|email|notify|announce)/i.test(actionLower)) {
    score += 3; // Lower priority (often delayable)
  }

  // Bug fixes/maintenance
  else if (/^(?:fix|patch|maintain|update|upgrade)/i.test(actionLower)) {
    score += 10; // Usually important
  }

  // Testing/QA
  else if (/^(?:test|qa|verify|validate|check)/i.test(actionLower)) {
    score += 7;
  }

  // ============ STAKEHOLDER SCORING ============

  const highStakeholderKeywords = ['customer', 'client', 'executive', 'leadership', 'ceo', 'board'];
  const mentionsHighStakeholder = highStakeholderKeywords.some(kw => fullText.includes(kw));
  if (mentionsHighStakeholder) {
    score += 10; // Customer/leadership involvement = higher priority
  }

  // ============ CONSTRAINT SCORING ============

  // Blocking other work
  if (/blocking|blocks|dependency|depends on|prerequisite|gate/i.test(fullText)) {
    score += 15; // Blockers are high priority
  }

  // Risk/compliance mentions
  if (/risk|compliance|audit|security|legal|liability/i.test(fullText)) {
    score += 12; // Risk items are important
  }

  // ============ RECENCY SCORING ============

  // Multiple people mentioned or assigned
  const personCount = (fullText.match(/(?:john|sarah|chip|engineering|team|we|they)/gi) || []).length;
  if (personCount > 3) {
    score += 5; // Multiple stakeholders = higher priority
  }

  // ============ FINAL SCORING ============

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Map to priority level
  if (score >= 70) {
    return 'High';
  } else if (score >= 40) {
    return 'Medium';
  } else {
    return 'Low';
  }
}

/**
 * Get priority emoji
 */
export function getPriorityEmoji(priority) {
  const emojis = {
    'High': '🔴',
    'Medium': '🟡',
    'Low': '🟢'
  };
  return emojis[priority] || '⚪';
}

/**
 * Get priority badge for display
 */
export function getPriorityBadge(priority) {
  const badges = {
    'High': '⚠️ HIGH',
    'Medium': '📌 MEDIUM',
    'Low': '✓ LOW'
  };
  return badges[priority] || priority;
}

/**
 * Adjust priority based on additional factors
 */
export function adjustPriority(currentPriority, factors = {}) {
  const levels = ['Low', 'Medium', 'High'];
  let idx = levels.indexOf(currentPriority);

  if (factors.escalateToUrgent) {
    return 'High';
  }
  if (factors.isBlocking) {
    return 'High';
  }
  if (factors.daysUntilDue !== undefined && factors.daysUntilDue === 0) {
    return 'High'; // Due today
  }
  if (factors.daysUntilDue === 1) {
    if (idx < 2) idx++; // Bump up one level
  }
  if (factors.isApproval) {
    if (idx < 1) idx = 1; // At least Medium
  }
  if (factors.isLowValue) {
    idx = 0; // Low
  }

  return levels[Math.max(0, Math.min(2, idx))];
}

export default {
  inferPriority,
  getPriorityEmoji,
  getPriorityBadge,
  adjustPriority
};
