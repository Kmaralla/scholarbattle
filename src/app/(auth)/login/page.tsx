'use client'
import { useState } from 'react'
import { Swords } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Dynamic import ensures Supabase client only created in browser
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (!error) setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">ScholarBattle</h1>
          <p className="text-sm text-gray-500">Battle your friends. Learn more. Climb the ranks.</p>
        </div>

        {!sent ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-indigo-400 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Continue with Email ✉️'}
            </button>
          </form>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
            <p className="font-semibold">Check your email! 📬</p>
            <p className="mt-1 text-green-600">We sent a magic link to {email}</p>
          </div>
        )}

        <p className="text-xs text-gray-400">No password needed · Works on any device</p>
      </div>
    </div>
  )
}
