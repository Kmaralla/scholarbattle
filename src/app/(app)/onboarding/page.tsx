'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Swords } from 'lucide-react'

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1)

export default function OnboardingPage() {
  const [username, setUsername] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!grade) { setError('Please select your grade'); return }
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: err } = await supabase.from('users').insert({
      id: user.id,
      username: username.trim(),
      elo_rating: 1000,
      rank_tier: 'bronze',
      grade_level: grade,
      total_wins: 0,
      total_battles: 0,
    })

    if (err) {
      setError(err.message.includes('duplicate') ? 'Username taken, try another' : err.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/40">
            <Swords className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-white">Create your profile</h1>
          <p className="text-sm text-white/50 mt-1">Pick a username and your grade to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">Username</label>
            <input
              required
              minLength={3}
              maxLength={20}
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="coolkid42"
              className="w-full px-4 py-3 rounded-xl border-2 border-white/10 bg-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-violet-400 transition"
            />
            <p className="text-xs text-white/30 mt-1">Letters, numbers, underscores only</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/70 mb-1.5">Your Grade</label>
            <div className="grid grid-cols-4 gap-1.5">
              {GRADES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    grade === g
                      ? 'border-violet-500 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                      : 'border-white/10 text-white/50 hover:border-violet-400 hover:text-white bg-white/5'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !grade}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition disabled:opacity-40 shadow-lg shadow-violet-500/30"
          >
            {loading ? 'Creating...' : 'Start Battling! ⚔️'}
          </button>
        </form>
      </div>
    </div>
  )
}
