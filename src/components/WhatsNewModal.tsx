'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'whats_new_seen_v1'

const UPDATES = [
  {
    emoji: '🖼️',
    title: 'Avatar Frames',
    desc: 'Spend your coins on flashy frames for your avatar — from Bronze all the way up to the animated Prism frame. Shows up everywhere your profile picture does.',
  },
  {
    emoji: '🌍',
    title: 'Global Rank at Diamond',
    desc: "Hit Diamond and your progress bar turns into a live global rank — see exactly where you stand out of everyone playing (e.g. \"#12 of 340 players\").",
  },
  {
    emoji: '🏆',
    title: 'Seasonal Leaderboard Resets',
    desc: 'Every season, the top 10 players win bonus coins and the leaderboard resets — a fresh ladder to climb, even if you\'re already at the top.',
  },
]

export function WhatsNewModal() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div className="w-full max-w-sm bg-[var(--bg-nav)] border border-white/15 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-1">
          <p className="text-3xl">✨</p>
          <h2 className="text-xl font-black text-white">What's New</h2>
          <p className="text-white/50 text-xs">Here's what we just added</p>
        </div>

        <div className="space-y-3">
          {UPDATES.map(u => (
            <div key={u.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5">
              <span className="text-2xl flex-shrink-0">{u.emoji}</span>
              <div>
                <p className="font-black text-white text-sm">{u.title}</p>
                <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={dismiss}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all active:scale-95 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}
        >
          Let's go! 🚀
        </button>
      </div>
    </div>
  )
}
