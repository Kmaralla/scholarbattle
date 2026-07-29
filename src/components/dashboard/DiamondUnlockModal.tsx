'use client'
import { useEffect, useState } from 'react'
import { LEGEND_DAYS_AT_DIAMOND, LEGEND_WINS_AT_DIAMOND } from '@/types'

const STORAGE_KEY = 'diamond_legend_popup_shown'

export function DiamondUnlockModal({ tier }: { tier: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (tier !== 'diamond') return
    if (localStorage.getItem(STORAGE_KEY)) return
    setShow(true)
  }, [tier])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5 text-center"
        style={{
          background: 'linear-gradient(145deg, #1a0a3d 0%, #0d1a40 60%, #0a1a2e 100%)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 0 60px rgba(139,92,246,0.3), 0 24px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Crown */}
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.3), rgba(99,102,241,0.1))',
              border: '2px solid rgba(139,92,246,0.5)',
              boxShadow: '0 0 30px rgba(139,92,246,0.4)',
            }}
          >
            👑
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-400">You reached</p>
          <h2 className="text-3xl font-black text-white">Diamond!</h2>
          <p className="text-white/50 text-sm">You're at the top tier — almost.</p>
        </div>

        {/* Legend path */}
        <div
          className="rounded-2xl p-4 space-y-3 text-left"
          style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(139,92,246,0.08))',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          <p className="text-center text-sm font-black text-white/80">
            🌟 How to reach <span className="text-yellow-400">Legend</span>
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-xl flex-shrink-0">📅</span>
              <div>
                <p className="font-black text-white text-sm">Stay at Diamond</p>
                <p className="text-white/50 text-xs">Keep your Diamond rank for <span className="text-violet-300 font-bold">{LEGEND_DAYS_AT_DIAMOND} days</span></p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/30 font-bold">OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-xl flex-shrink-0">⚔️</span>
              <div>
                <p className="font-black text-white text-sm">Win battles</p>
                <p className="text-white/50 text-xs">Win <span className="text-violet-300 font-bold">{LEGEND_WINS_AT_DIAMOND} battles</span> while at Diamond rank</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all active:scale-95 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 8px 24px rgba(124,58,237,0.4)',
          }}
        >
          Let's go! 🚀
        </button>
      </div>
    </div>
  )
}
