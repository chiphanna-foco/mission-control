/**
 * Date Parser for Action Items
 * 
 * Handles both explicit and relative date parsing
 * - "2026-03-14" → specific date
 * - "Friday" → next Friday
 * - "End of month" → last day of current month
 * - "Next week" → start of next week (Monday)
 * - "In 3 days" → today + 3 days
 */

import { 
  parse, parseISO, addDays, startOfWeek, endOfWeek, 
  endOfMonth, startOfMonth, addWeeks, addMonths,
  isDate, isFuture, isPast
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 
                     'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * Main date parsing function
 * @param {string} dateStr - Date string to parse
 * @param {object} options - { baseDate, timezone, parseRelative }
 * @returns {Date|null} Parsed date or null if unable to parse
 */
export function parseDate(dateStr, options = {}) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const {
    baseDate = new Date(),
    timezone = 'America/Denver',
    parseRelative = true
  } = options;

  const cleaned = dateStr.trim().toLowerCase();

  // Try explicit date formats first
  const explicit = tryExplicitDates(cleaned, baseDate, timezone);
  if (explicit) return explicit;

  // Try relative dates
  if (parseRelative) {
    const relative = tryRelativeDates(cleaned, baseDate, timezone);
    if (relative) return relative;
  }

  return null;
}

/**
 * Try to parse explicit date formats
 * @private
 */
function tryExplicitDates(dateStr, baseDate, timezone) {
  // ISO format: 2026-03-14
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    try {
      return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T23:59:59Z`);
    } catch (e) {
      // Fall through
    }
  }

  // US format: 03/14/2026 or 3/14/2026
  const usMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (usMatch) {
    const month = parseInt(usMatch[1]);
    const day = parseInt(usMatch[2]);
    const year = usMatch[3].length === 2 ? 2000 + parseInt(usMatch[3]) : parseInt(usMatch[3]);
    try {
      return new Date(year, month - 1, day, 23, 59, 59);
    } catch (e) {
      // Fall through
    }
  }

  // Named month: "March 14", "14 March", "March 14 2026"
  const monthMatch = dateStr.match(new RegExp(`(${MONTH_NAMES.join('|')})\\s+(\\d{1,2})(?:\\s+(\\d{4}))?`, 'i'));
  if (monthMatch) {
    const monthIdx = MONTH_NAMES.indexOf(monthMatch[1].toLowerCase());
    const day = parseInt(monthMatch[2]);
    const year = monthMatch[3] ? parseInt(monthMatch[3]) : baseDate.getFullYear();
    
    try {
      return new Date(year, monthIdx, day, 23, 59, 59);
    } catch (e) {
      // Fall through
    }
  }

  return null;
}

/**
 * Try to parse relative dates
 * @private
 */
function tryRelativeDates(dateStr, baseDate, timezone) {
  // "Today"
  if (/^today$/.test(dateStr)) {
    return setTime(baseDate, 23, 59, 59);
  }

  // "Tomorrow"
  if (/^tomorrow$/.test(dateStr)) {
    return setTime(addDays(baseDate, 1), 23, 59, 59);
  }

  // "Next X days"
  const daysMatch = dateStr.match(/(?:in\s+)?(\d+)\s+(?:days?|business\s+days?)/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return setTime(addDays(baseDate, days), 23, 59, 59);
  }

  // Day of week: "Friday", "next Monday", "this Tuesday"
  const dayMatch = dateStr.match(new RegExp(`(?:next\\s+|this\\s+)?(${DAY_NAMES.join('|')})`, 'i'));
  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    const targetDay = DAY_NAMES.indexOf(dayName);
    return getNextOccurrenceOfDay(baseDate, targetDay);
  }

  // "Next week", "this week"
  if (/^(?:next\s+)?week$/.test(dateStr)) {
    const nextMonday = addDays(baseDate, (1 - baseDate.getDay() + 7) % 7 || 7);
    return setTime(nextMonday, 23, 59, 59);
  }

  if (/^this\s+week$/.test(dateStr)) {
    const friday = addDays(baseDate, (5 - baseDate.getDay() + 7) % 7);
    return setTime(friday, 23, 59, 59);
  }

  // "Next X weeks"
  const weeksMatch = dateStr.match(/(?:in\s+)?(\d+)\s+weeks?/);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1]);
    return setTime(addWeeks(baseDate, weeks), 23, 59, 59);
  }

  // "Next month", "end of month", "next month"
  if (/^(?:next\s+)?month$|^this\s+month$/.test(dateStr)) {
    return setTime(endOfMonth(baseDate), 23, 59, 59);
  }

  if (/^end\s+of\s+month$/.test(dateStr)) {
    return setTime(endOfMonth(baseDate), 23, 59, 59);
  }

  if (/^(?:next|this)\s+(?:end\s+of\s+month|eom)$/.test(dateStr)) {
    return setTime(endOfMonth(addMonths(baseDate, 1)), 23, 59, 59);
  }

  // "Q1", "Q2", "Q3", "Q4"
  const quarterMatch = dateStr.match(/^q([1-4])(?:\s+(\d{4}))?$/);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = quarterMatch[2] ? parseInt(quarterMatch[2]) : baseDate.getFullYear();
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const endDate = new Date(year, endMonth + 1, 0); // Last day of quarter
    return setTime(endDate, 23, 59, 59);
  }

  // "EOY", "End of year"
  if (/^(?:eoy|end\s+of\s+year)$/.test(dateStr)) {
    return setTime(new Date(baseDate.getFullYear(), 11, 31), 23, 59, 59);
  }

  return null;
}

/**
 * Get next occurrence of a day of week
 * @private
 */
function getNextOccurrenceOfDay(baseDate, targetDay) {
  const currentDay = baseDate.getDay();
  let daysAhead = targetDay - currentDay;

  // If day is today, use it (0 days ahead)
  // If day is in the past, use next week (daysAhead + 7)
  if (daysAhead < 0 || (daysAhead === 0 && baseDate.getHours() > 17)) {
    daysAhead += 7;
  }

  if (daysAhead === 0) {
    daysAhead = 0; // Today
  }

  return setTime(addDays(baseDate, daysAhead), 23, 59, 59);
}

/**
 * Set specific time on date (end of day)
 * @private
 */
function setTime(date, hours, minutes, seconds) {
  const d = new Date(date);
  d.setHours(hours, minutes, seconds, 0);
  return d;
}

/**
 * Validate a date is in the future (for action items)
 */
export function isFutureDate(date) {
  return isFuture(new Date(date));
}

/**
 * Check if date is overdue
 */
export function isOverdue(date) {
  return isPast(new Date(date)) && date !== 'No date';
}

/**
 * Format date for display
 */
export function formatDate(date, format = 'short') {
  if (!date) return 'No date';
  
  const d = new Date(date);
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  if (format === 'iso') {
    return d.toISOString().split('T')[0];
  }
  
  return d.toLocaleDateString();
}

/**
 * Get days until due date
 */
export function daysUntilDue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Human-readable time until due
 */
export function timeUntilDue(dueDate) {
  const days = daysUntilDue(dueDate);
  
  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  }
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }
  
  return `Due in ${days} day${days !== 1 ? 's' : ''}`;
}

export default {
  parseDate,
  isFutureDate,
  isOverdue,
  formatDate,
  daysUntilDue,
  timeUntilDue
};
