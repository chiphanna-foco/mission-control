#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALERTS_FILE = path.join(__dirname, 'alerts.json');
const SLACK_CONFIG_FILE = path.join(__dirname, 'slack-config.json');

// ============================================================================
// CORE ALERT ENGINE
// ============================================================================

class PageantAlertEngine {
  constructor() {
    this.alerts = this.loadAlerts();
    this.slackConfig = this.loadSlackConfig();
  }

  loadAlerts() {
    try {
      const data = fs.readFileSync(ALERTS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load alerts.json:', error.message);
      return { pageants: [] };
    }
  }

  loadSlackConfig() {
    try {
      const data = fs.readFileSync(SLACK_CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load slack-config.json:', error.message);
      return { channel_webhook: null, dm_webhook: null };
    }
  }

  /**
   * Calculate days remaining until deadline
   */
  daysUntilDeadline(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Format deadline and requirements for Slack
   */
  formatDeadlineMessage(pageant, daysRemaining) {
    const deadline = new Date(pageant.deadline).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const requirements = [];
    if (pageant.requirements.photos.needed && !pageant.requirements.photos.submitted) {
      requirements.push(`📸 Photos: ${pageant.requirements.photos.count} photos needed (${pageant.requirements.photos.specs})`);
    }
    if (pageant.requirements.forms.needed && !pageant.requirements.forms.submitted) {
      requirements.push(`📋 Forms: ${pageant.requirements.forms.list.join(', ')}`);
    }
    if (pageant.requirements.payment.needed && !pageant.requirements.payment.submitted) {
      requirements.push(`💰 Payment: $${pageant.requirements.payment.amount} required`);
    }

    const requirementsList = requirements.length > 0 
      ? '\n' + requirements.join('\n')
      : '\n✅ All items submitted!';

    return {
      deadline,
      daysRemaining,
      requirementsList,
      urgency: daysRemaining <= 1 ? '🚨' : '⏰'
    };
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(webhook, message) {
    if (!webhook) {
      console.warn('⚠️  Slack webhook not configured. Would send:', message);
      return false;
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify(message);
      const url = new URL(webhook);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('✅ Slack notification sent');
            resolve(true);
          } else {
            console.error(`❌ Slack error (${res.statusCode}):`, data);
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.error('❌ Slack connection error:', err.message);
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Generate Slack message for 7-day alert
   */
  generateChannelAlert(pageant, formatted) {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${formatted.urgency} *${pageant.name}* – Deadline in ${formatted.daysRemaining} days\n\n*Deadline:* ${formatted.deadline}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Required Items:*${formatted.requirementsList}`
          }
        },
        {
          type: 'divider'
        }
      ]
    };
  }

  /**
   * Generate Slack message for 1-day urgent alert
   */
  generateUrgentDM(pageant, formatted) {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚨 *URGENT: ${pageant.name}*\n\n*Deadline TOMORROW at 11:59 PM*\n${formatted.deadline}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*MUST SUBMIT TODAY:*${formatted.requirementsList}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📞 If you need help, reach out immediately!'
          }
        }
      ]
    };
  }

  /**
   * Check all deadlines and send alerts
   */
  async checkDeadlines() {
    console.log('\n🔍 Checking pageant deadlines...\n');
    
    for (const pageant of this.alerts.pageants) {
      const daysRemaining = this.daysUntilDeadline(pageant.deadline);
      const formatted = this.formatDeadlineMessage(pageant, daysRemaining);

      console.log(`📌 ${pageant.name}: ${daysRemaining} days remaining`);

      // 7-day alert
      if (daysRemaining === 7 && !pageant.notifications.sent_7_days) {
        console.log(`   → Sending 7-day channel alert...`);
        const message = this.generateChannelAlert(pageant, formatted);
        await this.sendSlackNotification(this.slackConfig.channel_webhook, message);
        pageant.notifications.sent_7_days = true;
        pageant.notifications.sent_7_days_date = new Date().toISOString();
      }

      // 1-day alert
      if (daysRemaining === 1 && !pageant.notifications.sent_1_day) {
        console.log(`   → Sending 1-day urgent DM...`);
        const message = this.generateUrgentDM(pageant, formatted);
        await this.sendSlackNotification(this.slackConfig.dm_webhook, message);
        pageant.notifications.sent_1_day = true;
        pageant.notifications.sent_1_day_date = new Date().toISOString();
      }

      // Day-of alert (1 hour before)
      if (daysRemaining === 0) {
        const now = new Date();
        const deadline = new Date(pageant.deadline);
        const msUntil = deadline - now;
        const hoursUntil = msUntil / (1000 * 60 * 60);
        
        if (hoursUntil <= 1 && hoursUntil > 0) {
          console.log(`   → LAST HOUR WARNING!`);
          const message = {
            text: `⏰ FINAL HOUR: ${pageant.name} deadline is in less than 1 hour!`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `⏰ *FINAL HOUR WARNING*\n\n${pageant.name} closes at ${deadline.toLocaleTimeString()}\n\n${formatted.requirementsList}`
                }
              }
            ]
          };
          await this.sendSlackNotification(this.slackConfig.dm_webhook, message);
        }
      }
    }

    // Save updated state
    this.saveAlerts();
    console.log('\n✅ Deadline check complete\n');
  }

  /**
   * Save alert state back to file
   */
  saveAlerts() {
    try {
      fs.writeFileSync(ALERTS_FILE, JSON.stringify(this.alerts, null, 2));
      console.log('💾 Alert state saved');
    } catch (error) {
      console.error('Failed to save alerts:', error.message);
    }
  }

  /**
   * Get upcoming deadlines (for dashboard)
   */
  getUpcomingDeadlines(daysAhead = 30) {
    return this.alerts.pageants
      .map(p => ({
        ...p,
        daysRemaining: this.daysUntilDeadline(p.deadline),
        nextAlertType: this.getNextAlertType(p)
      }))
      .filter(p => p.daysRemaining <= daysAhead && p.daysRemaining > 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Determine next alert type
   */
  getNextAlertType(pageant) {
    if (!pageant.notifications.sent_7_days) return '7-day';
    if (!pageant.notifications.sent_1_day) return '1-day';
    return 'day-of';
  }
}

// ============================================================================
// CLI
// ============================================================================

const engine = new PageantAlertEngine();

const command = process.argv[2];

if (command === '--check') {
  engine.checkDeadlines().catch(console.error);
} else if (command === '--list') {
  console.log('\n📅 Upcoming Pageants (Next 30 days):\n');
  const upcoming = engine.getUpcomingDeadlines(30);
  upcoming.forEach(p => {
    console.log(`  ${p.name}`);
    console.log(`    Deadline: ${new Date(p.deadline).toLocaleDateString()}`);
    console.log(`    Days remaining: ${p.daysRemaining}`);
    console.log(`    Next alert: ${p.nextAlertType}`);
    console.log('');
  });
} else if (command === '--status') {
  console.log('\n📊 Alert System Status:\n');
  engine.alerts.pageants.forEach(p => {
    const days = engine.daysUntilDeadline(p.deadline);
    console.log(`  ${p.name}`);
    console.log(`    Status: ${days <= 0 ? '❌ PASSED' : `⏰ ${days} days`}`);
    console.log(`    7-day alert sent: ${p.notifications.sent_7_days ? '✅' : '⏳'}`);
    console.log(`    1-day alert sent: ${p.notifications.sent_1_day ? '✅' : '⏳'}`);
    console.log('');
  });
} else {
  console.log(`
Pageant Deadline Alert Engine

Usage:
  node alert-engine.mjs --check     Check deadlines and send alerts
  node alert-engine.mjs --list      List upcoming pageants
  node alert-engine.mjs --status    Show alert status
  `);
}
