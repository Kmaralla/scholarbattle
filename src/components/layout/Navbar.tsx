'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, Users, Trophy, User, Home, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',   label: 'Home',    icon: Home },
  { href: '/matchmaking', label: 'Online',  icon: Swords },
  { href: '/friends',     label: 'Friends', icon: Users },
  { href: '/games',       label: 'Games',   icon: Gamepad2 },
  { href: '/leaderboard', label: 'Rankings',icon: Trophy },
  { href: '/profile',     label: 'Profile', icon: User },
]

export function Navbar() {
  const path = usePathname()
  const [coins, setCoins] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadCoins() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('coins').eq('id', user.id).single()
      if (data) setCoins(data.coins ?? 0)
    }
    loadCoins()

    // Refresh coins when window regains focus (e.g. after a battle)
    const handler = () => loadCoins()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg md:relative md:bottom-auto md:border-t-0 md:border-r md:w-64 md:h-screen md:flex md:flex-col md:shadow-none">
      {/* Logo + coins — desktop only */}
      <div className="hidden md:flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Swords className="w-6 h-6 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">ScholarBattle</span>
        </div>
        {coins !== null && (
          <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
            <span className="text-sm">🪙</span>
            <span className="text-sm font-bold text-yellow-700">{coins}</span>
          </div>
        )}
      </div>

      {/* Coins — mobile top bar */}
      {coins !== null && (
        <div className="md:hidden fixed top-3 left-3 z-50 flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 shadow-sm">
          <span className="text-sm">🪙</span>
          <span className="text-sm font-bold text-yellow-700">{coins}</span>
        </div>
      )}

      <div className="flex justify-around md:flex-col md:justify-start md:gap-1 md:p-3 md:pt-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-colors text-xs font-medium',
                'md:flex-row md:gap-3 md:px-4 md:py-3 md:text-sm',
                active
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
