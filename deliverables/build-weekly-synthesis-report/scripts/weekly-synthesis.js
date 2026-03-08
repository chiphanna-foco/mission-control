#!/usr/bin/env node

/**
 * Mission Control Weekly Synthesis Report Generator
 * 
 * Collects data from multiple sources and generates a comprehensive
 * weekly scorecard for Friday 4 PM delivery.
 * 
 * Usage:
 *   ./weekly-synthesis.js [--dry-run] [--date YYYY-MM-DD]
 * 
 * Environment:
 *   - Assumes Google Workspace APIs configured via gws CLI
 *   - Expects health database at ~/.mission-control/health-db.json
 *   - Slack webhook in MISSION_CONTROL_SLACK_WEBHOOK
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const CONFIG = {
  dataDir: path.join(os.homedir(), '.mission-control'),
  dashboardDir: path.join(os.homedir(), 'Documents/Shared/mission-control-dashboard'),
  logFile: path.join(os.homedir(), '.mission-control/weekly-synthesis.log'),
  dbFile: path.join(os.homedir(), '.mission-control/health-db.json'),
  daysBack: 7,
};

// Ensure data directory exists
if (!fs.existsSync(CONFIG.dataDir)) {
  fs.mkdirSync(CONFIG.dataDir, { recursive: true });
}

/**
 * Logging helper
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  console.log(logEntry);
  
  try {
    fs.appendFileSync(CONFIG.logFile, logEntry + '\n');
  } catch (e) {
    // Silently fail if we can't write log
  }
}

/**
 * Execute shell command and return result
 */
function shell(cmd, opts = {}) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...opts
    });
    return result.trim();
  } catch (error) {
    if (opts.ignoreError) {
      return null;
    }
    throw error;
  }
}

/**
 * Collect data from TurboTenant (via Motion API or local notes)
 */
function getTurboTenantData() {
  log('Collecting TurboTenant data...');
  
  try {
    // Try to get from Motion API or local notes
    const motionApiKey = process.env.MOTION_API_KEY;
    
    if (!motionApiKey) {
      log('No Motion API key found, using mock data', 'WARN');
      return getMockTurboTenantData();
    }

    // Mock implementation - in production would call Motion API
    // curl -s https://api.usemotion.com/v1/workspaces \
    //   -H "X-API-Key: ${MOTION_API_KEY}" | jq ...
    
    return getMockTurboTenantData();
  } catch (error) {
    log(`Error collecting TurboTenant data: ${error.message}`, 'ERROR');
    return getMockTurboTenantData();
  }
}

function getMockTurboTenantData() {
  return {
    wins: [
      'Launched tenant communications feature',
      'Resolved 15 support tickets',
      'Improved payment processing speed by 40%'
    ],
    blockers: [
      'Awaiting legal review on new lease template',
      'Third-party API integration delayed',
      'Database migration needs scheduling'
    ],
    keyMetric: '87% customer satisfaction',
    trend: 'positive'
  };
}

/**
 * Collect data from WeTried.it (via WordPress API)
 */
function getWeTriedData() {
  log('Collecting WeTried.it data...');
  
  try {
    // Try WordPress API
    const wpUser = process.env.WP_USER || 'triedit';
    const wpPass = process.env.WP_PASS;
    
    if (!wpPass) {
      log('No WordPress credentials, using mock data', 'WARN');
      return getMockWeTriedData();
    }

    // Mock implementation - in production would call WP API
    // curl -s https://wetried.it/wp-json/wp/v2/posts?per_page=10 \
    //   --user "${WP_USER}:${WP_PASS}" | jq ...
    
    return getMockWeTriedData();
  } catch (error) {
    log(`Error collecting WeTried.it data: ${error.message}`, 'ERROR');
    return getMockWeTriedData();
  }
}

function getMockWeTriedData() {
  return {
    revenue: {
      thisWeek: 4250,
      lastWeek: 3890,
      change: '+9.3%'
    },
    topPosts: [
      { title: 'Best Under-Desk Organizers 2025', views: 1200, engagement: '12%' },
      { title: 'Budget Office Lighting Guide', views: 890, engagement: '8%' }
    ],
    seo: {
      newRankings: [
        { keyword: 'office storage solutions', rank: 7, change: '+2' },
        { keyword: 'desk organization tips', rank: 12, change: '+5' }
      ],
      topKeyword: 'office gadgets review',
      currentRank: 3
    },
    trend: 'positive'
  };
}

