/**
 * Commitment Pattern Library
 * 
 * Regex patterns that match common ways commitments are expressed in meetings
 * Each pattern has a name, regex, and group extraction labels
 */

/**
 * Pattern structure:
 * {
 *   name: 'pattern_name',
 *   description: 'What this pattern matches',
 *   regex: 'regex pattern with named groups',
 *   groups: ['action', 'person', 'date'], // Order matters - maps to regex groups
 *   confidence: 0.0-1.0 // Base confidence for this pattern type
 * }
 */

export const COMMITMENT_PATTERNS = [
  // ============ PATTERN 1: TIME-BOUND COMMITMENTS ============
  // "I'll X by [time]", "We'll X by [time]"
  {
    name: 'time_bound_commitment',
    description: 'Explicit time-bound commitments with deadline',
    regex: /(?:I'll|I will|we'll|we will|you'll|you will|he'll|she'll|they'll|let's|can you)\s+([^.!?]+?)\s+by\s+([^.!?]+?)(?:\.|!|\?|$)/gi,
    groups: ['action', 'date'],
    examples: [
      "I'll send the proposal by Friday",
      "we'll finish the report by end of month",
      "you'll need to approve by next Tuesday"
    ]
  },

  // ============ PATTERN 2: DIRECT ASSIGNMENT WITH DEADLINE ============
  // "X needs to do Y by [time]"
  {
    name: 'assignment',
    description: 'Assignment pattern: Person needs to do something by time',
    regex: /([A-Z][a-z]+)\s+(?:needs to|has to|should|must|will)\s+([^.!?]+?)\s+by\s+([^.!?]+?)(?:\.|!|\?|$)/g,
    groups: ['person', 'action', 'date'],
    examples: [
      "Chip needs to approve the design by Friday",
      "John has to review the code by Tuesday",
      "Sarah should send the report by next week"
    ]
  },

  // ============ PATTERN 3: FOLLOW-UP ACTIONS ============
  // "Follow up with X on Y", "Let's check in on X"
  {
    name: 'follow_up',
    description: 'Follow-up action items without explicit deadline',
    regex: /(?:follow up|check in|reconvene|circle back|sync up|touch base)\s+(?:with|on|about)?\s*([^.!?]+?)(?:\s+on\s+([^.!?]+?))?(?:\s+(?:soon|next|this)\s+([^.!?]+?))?(?:\.|!|\?|$)/gi,
    groups: ['person', 'topic', 'date'],
    examples: [
      "Follow up with Sarah about the budget",
      "Let's check in on the metrics next Monday",
      "Circle back on this with the team"
    ]
  },

  // ============ PATTERN 4: DIRECT ACTION ITEMS ============
  // "Action item: X", "TODO: X"
  {
    name: 'direct_action_item',
    description: 'Explicitly marked action items',
    regex: /(?:action\s+items?:|to\s*do:|todo:|immediate:\s*)([^.!?]+?)(?:\.|!|\?|$)/gi,
    groups: ['action'],
    examples: [
      "Action item: Schedule the team meeting",
      "TODO: Update the documentation",
      "To do: Review the contract"
    ]
  },

  // ============ PATTERN 5: RESPONSIBILITY ASSIGNMENT ============
  // "You're going to X", "[Person] is going to X"
  {
    name: 'responsibility',
    description: 'Assignment of responsibility/ownership',
    regex: /(?:you're|you are|we're|we are|let's)?\s*(?:going to|going to be|responsible for|own|take|handle)?\s*([A-Z][a-z]+)?\s+(?:going to|going to be|will|is going to)\s+(?:be\s+)?(?:responsible for|handle|own|take|do)\s+([^.!?]+?)(?:\.|!|\?|$)/gi,
    groups: ['person', 'action'],
    examples: [
      "John is going to handle the backend work",
      "We're taking on the documentation",
      "Chip will be responsible for the budget"
    ]
  },

  // ============ PATTERN 6: TIMELINE COMMITMENTS ============
  // "We need to X before Y", "Let's ship X by Y"
  {
    name: 'timeline_commitment',
    description: 'Time-constrained work items',
    regex: /(?:need to|should|must|we'll|let's)\s+([^.!?]+?)\s+(?:before|by|no later than|not later than)\s+([^.!?]+?)(?:\.|!|\?|$)/gi,
    groups: ['action', 'date'],
    examples: [
      "We need to review the contract before Friday",
      "Let's launch the feature by end of Q2",
      "Must ship the hotfix before the event"
    ]
  },

  // ============ PATTERN 7: APPROVAL/REVIEW ITEMS ============
  // "Need approval from X", "X needs to approve/review"
  {
    name: 'approval_item',
    description: 'Approvals and reviews needed',
    regex: /(?:(?:need|requires?)\s+)?(?:approval|review|sign-?off)\s+(?:from|by)\s+([A-Z][a-z]+)\s*(?:by|before|on)?\s*([^.!?]*?)(?:\.|!|\?|$)/gi,
    groups: ['person', 'date'],
    examples: [
      "Need approval from Chip by Friday",
      "Requires review from the legal team",
      "John's sign-off needed on the design"
    ]
  },

  // ============ PATTERN 8: DISCUSSION/CONSENSUS ITEMS ============
  // "We should X", "We need to discuss X"
  {
    name: 'discussion_item',
    description: 'Items that need team discussion/consensus',
    regex: /(?:we\s+)?(?:should|need to\s+discuss|need to\s+decide|ought to|might want to)\s+([^.!?]+?)(?:\.|!|\?|$)/gi,
    groups: ['action'],
    examples: [
      "We should update the documentation",
      "We need to decide on the pricing model",
      "We ought to implement error handling"
    ]
  },

  // ============ PATTERN 9: CONTEXT-INFERRED ============
  // Higher-level inferences: "We discussed X" → "Implement X"
  {
    name: 'context_inferred',
    description: 'Tasks inferred from discussion context',
    regex: /(?:discussed?|talked about|covered|reviewed)\s+([^.!?]+?)\.?\s+(?:need|should|important|critical|urgent)/gi,
    groups: ['action'],
    examples: [
      "We discussed the new pricing model. Need to get customer feedback.",
      "Reviewed the database structure. Critical to test migrations.",
      "Talked about API versioning. Should document the approach."
    ]
  },

  // ============ PATTERN 10: CONDITIONAL COMMITMENTS ============
  // "Once X, then Y", "After X, we'll Y"
  {
    name: 'conditional_commitment',
    description: 'Commitments with prerequisites',
    regex: /(?:once|after|when|assuming)\s+([^.!?,]+?)\s*,\s*(?:we'll|then|we|\S+\s+will)\s+([^.!?]+?)(?:\.|!|\?|$)/gi,
    groups: ['condition', 'action'],
    examples: [
      "Once we get approval, we'll proceed with development",
      "After the audit, we'll implement the changes",
      "When the data is ready, we'll run the analysis"
    ]
  }
];

/**
 * Get pattern by name
 */
export function getPattern(name) {
  return COMMITMENT_PATTERNS.find(p => p.name === name);
}

/**
 * Get all patterns of a type
 */
export function getPatternsByType(type) {
  const typeMap = {
    'commitment': ['time_bound_commitment', 'assignment', 'timeline_commitment', 'conditional_commitment'],
    'followup': ['follow_up'],
    'approval': ['approval_item'],
    'action': ['direct_action_item', 'responsibility'],
    'discussion': ['discussion_item', 'context_inferred'],
    'all': COMMITMENT_PATTERNS.map(p => p.name)
  };
  
  const names = typeMap[type] || [];
  return COMMITMENT_PATTERNS.filter(p => names.includes(p.name));
}

/**
 * Add custom pattern (runtime)
 */
export function addPattern(pattern) {
  if (!pattern.name || !pattern.regex || !pattern.groups) {
    throw new Error('Pattern must have name, regex, and groups');
  }
  COMMITMENT_PATTERNS.push(pattern);
}

/**
 * Test a pattern against text
 */
export function testPattern(patternName, text) {
  const pattern = getPattern(patternName);
  if (!pattern) throw new Error(`Pattern not found: ${patternName}`);

  const regex = new RegExp(pattern.regex, 'gi');
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const extracted = { fullMatch: match[0], groups: {} };
    for (let i = 0; i < pattern.groups.length; i++) {
      extracted.groups[pattern.groups[i]] = match[i + 1] || null;
    }
    matches.push(extracted);
  }

  return matches;
}

/**
 * Export pattern statistics
 */
export function getPatternStats() {
  return {
    totalPatterns: COMMITMENT_PATTERNS.length,
    patterns: COMMITMENT_PATTERNS.map(p => ({
      name: p.name,
      description: p.description,
      examples: p.examples.length
    }))
  };
}
