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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Swords className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Create your profile</h1>
          <p className="text-sm text-gray-500 mt-1">Pick a username and your grade to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
            <input
              required
              minLength={3}
              maxLength={20}
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="coolkid42"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400 transition"
            />
            <p className="text-xs text-gray-400 mt-1">Letters, numbers, underscores only</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Grade</label>
            <div className="grid grid-cols-4 gap-1.5">
              {GRADES.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    grade === g ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-200 text-gray-700 hover:border-indigo-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !grade}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Start Battling! ⚔️'}
          </button>
        </form>
      </div>
    </div>
  )
}