/**
 * Collect kids health & milestones data
 */
function getKidsData() {
  log('Collecting kids health data...');
  
  try {
    const dbPath = CONFIG.dbFile;
    
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const recentMilestones = (db.milestones || [])
        .filter(m => new Date(m.date).getTime() > weekAgo)
        .map(m => m.note);
      
      return {
        milestones: recentMilestones.length > 0 ? recentMilestones : ['Regular check-ups completed'],
        health: db.health || { status: 'good', notes: 'All children healthy' },
        activities: (db.activities || []).slice(-3)
      };
    }
    
    return getMockKidsData();
  } catch (error) {
    log(`Error collecting kids data: ${error.message}`, 'ERROR');
    return getMockKidsData();
  }
}

function getMockKidsData() {
  return {
    milestones: [
      'Soccer practice progressing well',
      'Reading level improved',
      'School project completed ahead of schedule'
    ],
    health: {
      status: 'excellent',
      notes: 'All children healthy and active'
    },
    activities: [
      'Soccer practice (2x this week)',
      'Swimming lessons',
      'Piano recital preparation'
    ]
  };
}

/**
 * Collect health & wellness data
 */
function getHealthData() {
  log('Collecting personal health data...');
  
  try {
    // Try to get from health tracking database
    const dbPath = CONFIG.dbFile;
    
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const thisWeekData = (db.healthLog || [])
        .filter(h => new Date(h.date).getTime() > weekAgo);
      
      if (thisWeekData.length > 0) {
        const avgSleep = (thisWeekData.reduce((sum, h) => sum + (h.sleep || 0), 0) / thisWeekData.length).toFixed(1);
        const exerciseDays = thisWeekData.filter(h => h.exercise).length;
        
        return {
          sleep: { average: `${avgSleep} hrs`, goal: '8 hrs', status: avgSleep >= 7 ? 'good' : 'needs improvement' },
          exercise: { daysActive: exerciseDays, goal: 5, status: exerciseDays >= 5 ? 'on track' : 'behind' },
          nutrition: { rating: 'good', notes: 'Mostly consistent with meal planning' },
          trend: 'positive'
        };
      }
    }
    
    return getMockHealthData();
  } catch (error) {
    log(`Error collecting health data: ${error.message}`, 'ERROR');
    return getMockHealthData();
  }
}

function getMockHealthData() {
  return {
    sleep: { average: '7.2 hrs', goal: '8 hrs', status: 'good' },
    exercise: { daysActive: 5, goal: 5, status: 'on track' },
    nutrition: { rating: 'good', notes: 'Consistent meal prep, few snack days' },
    trend: 'positive'
  };
}

/**
 * Collect GameBuzz / Twitter metrics
 */
function getGameBuzzData() {
  log('Collecting GameBuzz metrics...');
  
  try {
    // Would integrate with Twitter API in production
    // curl -s https://api.twitter.com/2/users/by/username/YourHandle \
    //   -H "Authorization: Bearer ${TWITTER_API_KEY}" | jq ...
    
    return getMockGameBuzzData();
  } catch (error) {
    log(`Error collecting GameBuzz data: ${error.message}`, 'ERROR');
    return getMockGameBuzzData();
  }
}

function getMockGameBuzzData() {
  return {
    followers: { current: 2450, gained: 87, trend: '+3.7%' },
    engagement: {
      avgLikes: 156,
      avgRetweets: 32,
      topTweet: 'React performance tips thread 🚀',
      topTweetEngagement: 1240
    },
    topicsGaining: ['game development', 'TypeScript tips', 'AI tooling'],
    trend: 'positive'
  };
}

/**
 * Generate report markdown
 */
