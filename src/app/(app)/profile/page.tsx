import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { RankBadge } from '@/components/RankBadge'
import { getRankTier } from '@/types'
import { LogOut } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (!profile) redirect('/onboarding')

  const tier = getRankTier(profile.elo_rating)
  const winRate = profile.total_battles > 0
    ? Math.round((profile.total_wins / profile.total_battles) * 100)
    : 0

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-xl font-black text-gray-900">Profile</h1>
      <Card>
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-700">
            {profile.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{profile.username}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
          <RankBadge tier={tier} elo={profile.elo_rating} showElo />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'ELO Rating', value: profile.elo_rating },
          { label: 'Rank', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
          { label: 'Total Battles', value: profile.total_battles },
          { label: 'Total Wins', value: profile.total_wins },
          { label: 'Win Rate', value: `${winRate}%` },
          { label: 'Grade Level', value: `Grade ${profile.grade_level}` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-lg font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form action="/auth/signout" method="post">
        <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-bold hover:bg-red-50 transition">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </form>
    </div>
  )
}
