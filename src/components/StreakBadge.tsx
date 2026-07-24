'use client'
import { useEffect, useState } from 'react'
import { checkStreak } from '@/lib/streak'

export function StreakBadge() {
  const [streak, setStreak] = useState(0)
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    const { streak: s, isNewDay } = checkStreak()
    setStreak(s)
    if (isNewDay) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3500)
    }
  }, [])

  if (streak === 0) return null

  return (
    <>
      {/* Streak pill */}
      <div className="flex items-center gap-1.5 bg-orange-400/15 border border-orange-400/30 rounded-full px-3 py-1">
        <span className="text-base">🔥</span>
        <span className="font-black text-orange-300 text-sm">{streak}</span>
        <span className="text-orange-400/60 text-xs font-semibold">day{streak !== 1 ? 's' : ''}</span>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] animate-bounce-in">
          <div className="bg-orange-500 text-white font-black px-6 py-3 rounded-2xl shadow-2xl shadow-orange-500/40 flex items-center gap-3 text-sm">
            <span className="text-2xl">🔥</span>
            <div>
              <p>{streak === 1 ? 'Streak started!' : `${streak}-day streak!`}</p>
              <p className="font-normal text-orange-100 text-xs">Keep coming back daily</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
