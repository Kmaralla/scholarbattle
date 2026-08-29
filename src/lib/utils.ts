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

const LONG_QUESTION_CHARS = 100
const LONG_QUESTION_SECONDS = 30

/**
 * Long questions (dense history/civics prompts especially) need more
 * than a short base timer to even read, let alone answer — so any
 * question over LONG_QUESTION_CHARS gets bumped up to at least 30s,
 * regardless of whatever shorter per-question time was chosen.
 */
export function getEffectiveSeconds(questionText: string, baseSeconds: number): number {
  if (questionText.length > LONG_QUESTION_CHARS) {
    return Math.max(baseSeconds, LONG_QUESTION_SECONDS)
  }
  return baseSeconds
}

/**
 * Normalizes a typed answer for comparison: case-insensitive, and all
 * whitespace stripped (not just trimmed) so "y = 2x + 5" and "y=2x+5"
 * are treated as the same answer.
 */
export function normalizeAnswer(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}
