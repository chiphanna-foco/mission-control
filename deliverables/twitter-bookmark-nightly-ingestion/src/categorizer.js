/**
 * Bookmark Categorizer
 * 
 * Categorizes bookmarks by topic based on content analysis.
 * Categories: AI, business, tech, health, sports, finance, marketing, content-strategy, self-improvement, tools
 */

const CATEGORIES = {
  'AI': {
    keywords: ['AI', 'LLM', 'Claude', 'GPT', 'machine learning', 'neural', 'transformer', 'agent', 'autonomous', 'model', 'prompt', 'training', 'fine-tune', 'embedding'],
    patterns: [/\b(AI|artificial intelligence|LLM|language model|machine learning|neural|deep learning|transformer|agent|prompt engineering)\b/gi],
    weight: 1.0
  },
  'Business': {
    keywords: ['business', 'startup', 'founder', 'company', 'revenue', 'growth', 'market', 'strategy', 'B2B', 'B2C', 'SaaS', 'acquisition', 'exit', 'valuation', 'pitch'],
    patterns: [/\b(business|startup|founder|company|revenue|growth|market fit|B2B|B2C|SaaS|acquisition)\b/gi],
    weight: 1.0
  },
  'Tech': {
    keywords: ['tech', 'developer', 'code', 'api', 'framework', 'library', 'deployment', 'infrastructure', 'cloud', 'database', 'architecture', 'programming', 'javascript', 'python', 'rust'],
    patterns: [/\b(tech|developer|code|API|framework|library|deployment|infrastructure|cloud|docker|kubernetes|database|programming|javascript|python)\b/gi],
    weight: 1.0
  },
  'Health': {
    keywords: ['health', 'fitness', 'wellness', 'exercise', 'diet', 'nutrition', 'sleep', 'mental', 'meditation', 'yoga', 'disease', 'medical', 'doctor', 'treatment'],
    patterns: [/\b(health|fitness|wellness|exercise|diet|nutrition|sleep|mental health|meditation|yoga|disease|medical|treatment)\b/gi],
    weight: 1.0
  },
  'Sports': {
    keywords: ['sports', 'football', 'basketball', 'baseball', 'soccer', 'game', 'team', 'player', 'coach', 'championship', 'olympic', 'nfl', 'nba', 'nhl', 'mlb'],
    patterns: [/\b(sports|football|basketball|baseball|soccer|game|team|player|coach|championship|NFL|NBA|NHL|MLB)\b/gi],
    weight: 1.0
  },
  'Finance': {
    keywords: ['finance', 'investing', 'stock', 'crypto', 'bitcoin', 'ethereum', 'trading', 'portfolio', 'wealth', 'money', 'bank', 'interest', 'return', 'dividend'],
    patterns: [/\b(finance|investing|stock|crypto|bitcoin|ethereum|trading|portfolio|wealth|bank|interest|dividend)\b/gi],
    weight: 1.0
  },
  'Marketing': {
    keywords: ['marketing', 'social', 'twitter', 'content', 'engagement', 'audience', 'brand', 'campaign', 'advertising', 'growth', 'viral', 'SEO', 'conversion'],
    patterns: [/\b(marketing|social media|content|engagement|audience|brand|campaign|advertising|viral|SEO|conversion|social growth)\b/gi],
    weight: 1.0
  },
  'Content Strategy': {
    keywords: ['content', 'writing', 'blog', 'article', 'video', 'newsletter', 'podcast', 'creator', 'distribution', 'audience', 'storytelling', 'production'],
    patterns: [/\b(content|writing|blog|article|video|newsletter|podcast|creator|storytelling|production|distribution)\b/gi],
    weight: 1.0
  },
  'Self-Improvement': {
    keywords: ['learning', 'growth', 'productivity', 'habits', 'discipline', 'goal', 'motivation', 'success', 'mindset', 'improvement', 'development', 'skill'],
    patterns: [/\b(learning|growth|productivity|habits|discipline|goal|motivation|success|mindset|improvement|skill development)\b/gi],
    weight: 1.0
  },
  'Tools': {
    keywords: ['tool', 'software', 'app', 'platform', 'service', 'integration', 'automation', 'workflow', 'plugin', 'extension', 'open source'],
    patterns: [/\b(tool|software|app|platform|service|integration|automation|workflow|plugin|extension|open source)\b/gi],
    weight: 1.0
  }
};

class Categorizer {
  /**
   * Categorize a single bookmark
   * Returns array of {category, confidence} objects
   */
  static categorize(bookmark) {
    const text = this._prepareText(bookmark.content, bookmark.author_name || '', bookmark.author_handle || '');
    const scores = {};

    // Initialize scores
    Object.keys(CATEGORIES).forEach(cat => {
      scores[cat] = 0;
    });

    // Score each category
    Object.entries(CATEGORIES).forEach(([category, config]) => {
      let score = 0;

      // Check keyword matches
      config.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = text.match(regex) || [];
        score += matches.length * 0.2;
      });

      // Check pattern matches
      config.patterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        score += matches.length * 0.3;
      });

      scores[category] = Math.min(score * config.weight, 1.0);
    });

    // Return categories with confidence > threshold, sorted by confidence
    const threshold = 0.25;
    const categories = Object.entries(scores)
      .filter(([_, confidence]) => confidence > threshold)
      .map(([category, confidence]) => ({
        category,
        confidence: parseFloat(confidence.toFixed(2))
      }))
      .sort((a, b) => b.confidence - a.confidence);

    // Ensure at least one category
    if (categories.length === 0) {
      categories.push({ category: 'General', confidence: 0.5 });
    }

    return categories;
  }

  /**
   * Categorize multiple bookmarks
   */
  static categorizeMany(bookmarks) {
    return bookmarks.map(bm => ({
      id: bm.id || `bm_${bm.tweet_id}`,
      categories: this.categorize(bm)
    }));
  }

  /**
   * Prepare text for analysis
   */
  static _prepareText(...parts) {
    return parts
      .filter(p => p)
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get category stats
   */
  static getStats(categorizedBookmarks) {
    const stats = {};

    categorizedBookmarks.forEach(item => {
      item.categories.forEach(cat => {
        if (!stats[cat.category]) {
          stats[cat.category] = {
            count: 0,
            avgConfidence: 0,
            total: 0
          };
        }
        stats[cat.category].count++;
        stats[cat.category].total += cat.confidence;
      });
    });

    // Calculate averages
    Object.keys(stats).forEach(cat => {
      stats[cat].avgConfidence = (stats[cat].total / stats[cat].count).toFixed(2);
    });

    return stats;
  }
}

module.exports = { Categorizer };
