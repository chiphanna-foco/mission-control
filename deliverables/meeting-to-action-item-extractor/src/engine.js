/**
 * Meeting-to-Action-Item Extraction Engine
 * 
 * Parses meeting transcripts/notes and extracts action items with:
 * - Commitment identification
 * - Assignee detection
 * - Due date parsing
 * - Priority inference
 * - Confidence scoring
 */

import { v4 as uuid } from 'uuid';
import { parseDate } from './date-parser.js';
import { inferPriority } from './priority-inference.js';
import * as patterns from './patterns.js';

export class ExtractorEngine {
  constructor(options = {}) {
    this.timezone = options.timezone || 'America/Denver';
    this.confidenceThreshold = options.confidenceThreshold || 0.65;
    this.parseRelativeDates = options.parseRelativeDates !== false;
  }

  /**
   * Main extraction method
   * @param {string} transcript - Meeting notes/transcript text
   * @param {object} metadata - Optional: { meetingId, meetingDate, attendees, title }
   * @returns {Promise<Array>} Array of extracted action items
   */
  async extract(transcript, metadata = {}) {
    if (!transcript || typeof transcript !== 'string') {
      throw new Error('Transcript must be a non-empty string');
    }

    const actionItems = [];
    const seenTitles = new Set(); // Dedup

    // Try each pattern library
    for (const pattern of patterns.COMMITMENT_PATTERNS) {
      const matches = this._matchPattern(transcript, pattern);
      
      for (const match of matches) {
        const item = this._buildActionItem(match, pattern, transcript, metadata);
        
        // Avoid duplicates
        if (!seenTitles.has(item.title)) {
          seenTitles.add(item.title);
          actionItems.push(item);
        }
      }
    }

    // Sort by confidence (descending) then due date (ascending)
    actionItems.sort((a, b) => {
      if (b.source.confidence !== a.source.confidence) {
        return b.source.confidence - a.source.confidence;
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });

    // Filter by confidence threshold
    return actionItems.filter(item => item.source.confidence >= this.confidenceThreshold);
  }

  /**
   * Extract patterns from transcript
   * @private
   */
  _matchPattern(transcript, pattern) {
    const matches = [];
    const regex = new RegExp(pattern.regex, 'gi');
    let match;

    while ((match = regex.exec(transcript)) !== null) {
      // Extract components based on groups
      const extracted = {
        fullMatch: match[0],
        groups: {}
      };

      // Map named groups if available
      for (let i = 0; i < pattern.groups.length; i++) {
        extracted.groups[pattern.groups[i]] = match[i + 1] || null;
      }

      // Check if match is likely commitment (heuristics)
      if (this._isLikelyCommitment(match[0], pattern)) {
        matches.push(extracted);
      }
    }

    return matches;
  }

  /**
   * Heuristic to filter out false positives
   * @private
   */
  _isLikelyCommitment(text, pattern) {
    // Check for negation words
    const negations = /(?:don't|not|won't|can't|may not|might not)\s+(?:able|can|will)/gi;
    if (negations.test(text) && pattern.name !== 'discussion_item') {
      return false;
    }

    // Check for sarcasm indicators (weak)
    const sarcasmIndicators = /(?:yeah right|just kidding|i wish|dream on)/gi;
    if (sarcasmIndicators.test(text)) {
      return false; // Low confidence, filter out
    }

    // Contextual length check
    if (text.length < 10 || text.length > 500) {
      return false;
    }

    return true;
  }

  /**
   * Build structured action item from pattern match
   * @private
   */
  _buildActionItem(match, pattern, fullTranscript, metadata) {
    const groups = match.groups;
    
    // Extract components
    const action = (groups.action || groups.commitment || groups.task || '').trim();
    const person = (groups.person || groups.assignee || groups.who || '').trim();
    const dateStr = (groups.date || groups.when || '').trim();
    const context = this._extractContext(match.fullMatch, fullTranscript);

    // Parse due date
    const parsedDate = this._parseDueDate(dateStr, metadata.meetingDate);
    
    // Infer priority
    const priority = inferPriority({
      action,
      context: context.surrounding,
      hasDate: !!parsedDate,
      dateStr,
      pattern: pattern.name
    });

    // Calculate confidence
    const confidence = this._calculateConfidence({
      patternName: pattern.name,
      hasAssignee: !!person,
      hasDueDate: !!parsedDate,
      hasContext: context.surrounding.length > 0,
      actionLength: action.length
    });

    return {
      id: uuid(),
      title: this._formatTitle(action),
      description: this._buildDescription(action, person, dateStr, context),
      assignedTo: person || 'Unassigned',
      dueDate: parsedDate,
      priority,
      status: 'Pending',
      source: {
        pattern: pattern.name,
        original: match.fullMatch,
        confidence: parseFloat(confidence.toFixed(2))
      },
      meeting: {
        id: metadata.meetingId || null,
        date: metadata.meetingDate || null,
        attendees: metadata.attendees || [],
        title: metadata.title || null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Extract surrounding context for better understanding
   * @private
   */
  _extractContext(match, fullTranscript) {
    const index = fullTranscript.indexOf(match);
    const before = Math.max(0, index - 100);
    const after = Math.min(fullTranscript.length, index + match.length + 100);

    return {
      surrounding: fullTranscript.substring(before, after),
      before: fullTranscript.substring(before, index),
      after: fullTranscript.substring(index + match.length, after)
    };
  }

  /**
   * Parse due date (explicit or relative)
   * @private
   */
  _parseDueDate(dateStr, meetingDate = null) {
    if (!dateStr) return null;

    try {
      const parsed = parseDate(dateStr, {
        baseDate: meetingDate ? new Date(meetingDate) : new Date(),
        timezone: this.timezone,
        parseRelative: this.parseRelativeDates
      });

      return parsed ? parsed.toISOString() : null;
    } catch (error) {
      console.debug(`Failed to parse date "${dateStr}":`, error.message);
      return null;
    }
  }

  /**
   * Format action title (remove redundancy, capitalize)
   * @private
   */
  _formatTitle(action) {
    if (!action) return 'Unknown Action';

    // Remove common prefixes
    const cleaned = action
      .replace(/^(i|we|you|they|he|she|it|the)\s+(?:will|need to|should|have to|must)\s+/i, '')
      .replace(/^(send|create|make|build|write|prepare|schedule|book|arrange|organize|plan)\s+/i, (match) => match.toLowerCase());

    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }

  /**
   * Build human-readable description
   * @private
   */
  _buildDescription(action, person, dateStr, context) {
    const parts = [action];

    if (person) {
      parts.push(`(assigned to ${person})`);
    }

    if (dateStr) {
      parts.push(`due ${dateStr}`);
    }

    const desc = parts.join(', ');
    const truncated = desc.length > 200 ? desc.substring(0, 197) + '...' : desc;
    
    return truncated;
  }

  /**
   * Calculate extraction confidence (0-1)
   * @private
   */
  _calculateConfidence(factors) {
    let score = 0.5; // Base score

    // Pattern quality
    const patternScores = {
      'time_bound_commitment': 0.95,
      'assignment': 0.90,
      'follow_up': 0.75,
      'direct_action_item': 0.90,
      'discussion_item': 0.60,
      'context_inferred': 0.55
    };
    score = patternScores[factors.patternName] || 0.65;

    // Adjust for components
    if (factors.hasAssignee) score += 0.05;
    if (factors.hasDueDate) score += 0.05;
    if (factors.hasContext) score += 0.03;
    if (factors.actionLength > 20) score += 0.02;

    return Math.min(score, 1.0);
  }

  /**
   * Validate and clean extracted items
   * @public
   */
  validate(items) {
    return items.filter(item => {
      const hasTitle = item.title && item.title.length > 3;
      const hasAssignee = item.assignedTo && item.assignedTo !== 'Unassigned';
      const reasonableConfidence = item.source.confidence > 0.4;

      return hasTitle && reasonableConfidence;
    });
  }
}

export default ExtractorEngine;
