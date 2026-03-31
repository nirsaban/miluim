import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatDateTimeIsrael,
  formatDateIsrael,
  formatRelativeTimeIsrael,
} from './timezone';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display - uses Israel timezone
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy') {
  return formatDateIsrael(date, formatStr);
}

/**
 * Format datetime for display - uses Israel timezone
 */
export function formatDateTime(date: string | Date) {
  return formatDateTimeIsrael(date, 'dd/MM/yyyy HH:mm');
}

/**
 * Format relative time in Hebrew - uses Israel timezone
 */
export function formatRelativeTime(date: string | Date) {
  return formatRelativeTimeIsrael(date);
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-red-600 text-white';
    case 'HIGH':
      return 'bg-orange-500 text-white';
    case 'MEDIUM':
      return 'bg-yellow-500 text-white';
    case 'LOW':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-green-600 text-white';
    case 'REJECTED':
      return 'bg-red-600 text-white';
    case 'PENDING':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

export function getSoldierStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-600 text-white';
    case 'LEAVE':
      return 'bg-blue-500 text-white';
    case 'SICK':
      return 'bg-red-500 text-white';
    case 'TRAINING':
      return 'bg-purple-500 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

/**
 * Format phone number to WhatsApp link
 * Converts Israeli phone numbers to international format
 * Example: 0501234567 -> https://wa.me/972501234567
 */
export function formatWhatsAppLink(phone: string): string {
  if (!phone) return '#';

  // Remove spaces, dashes, and other non-numeric characters
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with 0, replace with 972
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.slice(1);
  }

  // If doesn't start with +972 or 972, add 972
  if (!cleaned.startsWith('972') && !cleaned.startsWith('+972')) {
    cleaned = '972' + cleaned;
  }

  // Remove + if present
  cleaned = cleaned.replace(/^\+/, '');

  return `https://wa.me/${cleaned}`;
}
