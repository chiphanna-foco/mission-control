#!/usr/bin/env node

/**
 * Extraction Engine Tests
 * Tests pattern recognition and action item extraction
 */

import { ExtractorEngine } from '../src/engine.js';
import * as patterns from '../src/patterns.js';
import chalk from 'chalk';

const engine = new ExtractorEngine();

const testCases = [
  {
    name: 'Time-bound commitment',
    transcript: "I'll send the proposal by Friday.",
    expectedCount: 1,
    expectedTitle: /send/i
  },
  {
    name: 'Assignment with deadline',
    transcript: 'John needs to review the design by Tuesday.',
    expectedCount: 1,
    expectedTitle: /review/i
  },
  {
    name: 'Follow-up action',
    transcript: 'Follow up with Sarah on the budget next week.',
    expectedCount: 1,
    expectedTitle: /follow/i
  },
  {
    name: 'Direct action item',
    transcript: 'Action item: Schedule the team meeting.',
    expectedCount: 1,
    expectedTitle: /schedule/i
  },
  {
    name: 'Multiple items',
    transcript: `
      I'll send the proposal by Friday. 
      John needs to review the architecture by Tuesday.
      Follow up with Sarah on the metrics.
    `,
    expectedCount: 3
  },
  {
    name: 'Urgent with keywords',
    transcript: 'URGENT: We need to ship the hotfix today. It\'s blocking production.',
    expectedCount: 1,
    expectedPriority: 'High'
  },
  {
    name: 'Discussion item',
    transcript: 'We should update the documentation.',
    expectedCount: 1,
    expectedPriority: /Low|Medium/
  },
  {
    name: 'Approval needed',
    transcript: 'Need approval from Chip on the contract by Friday.',
    expectedCount: 1,
    expectedTitle: /approval/i
  },
  {
    name: 'Conditional commitment',
    transcript: 'Once we get the data, we\'ll run the analysis.',
    expectedCount: 1,
    expectedTitle: /analysis/i
  }
];

async function runTests() {
  console.log(chalk.blue.bold('\n🧪 Extraction Engine Tests\n'));

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    try {
      const items = await engine.extract(test.transcript);

      let testPassed = true;
      const errors = [];

      // Check count
      if (test.expectedCount && items.length !== test.expectedCount) {
        testPassed = false;
        errors.push(`Expected ${test.expectedCount} items, got ${items.length}`);
      }

      // Check title pattern
      if (test.expectedTitle && items.length > 0) {
        if (!test.expectedTitle.test(items[0].title)) {
          testPassed = false;
          errors.push(`Title "${items[0].title}" doesn't match expected pattern`);
        }
      }

      // Check priority
      if (test.expectedPriority && items.length > 0) {
        const priorityRegex = typeof test.expectedPriority === 'string' 
          ? test.expectedPriority 
          : test.expectedPriority;
        
        if (typeof priorityRegex === 'string' && items[0].priority !== priorityRegex) {
          testPassed = false;
          errors.push(`Expected priority ${priorityRegex}, got ${items[0].priority}`);
        } else if (priorityRegex instanceof RegExp && !priorityRegex.test(items[0].priority)) {
          testPassed = false;
          errors.push(`Priority ${items[0].priority} doesn't match expected pattern`);
        }
      }

      if (testPassed) {
        console.log(chalk.green(`✅ ${test.name}`));
        passed++;
      } else {
        console.log(chalk.red(`❌ ${test.name}`));
        errors.forEach(e => console.log(chalk.red(`   • ${e}`)));
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name} - ${error.message}`));
      failed++;
    }
  }

  // Summary
  console.log(chalk.bold(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length}`));

  if (failed === 0) {
    console.log(chalk.green.bold('\n✅ All tests passed!\n'));
    process.exit(0);
  } else {
    console.log(chalk.red.bold(`\n❌ ${failed} test(s) failed\n`));
    process.exit(1);
  }
}

// Pattern library tests
function testPatterns() {
  console.log(chalk.blue.bold('\n📚 Pattern Library Tests\n'));

  const stats = patterns.getPatternStats();
  console.log(chalk.cyan(`Total patterns: ${stats.totalPatterns}`));
  
  for (const p of stats.patterns) {
    console.log(chalk.gray(`  • ${p.name}: ${p.examples} examples`));
  }

  console.log();
}

// Run all tests
async function main() {
  testPatterns();
  await runTests();
}

main().catch(console.error);
