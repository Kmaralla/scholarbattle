'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, Users, Trophy, User, Home, Gamepad2, Dumbbell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SECTIONS = [
  {
    label: null,
    items: [
      { href: '/dashboard',   label: 'Home',     icon: Home,     emoji: '🏠', desc: 'Your overview — stats, rank, quick actions, and recent battles.' },
      { href: '/matchmaking', label: 'Battle',   icon: Swords,   emoji: '⚔️', desc: 'Jump into a ranked match against a real player right now.' },
      { href: '/friends',     label: 'Friends',  icon: Users,    emoji: '👥', desc: 'Add friends, accept invites, and challenge them to a battle.' },
      { href: '/leaderboard', label: 'Rankings', icon: Trophy,   emoji: '🏆', desc: 'See where you stand against all scholars on the global leaderboard.' },
    ],
  },
  {
    label: 'Not ready for battle?',
    items: [
      { href: '/training', label: 'Training', icon: Dumbbell, emoji: '💪', desc: 'Practice with a coach using Puzzles, Speed Drills, Flashcards and more.' },
      { href: '/games',    label: 'Games',    icon: Gamepad2, emoji: '🎮', desc: 'Spend your coins on fun mini-games to sharpen your skills.' },
    ],
  },
  {
    label: 'You',
    items: [
      { href: '/profile', label: 'Profile', icon: User, emoji: '👤', desc: 'View your profile, stats, badges, and upload a profile picture.' },
    ],
  },
]

const ALL_NAV = SECTIONS.flatMap(s => s.items)

export function Navbar() {
  const path = usePathname()
  const [coins, setCoins] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadCoins() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('users').select('coins').eq('id', user.id).single()
      if (error) { setCoins(0); return }
      setCoins((data as any)?.coins ?? 0)
    }
    loadCoins()
    const handler = () => loadCoins()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [path])

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#1a1035]/95 backdrop-blur border-t border-white/10">
        {coins !== null && (
          <div className="flex justify-center pt-1.5">
            <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-0.5">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-black text-yellow-300">{coins}</span>
            </div>
          </div>
        )}
        <div className="flex justify-around px-1 pb-2 pt-1">
          {ALL_NAV.map(({ href, label, emoji }) => {
            const active = path.startsWith(href)
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl transition-all">
                <span className={cn('text-xl transition-transform', active && 'scale-125')}>{emoji}</span>
                <span className={cn('text-[10px] font-bold', active ? 'text-white' : 'text-white/40')}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 h-screen bg-[#1a1035] border-r border-white/10 flex-shrink-0 overflow-visible">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Swords className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <p className="font-black text-white text-lg leading-tight">Scholar</p>
              <p className="font-black text-white/40 text-lg leading-tight -mt-1">Battle</p>
            </div>
          </div>
          {coins !== null && (
            <div className="mt-4 flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl px-4 py-2">
              <span className="text-xl">🪙</span>
              <div>
                <p className="text-xs text-yellow-400/60 font-medium">Your Coins</p>
                <p className="text-lg font-black text-yellow-300">{coins}</p>
              </div>
            </div>
          )}
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-visible p-3 pt-4 space-y-5">
          {SECTIONS.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="text-[10px] font-black uppercase tracking-widest text-white/25 px-4 mb-2">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map(({ href, label, emoji, desc }) => {
                  const active = path.startsWith(href)
                  return (
                    <div key={href} className="relative group">
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm',
                          active
                            ? 'bg-white/10 border border-white/15 text-white'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        )}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span>{label}</span>
                        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                      </Link>
                      {/* Tooltip */}
                      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <div className="bg-[#1a1035] border border-white/15 rounded-xl px-3 py-2 w-48 shadow-xl">
                          <p className="text-xs font-black text-white mb-0.5">{label}</p>
                          <p className="text-xs text-white/50 leading-snug">{desc}</p>
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a1035]" />
                      </div>
                    </div>
                  )
                })}
              </div>
              {si < SECTIONS.length - 1 && <div className="mt-4 border-t border-white/5" />}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <p className="text-white/20 text-xs text-center">ScholarBattle v1.0</p>
        </div>
      </nav>
    </>
  )
}
