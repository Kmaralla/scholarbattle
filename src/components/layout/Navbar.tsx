'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, Users, Trophy, User, Home, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',   label: 'Home',    icon: Home,      emoji: '🏠' },
  { href: '/matchmaking', label: 'Battle',  icon: Swords,    emoji: '⚔️' },
  { href: '/friends',     label: 'Friends', icon: Users,     emoji: '👥' },
  { href: '/games',       label: 'Games',   icon: Gamepad2,  emoji: '🎮' },
  { href: '/leaderboard', label: 'Ranks',   icon: Trophy,    emoji: '🏆' },
  { href: '/profile',     label: 'Profile', icon: User,      emoji: '👤' },
]

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
        {/* Coin bar on mobile */}
        {coins !== null && (
          <div className="flex justify-center pt-1.5">
            <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-4 py-0.5">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-black text-yellow-300">{coins}</span>
            </div>
          </div>
        )}
        <div className="flex justify-around px-1 pb-2 pt-1">
          {NAV.map(({ href, label, emoji }) => {
            const active = path.startsWith(href)
            return (
              <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl transition-all">
                <span className={cn('text-xl transition-transform', active && 'scale-125')}>{emoji}</span>
                <span className={cn('text-[10px] font-bold', active ? 'text-violet-300' : 'text-white/40')}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-64 h-screen bg-[#1a1035] border-r border-white/10 flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-lg leading-tight">Scholar</p>
              <p className="font-black text-violet-400 text-lg leading-tight -mt-1">Battle</p>
            </div>
          </div>
          {/* Coins */}
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

        {/* Nav items */}
        <div className="flex-1 p-3 space-y-1 pt-4">
          {NAV.map(({ href, label, icon: Icon, emoji }) => {
            const active = path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm',
                  active
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                )}
              >
                <span className="text-xl">{emoji}</span>
                <span>{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-white/10">
          <p className="text-white/20 text-xs text-center">ScholarBattle v1.0</p>
        </div>
      </nav>
    </>
  )
}
