'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, Users, Trophy, User, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',   label: 'Home',    icon: Home },
  { href: '/matchmaking', label: 'Online',  icon: Swords },
  { href: '/friends',     label: 'Friends', icon: Users },
  { href: '/leaderboard', label: 'Rankings',icon: Trophy },
  { href: '/profile',     label: 'Profile', icon: User },
]

export function Navbar() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg md:relative md:bottom-auto md:border-t-0 md:border-r md:w-64 md:h-screen md:flex md:flex-col md:shadow-none">
      {/* Logo — desktop only */}
      <div className="hidden md:flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <Swords className="w-6 h-6 text-indigo-600" />
        <span className="text-lg font-bold text-gray-900">ScholarBattle</span>
      </div>
      <div className="flex justify-around md:flex-col md:justify-start md:gap-1 md:p-3 md:pt-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors text-xs font-medium',
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
