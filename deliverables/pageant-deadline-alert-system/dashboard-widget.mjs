/**
 * Dashboard Widget Integration
 * 
 * This module provides data for the Mission Control dashboard
 * to display upcoming pageant deadlines with alert status.
 * 
 * Integration point: Mission Control /api/dashboard/pageant-alerts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALERTS_FILE = path.join(__dirname, 'alerts.json');

export function loadAlerts() {
  try {
    const data = fs.readFileSync(ALERTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { pageants: [] };
  }
}

export function daysUntilDeadline(deadline) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getAlertStatus(pageant) {
  const daysRemaining = daysUntilDeadline(pageant.deadline);
  
  if (daysRemaining <= 0) return 'expired';
  if (daysRemaining <= 1) return 'urgent';
  if (daysRemaining <= 7) return 'soon';
  return 'upcoming';
}

export function getRequirementsSummary(pageant) {
  const summary = [];
  
  if (pageant.requirements.photos.needed) {
    summary.push({
      type: 'photos',
      label: 'Photos',
      required: pageant.requirements.photos.count,
      submitted: pageant.requirements.photos.submitted,
      icon: '📸'
    });
  }
  
  if (pageant.requirements.forms.needed) {
    summary.push({
      type: 'forms',
      label: 'Forms',
      required: pageant.requirements.forms.list.length,
      submitted: pageant.requirements.forms.submitted,
      icon: '📋',
      items: pageant.requirements.forms.list
    });
  }
  
  if (pageant.requirements.payment.needed) {
    summary.push({
      type: 'payment',
      label: 'Payment',
      required: `$${pageant.requirements.payment.amount}`,
      submitted: pageant.requirements.payment.submitted,
      icon: '💰'
    });
  }
  
  return summary;
}

/**
 * Generate dashboard widget data
 */
export function getDashboardWidget() {
  const alerts = loadAlerts();
  
  const upcoming = alerts.pageants
    .map(pageant => {
      const daysRemaining = daysUntilDeadline(pageant.deadline);
      const status = getAlertStatus(pageant);
      const requirements = getRequirementsSummary(pageant);
      
      return {
        id: pageant.id,
        name: pageant.name,
        deadline: pageant.deadline,
        daysRemaining,
        status,
        urgency: daysRemaining <= 1 ? 'critical' : daysRemaining <= 7 ? 'high' : 'normal',
        requirements,
        alertsSent: {
          sevenDay: pageant.notifications.sent_7_days,
          oneDay: pageant.notifications.sent_1_day
        },
        nextDeadlineItem: getNextDeadlineItem(pageant)
      };
    })
    .filter(p => p.daysRemaining > -3) // Show for 3 days after deadline (for reference)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
  
  return {
    title: 'Pageant Deadlines',
    subtitle: `${upcoming.length} upcoming competitions`,
    upcoming,
    summary: {
      total: alerts.pageants.length,
      urgent: upcoming.filter(p => p.urgency === 'critical').length,
      upcoming30days: upcoming.filter(p => p.daysRemaining <= 30).length
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Find the next item that needs attention
 */
function getNextDeadlineItem(pageant) {
  const requirements = [];
  
  if (!pageant.requirements.photos.submitted && pageant.requirements.photos.needed) {
    requirements.push({
      item: 'photos',
      dueDate: pageant.requirements.photos.dueDate,
      daysUntil: daysUntilDeadline(pageant.requirements.photos.dueDate)
    });
  }
  
  if (!pageant.requirements.forms.submitted && pageant.requirements.forms.needed) {
    requirements.push({
      item: 'forms',
      dueDate: pageant.requirements.forms.dueDate,
      daysUntil: daysUntilDeadline(pageant.requirements.forms.dueDate)
    });
  }
  
  if (!pageant.requirements.payment.submitted && pageant.requirements.payment.needed) {
    requirements.push({
      item: 'payment',
      dueDate: pageant.requirements.payment.dueDate,
      daysUntil: daysUntilDeadline(pageant.requirements.payment.dueDate)
    });
  }
  
  // Return soonest deadline
  return requirements.sort((a, b) => a.daysUntil - b.daysUntil)[0] || null;
}

/**
 * Format for API response
 */
export function formatAPIResponse() {
  const widget = getDashboardWidget();
  return {
    status: 'ok',
    data: widget,
    timestamp: new Date().toISOString()
  };
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(getDashboardWidget(), null, 2));
}
