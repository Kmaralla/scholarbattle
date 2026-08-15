import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatElo(elo: number) {
  return elo.toLocaleString()
}

export function gradeLabel(grade: number) {
  if (grade === 0) return 'Kindergarten'
  if (grade <= 12) return `Grade ${grade}`
  return `Grade ${grade}`
}

/**
 * Clips the display text of each option so no choice is more than
 * MAX_EXTRA characters longer than the shortest option — preventing
 * answer length from telegraphing the correct choice.
 * The returned array is display-only; keep original strings for onClick/comparison.
 */
export function clipOptionDisplay(options: string[], maxExtra = 22): string[] {
  if (options.length === 0) return options
  const minLen = Math.min(...options.map(o => o.length))
  const cap = minLen + maxExtra
  return options.map(o => o.length > cap ? o.slice(0, cap - 1) + '…' : o)
}
