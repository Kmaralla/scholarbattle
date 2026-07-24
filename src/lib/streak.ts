// Daily login streak — stored in localStorage, no DB migration needed

const KEY_STREAK = 'login_streak'
const KEY_LAST   = 'last_login_date'

function today() {
  return new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

export interface StreakData {
  streak: number
  isNewDay: boolean // true if this visit extended or started the streak today
}

export function checkStreak(): StreakData {
  if (typeof window === 'undefined') return { streak: 1, isNewDay: false }

  const last   = localStorage.getItem(KEY_LAST)
  const stored = parseInt(localStorage.getItem(KEY_STREAK) ?? '0', 10)
  const t      = today()

  if (last === t) {
    // Already logged in today — no change
    return { streak: stored || 1, isNewDay: false }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)

  let newStreak: number
  if (last === yStr) {
    // Logged in yesterday — extend streak
    newStreak = (stored || 0) + 1
  } else {
    // Missed a day (or first ever) — reset
    newStreak = 1
  }

  localStorage.setItem(KEY_STREAK, String(newStreak))
  localStorage.setItem(KEY_LAST, t)
  return { streak: newStreak, isNewDay: true }
}

export function getStreak(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(KEY_STREAK) ?? '0', 10)
}