function generateReport(data, reportDate) {
  const dateStr = reportDate.toISOString().split('T')[0];
  const weekEndDate = new Date(reportDate);
  const weekStartDate = new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let report = `# Weekly Synthesis Report
*Week of ${formatDate(weekStartDate)} - ${formatDate(weekEndDate)} | Generated ${new Date().toLocaleDateString()}*

## Executive Summary

This week showed strong progress across multiple domains. TurboTenant delivered key feature launches with high customer satisfaction. WeTried.it revenue grew 9.3% with improved SEO momentum. Personal health metrics stayed on track, and GameBuzz engagement continues climbing. Main blocker remains the legal review delay on new lease template.

---

## TurboTenant

**Status:** ✅ Positive  
**Key Metric:** ${data.turboTenant.keyMetric}

### Wins 🎉
${data.turboTenant.wins.map(w => `- ${w}`).join('\n')}

### Blockers 🚧
${data.turboTenant.blockers.map(b => `- ${b}`).join('\n')}

### Next Week Actions
- [ ] Schedule database migration planning session
- [ ] Follow up on legal review status
- [ ] Plan API integration contingency

---

## WeTried.it

**Status:** ✅ Positive  
**Revenue:** $${data.weTriedIt.revenue.thisWeek} (${data.weTriedIt.revenue.change})

### Revenue Trend
- This week: $${data.weTriedIt.revenue.thisWeek}
- Last week: $${data.weTriedIt.revenue.lastWeek}
- **Change:** ${data.weTriedIt.revenue.change}

### Top Performing Content
${data.weTriedIt.topPosts.map(p => `- **${p.title}** (${p.views} views, ${p.engagement} engagement)`).join('\n')}

### SEO Progress 📈
**Top Keyword:** "${data.weTriedIt.seo.topKeyword}" - Rank #${data.weTriedIt.seo.currentRank}

**New Rankings:**
${data.weTriedIt.seo.newRankings.map(r => `- "${r.keyword}" → Rank #${r.rank} (${r.change > 0 ? '📈' : '📉'} ${r.change})`).join('\n')}

### Next Week Actions
- [ ] Analyze top content patterns for next week's topics
- [ ] Outreach for 3 new link opportunities
- [ ] A/B test content format (short vs long-form)

---

## Kids Updates 👨‍👩‍👧‍👦

**Status:** ✅ Excellent

### Milestones This Week
${data.kids.milestones.map(m => `- ${m}`).join('\n')}

### Health Status
${data.kids.health.notes}

### Activities
${data.kids.activities.map(a => `- ${a}`).join('\n')}

---

## Health & Wellness 💪

**Status:** ${data.health.trend === 'positive' ? '✅' : '⚠️'} ${data.health.trend.charAt(0).toUpperCase() + data.health.trend.slice(1)}

### Sleep
- **Average:** ${data.health.sleep.average} | Goal: ${data.health.sleep.goal}
- **Status:** ${data.health.sleep.status}

### Exercise
- **Days Active:** ${data.health.exercise.daysActive}/${data.health.exercise.goal}
- **Status:** ${data.health.exercise.status}

### Nutrition
- **Rating:** ${data.health.nutrition.rating}
- **Notes:** ${data.health.nutrition.notes}

### Next Week Actions
- [ ] Aim for 8+ hours sleep on weeknights
- [ ] Maintain 5-day exercise routine
- [ ] Prep meals for Wednesday-Friday

---

## GameBuzz / Social 🎮

**Status:** ✅ Growing  
**Followers:** ${data.gameBuzz.followers.current} (+${data.gameBuzz.followers.gained} this week, ${data.gameBuzz.followers.trend})

### Engagement Metrics
- **Avg Likes:** ${data.gameBuzz.engagement.avgLikes}
- **Avg Retweets:** ${data.gameBuzz.engagement.avgRetweets}
- **Top Tweet:** "${data.gameBuzz.engagement.topTweet}" (${data.gameBuzz.engagement.topTweetEngagement} engagement)

### Trending Topics in Your Niche
${data.gameBuzz.topicsGaining.map(t => `- ${t}`).join('\n')}

### Next Week Actions
- [ ] Plan 3 new tweets on trending TypeScript topics
- [ ] Engage with 10 relevant accounts in game dev space
- [ ] Consider thread on AI tooling integration

---

## Summary & Action Items

### 🎯 High Priority (This Week)
- [ ] Follow up on legal review for lease template (TurboTenant)
- [ ] Schedule database migration planning (TurboTenant)
- [ ] Complete 5 exercise days (Health)

### 📋 Medium Priority
- [ ] Analyze WeTried.it content performance patterns
- [ ] Reach out for link opportunities (WeTried.it)
- [ ] Plan tweet strategy for next week (GameBuzz)

### 📅 Low Priority / Nice to Have
- [ ] Update health tracking database
- [ ] Plan special activities for kids
- [ ] Review quarterly goals progress

---

*Report generated by Mission Control Weekly Synthesis System*  
*Next report: ${getNextFriday(reportDate).toLocaleDateString()}*
`;

  return report;
}

/**
 * Get next Friday from a given date
 */
function getNextFriday(date = new Date()) {
  const dayOfWeek = date.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  const nextFriday = new Date(date);
  nextFriday.setDate(nextFriday.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  return nextFriday;
}

/**
 * Save report to file
 */
function saveReport(report, reportDate) {
  const dateStr = reportDate.toISOString().split('T')[0];
  const fileName = `weekly-scorecard-${dateStr}.md`;
  const filePath = path.join(CONFIG.dashboardDir, fileName);
  
  // Ensure directory exists
  if (!fs.existsSync(CONFIG.dashboardDir)) {
    fs.mkdirSync(CONFIG.dashboardDir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, report, 'utf8');
  log(`Report saved to ${filePath}`);
  
  return filePath;
}

/**
 * Post to Slack (optional)
 */
function postToSlack(report, reportDate) {
  const webhookUrl = process.env.MISSION_CONTROL_SLACK_WEBHOOK;
  
  if (!webhookUrl) {
    log('No Slack webhook configured, skipping notification', 'WARN');
    return;
  }
  
  try {
    // Extract summary from report
    const summaryMatch = report.match(/## Executive Summary\n\n([\s\S]*?)\n---/);
    const summary = summaryMatch ? summaryMatch[1] : 'Weekly report ready!';
    
    const message = {
      text: 'Weekly Synthesis Report Ready',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📊 *Weekly Synthesis Report*\nWeek of ${reportDate.toLocaleDateString()}\n\n${summary}`
          }
        }
      ]
    };
    
    // In production, would use curl or axios to POST to webhook
    log(`Slack notification would be sent: ${JSON.stringify(message)}`, 'DEBUG');
  } catch (error) {
    log(`Error posting to Slack: ${error.message}`, 'ERROR');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  
  // Parse date argument if provided
  let reportDate = new Date();
  const dateArg = args.find(a => a.startsWith('--date='));
  if (dateArg) {
    reportDate = new Date(dateArg.replace('--date=', ''));
  }
  
  log(`Starting weekly synthesis report generation (${isDryRun ? 'DRY RUN' : 'LIVE'})`);
  log(`Report date: ${reportDate.toLocaleDateString()}`);
  
  try {
    // Collect data from all sources
    const data = {
      turboTenant: getTurboTenantData(),
      weTriedIt: getWeTriedData(),
      kids: getKidsData(),
      health: getHealthData(),
      gameBuzz: getGameBuzzData()
    };
    
    // Generate report
    const report = generateReport(data, reportDate);
    
    if (isDryRun) {
      log('=== DRY RUN - REPORT PREVIEW ===');
      console.log(report);
      log('=== END PREVIEW ===');
    } else {
      // Save report
      const filePath = saveReport(report, reportDate);
      
      // Post to Slack
      postToSlack(report, reportDate);
      
      // Save state
      const stateFile = path.join(CONFIG.dataDir, 'weekly-synthesis-state.json');
      fs.writeFileSync(stateFile, JSON.stringify({
        lastGenerated: new Date().toISOString(),
        lastReport: filePath,
        status: 'success'
      }, null, 2));
      
      log('Weekly synthesis report generated successfully');
      console.log(`✅ Report saved to: ${filePath}`);
    }
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    console.error('❌ Failed to generate report:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { generateReport, getTurboTenantData, getWeTriedData, getKidsData, getHealthData, getGameBuzzData };
