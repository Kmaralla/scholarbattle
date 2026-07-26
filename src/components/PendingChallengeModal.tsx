'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/profile/UserAvatar'

interface ChallengerInfo {
  username: string
  elo_rating: number
  total_wins: number
  total_battles: number
  avatar_url: string | null
}

const TIER_META: Record<string, { color: string; emoji: string }> = {
  bronze:   { color: '#b45309', emoji: '🥉' },
  silver:   { color: '#9ca3af', emoji: '🥈' },
  gold:     { color: '#d97706', emoji: '🥇' },
  platinum: { color: '#06b6d4', emoji: '💎' },
  diamond:  { color: '#3b82f6', emoji: '💠' },
}

function getTier(elo: number) {
  if (elo >= 1800) return 'diamond'
  if (elo >= 1600) return 'platinum'
  if (elo >= 1400) return 'gold'
  if (elo >= 1200) return 'silver'
  return 'bronze'
}

export function PendingChallengeModal({ myUsername }: { myUsername: string }) {
  const [challenger, setChallenger] = useState<ChallengerInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const pending = localStorage.getItem('pending_challenge')
    if (!pending) return
    // Same person — clear and skip
    if (pending.toLowerCase() === myUsername.toLowerCase()) {
      localStorage.removeItem('pending_challenge')
      return
    }
    const supabase = createClient()
    supabase
      .from('users')
      .select('username, elo_rating, total_wins, total_battles, avatar_url')
      .ilike('username', pending)   // case-insensitive match
      .single()
      .then(({ data }) => {
        if (data) setChallenger(data)
        else localStorage.removeItem('pending_challenge')
      })
  }, [myUsername])

  if (!challenger || dismissed) return null

  const tier = getTier(challenger.elo_rating)
  const meta = TIER_META[tier]
  const winRate = challenger.total_battles > 0
    ? Math.round((challenger.total_wins / challenger.total_battles) * 100)
    : 0

  function dismiss() {
    localStorage.removeItem('pending_challenge')
    setDismissed(true)
  }

  function accept() {
    localStorage.setItem('auto_challenge', challenger!.username)
    localStorage.removeItem('pending_challenge')
    setDismissed(true)
    // Force a full navigation so the friends page always remounts and picks up auto_challenge
    window.location.href = '/friends'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-5 text-center animate-bounce-in"
        style={{ background: 'linear-gradient(135deg,#1e1245,#120d35)', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.1)' }}
      >
        {/* Header */}
        <div className="space-y-1">
          <p className="text-3xl">⚔️</p>
          <h2 className="text-xl font-black text-white">You've been challenged!</h2>
          <p className="text-white/50 text-xs">Someone wants to battle you on ScholarBattle</p>
        </div>

        {/* Challenger card */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col items-center gap-1.5">
            <div style={{ border: `3px solid ${meta.color}` }} className="rounded-full">
              <UserAvatar username={challenger.username} avatarUrl={challenger.avatar_url} size="lg" />
            </div>
            <p className="font-black text-white text-lg">@{challenger.username}</p>
            <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.emoji} {tier.charAt(0).toUpperCase() + tier.slice(1)} Scholar</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'ELO', value: challenger.elo_rating },
              { label: 'Wins', value: challenger.total_wins },
              { label: 'Win Rate', value: `${winRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="font-black text-white text-base">{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={accept}
            className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}
          >
            ⚔️ Accept &amp; Battle @{challenger.username}
          </button>
          <button
            onClick={dismiss}
            className="w-full py-2.5 rounded-2xl font-bold text-sm transition-all hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
