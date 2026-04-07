/**
 * Timezone utilities for consistent Israel (Asia/Jerusalem) time handling
 *
 * Strategy:
 * - All user-facing times are in Israel timezone
 * - Database stores UTC timestamps (Prisma default)
 * - Backend parses incoming datetime strings as Israel time
 * - Backend uses Israel time for "now" comparisons
 */

import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Get current date/time in Israel timezone
 * Use this for "now" comparisons when business logic requires Israel time
 */
export function nowInIsrael(): Date {
  return toZonedTime(new Date(), ISRAEL_TIMEZONE);
}

/**
 * Get current UTC date/time
 * This is equivalent to new Date() but explicit about intent
 */
export function nowUTC(): Date {
  return new Date();
}

/**
 * Parse a datetime-local string (YYYY-MM-DDTHH:MM) as Israel time
 * and return a UTC Date object for database storage
 *
 * This is the key function for handling user input from forms
 */
export function parseIsraelDateTime(dateTimeLocal: string): Date {
  if (!dateTimeLocal) {
    throw new Error('Invalid datetime string');
  }
  // The datetime-local string represents Israel local time
  // fromZonedTime converts Israel local time to UTC
  return fromZonedTime(new Date(dateTimeLocal), ISRAEL_TIMEZONE);
}

/**
 * Parse a date string (YYYY-MM-DD) as Israel midnight
 * Returns UTC Date representing midnight Israel time
 */
export function parseIsraelDate(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('Invalid date string');
  }

  // Extract just the date part (YYYY-MM-DD)
  // This handles YYYY-MM-DD, ISO strings (YYYY-MM-DDTHH:mm...), and trailing Ts
  const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  
  if (dateMatch) {
    const cleanDate = dateMatch[1];
    return fromZonedTime(new Date(`${cleanDate}T00:00:00`), ISRAEL_TIMEZONE);
  }

  // Fallback for other formats
  const fallback = new Date(dateStr);
  if (isNaN(fallback.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
  }
  
  // Convert fallback to Israel date string and then to midnight
  const dateOnly = formatInTimeZone(fallback, ISRAEL_TIMEZONE, 'yyyy-MM-dd');
  return fromZonedTime(new Date(`${dateOnly}T00:00:00`), ISRAEL_TIMEZONE);
}

/**
 * Parse an ISO string (from frontend) to a proper Date
 * The ISO string should already be in UTC, so just parse it
 */
export function parseISODate(isoString: string): Date {
  if (!isoString) {
    throw new Error('Invalid ISO string');
  }
  return parseISO(isoString);
}

/**
 * Check if a datetime string looks like a naive local time (no timezone info)
 * vs an ISO string with timezone
 */
export function isNaiveDateTime(str: string): boolean {
  // Naive: "2024-01-15T10:00" or "2024-01-15T10:00:00"
  // ISO: "2024-01-15T10:00:00.000Z" or "2024-01-15T10:00:00+02:00"
  return !str.includes('Z') && !str.includes('+') && !str.match(/\d{2}:\d{2}:\d{2}[+-]/);
}

/**
 * Smart parse: handles both naive datetime-local strings and ISO strings
 * - If naive (no timezone), treat as Israel time
 * - If ISO (has Z or offset), parse directly
 */
export function smartParseDatetime(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('Invalid datetime string');
  }

  if (isNaiveDateTime(dateStr)) {
    // Naive datetime string - treat as Israel local time
    return parseIsraelDateTime(dateStr);
  } else {
    // ISO string with timezone - parse directly
    return parseISO(dateStr);
  }
}

/**
 * Get today in Israel timezone as start of day (UTC Date)
 */
export function todayIsraelStart(): Date {
  const israelNow = toZonedTime(new Date(), ISRAEL_TIMEZONE);
  const israelMidnight = startOfDay(israelNow);
  return fromZonedTime(israelMidnight, ISRAEL_TIMEZONE);
}

/**
 * Get today in Israel timezone as end of day (UTC Date)
 */
export function todayIsraelEnd(): Date {
  const israelNow = toZonedTime(new Date(), ISRAEL_TIMEZONE);
  const israelEndOfDay = endOfDay(israelNow);
  return fromZonedTime(israelEndOfDay, ISRAEL_TIMEZONE);
}

/**
 * Get today's date in Israel as YYYY-MM-DD string
 */
export function getTodayIsraelString(): string {
  return formatInTimeZone(new Date(), ISRAEL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Format a UTC Date for display in Israel timezone
 */
export function formatForIsrael(date: Date, formatStr: string = 'yyyy-MM-dd HH:mm'): string {
  return formatInTimeZone(date, ISRAEL_TIMEZONE, formatStr);
}

/**
 * Check if a date is overdue based on current Israel time
 */
export function isOverdue(expectedReturn: Date): boolean {
  return new Date() > expectedReturn;
}

/**
 * Get the current hour in Israel timezone (0-23)
 */
export function getCurrentIsraelHour(): number {
  const israelNow = toZonedTime(new Date(), ISRAEL_TIMEZONE);
  return israelNow.getHours();
}

/**
 * Get current time as HH:MM string in Israel timezone
 */
export function getCurrentIsraelTime(): string {
  return formatInTimeZone(new Date(), ISRAEL_TIMEZONE, 'HH:mm');
}

/**
 * Aliases for more intuitive naming
 */
export const getIsraelTodayStart = todayIsraelStart;
export const getIsraelTodayEnd = todayIsraelEnd;

/**
 * Get tomorrow in Israel timezone as start of day (UTC Date)
 */
export function getIsraelTomorrowStart(): Date {
  const israelNow = toZonedTime(new Date(), ISRAEL_TIMEZONE);
  const tomorrow = new Date(israelNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowMidnight = startOfDay(tomorrow);
  return fromZonedTime(tomorrowMidnight, ISRAEL_TIMEZONE);
}

/**
 * Check if a database date (UTC midnight) represents today in Israel
 * Use this for comparing @db.Date fields which are stored as UTC midnight
 */
export function isIsraelToday(date: Date): boolean {
  const dateStr = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd');
  const todayStr = getTodayIsraelString();
  return dateStr === todayStr;
}

/**
 * Check if a database date (UTC midnight) is in the future (after today in Israel)
 */
export function isAfterIsraelToday(date: Date): boolean {
  const dateStr = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd');
  const todayStr = getTodayIsraelString();
  return dateStr > todayStr;
}

/**
 * Get the date string (YYYY-MM-DD) from a database date
 */
export function getDateString(date: Date): string {
  return formatInTimeZone(date, 'UTC', 'yyyy-MM-dd');
}
