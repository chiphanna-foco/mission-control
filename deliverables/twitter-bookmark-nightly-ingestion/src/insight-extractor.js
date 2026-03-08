/**
 * Insight Extractor
 * 
 * Extracts actionable insights from bookmarked tweets.
 * Types: actionable, interesting, reference, warning, opportunity
 */

class InsightExtractor {
  /**
   * Extract insights from a bookmark
   */
  static extract(bookmark) {
    const content = bookmark.content || '';
    const insights = [];

    // Check for actionable items
    const actionable = this._extractActionable(content);
    if (actionable) insights.push(actionable);

    // Check for opportunities
    const opportunity = this._extractOpportunity(content);
    if (opportunity) insights.push(opportunity);

    // Check for warnings/cautions
    const warning = this._extractWarning(content);
    if (warning) insights.push(warning);

    // Check for interesting patterns
    const interesting = this._extractInteresting(content);
    if (interesting) insights.push(interesting);

    // Check for reference material
    const reference = this._extractReference(content);
    if (reference) insights.push(reference);

    return insights.length > 0 ? insights : [
      {
        type: 'reference',
        content: 'Bookmarked for later reference',
        tags: ['general']
      }
    ];
  }

  /**
   * Extract actionable insights (things to do, implement, etc)
   */
  static _extractActionable(content) {
    const actionPatterns = [
      /\b(try|test|build|implement|create|launch|setup|configure|install)\b/gi,
      /how to\s+[^\.!?]+/gi,
      /\[task\]|\[action\]|\[todo\]/gi,
      /recommended:|should:|must:/gi,
    ];

    let confidence = 0;
    actionPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      confidence += matches.length;
    });

    if (confidence > 0) {
      return {
        type: 'actionable',
        content: this._extractSentenceContaining(content, /\b(try|test|build|implement|create|launch)\b/i),
        tags: ['action-item', 'do-it']
      };
    }

    return null;
  }

  /**
   * Extract opportunity insights
   */
  static _extractOpportunity(content) {
    const opportunityPatterns = [
      /\b(opportunity|gap|market|untapped|niche|underserved|whitespace)\b/gi,
      /\b(anyone can|no one is|first to)\b/gi,
      /\$[0-9]+[BMK]?\b/gi, // Money mentions
    ];

    let confidence = 0;
    opportunityPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      confidence += matches.length;
    });

    if (confidence > 0) {
      return {
        type: 'opportunity',
        content: this._extractSentenceContaining(content, /\b(opportunity|market|gap|untapped)\b/i) || 'Market opportunity identified',
        tags: ['opportunity', 'growth-angle']
      };
    }

    return null;
  }

  /**
   * Extract warnings/cautions
   */
  static _extractWarning(content) {
    const warningPatterns = [
      /\b(warning|be careful|avoid|don't|risk|dangerous|failed|learned)\b/gi,
      /\b(mistake|error|bug|broken|issue|problem|failed)\b/gi,
      /⚠️|⛔|🚨/g,
    ];

    let confidence = 0;
    warningPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      confidence += matches.length;
    });

    if (confidence > 1) {
      return {
        type: 'warning',
        content: this._extractSentenceContaining(content, /\b(avoid|warning|don't|failed|learned)\b/i) || 'Potential warning/caution noted',
        tags: ['caution', 'learn-from-others']
      };
    }

    return null;
  }

  /**
   * Extract interesting patterns
   */
  static _extractInteresting(content) {
    const interestingPatterns = [
      /\b(interesting|fascinating|surprising|unexpected|novel|breakthrough|breakthrough|first|new)\b/gi,
      /\d+\s+(%|times?|x better|faster|cheaper)/gi,
      /\[interesting\]|\[wow\]|\[note\]/gi,
    ];

    let confidence = 0;
    interestingPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      confidence += matches.length;
    });

    if (confidence > 0) {
      return {
        type: 'interesting',
        content: 'Interesting finding or pattern identified',
        tags: ['interesting', 'awareness']
      };
    }

    return null;
  }

  /**
   * Extract reference material
   */
  static _extractReference(content) {
    // Check for academic/technical references
    const referencePatterns = [
      /\b(research|study|paper|whitepaper|documentation|tutorial|guide|explained)\b/gi,
      /\[link\]|\[resource\]|\[ref\]/gi,
    ];

    let confidence = 0;
    referencePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      confidence += matches.length;
    });

    if (confidence > 0) {
      return {
        type: 'reference',
        content: 'Reference material or documentation',
        tags: ['reference', 'learning']
      };
    }

    return null;
  }

  /**
   * Extract a sentence containing a specific pattern
   */
  static _extractSentenceContaining(text, pattern) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    for (const sentence of sentences) {
      if (pattern.test(sentence)) {
        return sentence.trim().substring(0, 200); // Limit to 200 chars
      }
    }
    return null;
  }

  /**
   * Extract insights from multiple bookmarks
   */
  static extractMany(bookmarks) {
    return bookmarks.map(bm => ({
      id: bm.id || `bm_${bm.tweet_id}`,
      insights: this.extract(bm)
    }));
  }

  /**
   * Get summary stats
   */
  static getStats(extractedInsights) {
    const stats = {
      total: extractedInsights.reduce((sum, item) => sum + item.insights.length, 0),
      byType: {}
    };

    extractedInsights.forEach(item => {
      item.insights.forEach(insight => {
        const type = insight.type;
        if (!stats.byType[type]) {
          stats.byType[type] = 0;
        }
        stats.byType[type]++;
      });
    });

    return stats;
  }
}

module.exports = { InsightExtractor };
