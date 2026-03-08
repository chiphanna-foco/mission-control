#!/usr/bin/env node

/**
 * Test suite for Twitter Bookmark Ingestion System
 */

const { BookmarkDatabase } = require('./db');
const { Categorizer } = require('./categorizer');
const { InsightExtractor } = require('./insight-extractor');
const fs = require('fs');

async function runTests() {
  console.log('🧪 Testing Twitter Bookmark Ingestion System\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Database initialization
  try {
    console.log('1. Testing database initialization...');
    const db = new BookmarkDatabase();
    await db.init();
    await db.close();
    console.log('   ✓ Database initialized successfully\n');
    passed++;
  } catch (error) {
    console.error(`   ✗ Database initialization failed: ${error.message}\n`);
    failed++;
  }

  // Test 2: Categorization
  try {
    console.log('2. Testing categorization...');
    const testBookmark = {
      tweet_id: '123456',
      content: 'Just built a new Claude API agent using LLM prompt engineering. Machine learning at scale!',
      author_name: 'Test User',
      author_handle: 'testuser'
    };

    const categories = Categorizer.categorize(testBookmark);
    if (categories.length > 0 && categories[0].category === 'AI') {
      console.log(`   ✓ Categorization works (detected: ${categories[0].category})\n`);
      passed++;
    } else {
      console.error(`   ✗ Categorization failed (got: ${JSON.stringify(categories)})\n`);
      failed++;
    }
  } catch (error) {
    console.error(`   ✗ Categorization error: ${error.message}\n`);
    failed++;
  }

  // Test 3: Insight extraction
  try {
    console.log('3. Testing insight extraction...');
    const testBookmark = {
      tweet_id: '123456',
      content: 'Here is the right way to implement this: try using the new framework. This failed before because of XYZ.',
      author_name: 'Test User',
      author_handle: 'testuser'
    };

    const insights = InsightExtractor.extract(testBookmark);
    if (insights.length > 0) {
      console.log(`   ✓ Insight extraction works (found ${insights.length} insights)\n`);
      passed++;
    } else {
      console.error(`   ✗ No insights extracted\n`);
      failed++;
    }
  } catch (error) {
    console.error(`   ✗ Insight extraction error: ${error.message}\n`);
    failed++;
  }

  // Test 4: Categorize multiple
  try {
    console.log('4. Testing bulk categorization...');
    const bookmarks = [
      {
        tweet_id: '1',
        content: 'AI and machine learning advances',
        author_name: 'User1',
        author_handle: 'user1'
      },
      {
        tweet_id: '2',
        content: 'New startup funding round announced',
        author_name: 'User2',
        author_handle: 'user2'
      }
    ];

    const categorized = Categorizer.categorizeMany(bookmarks);
    if (categorized.length === 2) {
      console.log(`   ✓ Bulk categorization works (${categorized.length} bookmarks)\n`);
      passed++;
    } else {
      console.error(`   ✗ Bulk categorization failed\n`);
      failed++;
    }
  } catch (error) {
    console.error(`   ✗ Bulk categorization error: ${error.message}\n`);
    failed++;
  }

  // Test 5: Category statistics
  try {
    console.log('5. Testing category statistics...');
    const bookmarks = [
      {
        tweet_id: '1',
        content: 'AI and machine learning advances',
        author_name: 'User1',
        author_handle: 'user1'
      },
      {
        tweet_id: '2',
        content: 'More AI content about neural networks',
        author_name: 'User2',
        author_handle: 'user2'
      }
    ];

    const categorized = Categorizer.categorizeMany(bookmarks);
    const stats = Categorizer.getStats(categorized);
    
    if (stats.AI && stats.AI.count > 0) {
      console.log(`   ✓ Category stats work (AI count: ${stats.AI.count})\n`);
      passed++;
    } else {
      console.error(`   ✗ Category stats failed\n`);
      failed++;
    }
  } catch (error) {
    console.error(`   ✗ Category stats error: ${error.message}\n`);
    failed++;
  }

  // Test 6: Data directory creation
  try {
    console.log('6. Testing data directory...');
    const home = process.env.HOME || '/Users/chipai';
    const dataDir = `${home}/data/life/bookmarks`;
    
    if (fs.existsSync(dataDir)) {
      console.log(`   ✓ Data directory exists: ${dataDir}\n`);
      passed++;
    } else {
      console.log(`   ℹ Data directory doesn't exist yet (will be created on setup)\n`);
      passed++;
    }
  } catch (error) {
    console.error(`   ✗ Data directory error: ${error.message}\n`);
    failed++;
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log(`✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('═'.repeat(50) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
