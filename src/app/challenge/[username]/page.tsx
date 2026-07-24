import { createClient } from '@/lib/supabase/server'
import { getRankTier } from '@/types'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const TIER_META: Record<string, { color: string; emoji: string }> = {
  bronze:   { color: '#b45309', emoji: '🥉' },
  silver:   { color: '#9ca3af', emoji: '🥈' },
  gold:     { color: '#d97706', emoji: '🥇' },
  platinum: { color: '#06b6d4', emoji: '💎' },
  diamond:  { color: '#3b82f6', emoji: '💠' },
}

export default async function ChallengePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('username, elo_rating, total_wins, total_battles')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const tier = getRankTier(profile.elo_rating)
  const meta = TIER_META[tier] ?? TIER_META.bronze
  const winRate = profile.total_battles > 0
    ? Math.round((profile.total_wins / profile.total_battles) * 100)
    : 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0e0b2e' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: 'rgba(124,58,237,0.2)' }} />
      </div>

      <div className="relative w-full max-w-sm space-y-6 text-center">
        {/* Logo */}
        <div className="space-y-1">
          <p className="text-4xl">⚔️</p>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#fff' }}>
            Scholar<span style={{ color: '#a78bfa' }}>Battle</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>The academic battle arena</p>
        </div>

        {/* Challenge card */}
        <div className="rounded-3xl p-6 space-y-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
          {/* Avatar / rank ring */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ border: `4px solid ${meta.color}` }}
            >
              🧠
            </div>
            <div>
              <p className="font-black text-xl" style={{ color: '#fff' }}>@{profile.username}</p>
              <p className="text-xs font-bold" style={{ color: meta.color }}>
                {meta.emoji} {tier.charAt(0).toUpperCase() + tier.slice(1)} Scholar
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'ELO', value: profile.elo_rating },
              { label: 'Wins', value: profile.total_wins },
              { label: 'Win Rate', value: `${winRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="font-black text-lg" style={{ color: '#fff' }}>{value}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* CTA text */}
          <div className="space-y-1">
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>
              Can you beat <span style={{ color: '#fff', fontWeight: 800 }}>@{profile.username}</span>?
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              Join ScholarBattle and send them a challenge!
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <Link
              href="/signup"
              className="block w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}
            >
              Sign up &amp; Challenge 🎮
            </Link>
            <Link
              href="/login"
              className="block w-full py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            >
              Already have an account? Log in
            </Link>
          </div>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Free to play · No downloads needed</p>
      </div>
    </div>
  )
}
