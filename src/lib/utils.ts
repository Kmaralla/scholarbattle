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
