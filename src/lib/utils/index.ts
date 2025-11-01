import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Purpose: Utility function to merge Tailwind CSS classes with conditional logic.
 * Params:
 *   - inputs: ClassValue[] — Array of class values (strings, objects, arrays).
 * Returns:
 *   - string — Merged and deduplicated class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Purpose: Format currency amount according to locale and currency code.
 * Params:
 *   - amount: number — The amount in smallest currency units (e.g., cents).
 *   - currency: string — ISO currency code (e.g., "USD", "VND").
 *   - locale?: string — BCP 47 locale code (defaults to "en-US").
 * Returns:
 *   - string — Formatted currency string with proper symbols and separators.
 * Throws:
 *   - Error — When currency code is invalid or amount is negative.
 */
export function formatCurrency(amount: number, currency: string, locale = 'en-US'): string {
  if (amount < 0) {
    throw new Error('Amount cannot be negative');
  }

  const divisor = currency === 'VND' ? 1 : 100;
  const realAmount = amount / divisor;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(realAmount);
  } catch (error) {
    throw new Error(`Invalid currency code: ${currency}`);
  }
}

/**
 * Purpose: Format date according to locale with various format options.
 * Params:
 *   - date: Date | string — Date object or ISO date string.
 *   - format?: string — Format type: "short", "medium", "long", "full" (defaults to "medium").
 *   - locale?: string — BCP 47 locale code (defaults to "en-US").
 * Returns:
 *   - string — Formatted date string.
 * Throws:
 *   - Error — When date is invalid.
 */
export function formatDate(date: Date | string, format = 'medium', locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { dateStyle: 'short' },
    medium: { dateStyle: 'medium' },
    long: { dateStyle: 'long' },
    full: { dateStyle: 'full' },
  };

  return new Intl.DateTimeFormat(locale, formatOptions[format]).format(dateObj);
}