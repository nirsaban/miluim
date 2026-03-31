/**
 * Timezone utilities for consistent Israel (Asia/Jerusalem) time handling
 *
 * Strategy:
 * - All user-facing times are in Israel timezone
 * - Database stores UTC timestamps
 * - Frontend converts to/from Israel time for display and input
 */

import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { he } from 'date-fns/locale';

export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Get current date/time in Israel timezone
 * Use this instead of new Date() for "now" comparisons
 */
export function nowInIsrael(): Date {
  return toZonedTime(new Date(), ISRAEL_TIMEZONE);
}

/**
 * Get current time formatted for datetime-local input (YYYY-MM-DDTHH:MM)
 * This gives the correct Israel local time for form defaults
 */
export function getIsraelDateTimeLocalNow(): string {
  return formatInTimeZone(new Date(), ISRAEL_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Get a datetime-local string for X hours from now in Israel time
 */
export function getIsraelDateTimeLocalPlusHours(hours: number): string {
  const future = new Date(Date.now() + hours * 60 * 60 * 1000);
  return formatInTimeZone(future, ISRAEL_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Round time to nearest 15 minutes and return as datetime-local string
 */
export function getIsraelDateTimeLocalRounded(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  const diff = roundedMinutes - minutes;
  const rounded = new Date(now.getTime() + diff * 60 * 1000);
  return formatInTimeZone(rounded, ISRAEL_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Round time to nearest 15 minutes, add hours, return as datetime-local string
 */
export function getIsraelDateTimeLocalRoundedPlusHours(hours: number): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  const diff = roundedMinutes - minutes;
  const rounded = new Date(now.getTime() + diff * 60 * 1000 + hours * 60 * 60 * 1000);
  return formatInTimeZone(rounded, ISRAEL_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Convert a datetime-local input value to ISO string for API submission
 * The datetime-local value is treated as Israel local time
 * Returns ISO 8601 string with timezone offset
 */
export function dateTimeLocalToISO(dateTimeLocal: string): string {
  if (!dateTimeLocal) return '';
  // Parse the datetime-local value as Israel time and convert to UTC ISO string
  const israelDate = fromZonedTime(new Date(dateTimeLocal), ISRAEL_TIMEZONE);
  return israelDate.toISOString();
}

/**
 * Convert an ISO date string (from API) to datetime-local format for form inputs
 * Displays in Israel timezone
 */
export function isoToDateTimeLocal(isoString: string): string {
  if (!isoString) return '';
  return formatInTimeZone(parseISO(isoString), ISRAEL_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format a date/ISO string for display in Israel timezone
 * Default format: dd/MM/yyyy HH:mm
 */
export function formatDateTimeIsrael(
  date: string | Date,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, ISRAEL_TIMEZONE, formatStr, { locale: he });
}

/**
 * Format date only (no time) in Israel timezone
 */
export function formatDateIsrael(
  date: string | Date,
  formatStr: string = 'dd/MM/yyyy'
): string {
  return formatDateTimeIsrael(date, formatStr);
}

/**
 * Format time only in Israel timezone
 */
export function formatTimeIsrael(
  date: string | Date,
  formatStr: string = 'HH:mm'
): string {
  return formatDateTimeIsrael(date, formatStr);
}

/**
 * Get today's date in Israel timezone as YYYY-MM-DD string
 */
export function getTodayIsrael(): string {
  return formatInTimeZone(new Date(), ISRAEL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Parse a date-only string (YYYY-MM-DD) as Israel midnight
 * Useful for shift dates and service cycle dates
 */
export function parseDateAsIsraelMidnight(dateStr: string): Date {
  // Append midnight time and parse as Israel time
  return fromZonedTime(new Date(`${dateStr}T00:00:00`), ISRAEL_TIMEZONE);
}

/**
 * Check if a date/time is overdue (past the expected return time)
 * Uses current Israel time for comparison
 */
export function isOverdueIsrael(expectedReturn: string | Date): boolean {
  const returnTime = typeof expectedReturn === 'string' ? parseISO(expectedReturn) : expectedReturn;
  return new Date() > returnTime;
}

/**
 * Format relative time in Hebrew
 */
export function formatRelativeTimeIsrael(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'עכשיו';
  if (diffMins < 60) return `לפני ${diffMins} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return formatDateIsrael(parsedDate);
}
