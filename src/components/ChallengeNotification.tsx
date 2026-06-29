'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Swords, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Subject, SUBJECT_COLORS } from '@/types'

interface ChallengePayload {
  battle_id: string
  challenger_username: string
  subject: Subject
  grade_level: number
}

export function ChallengeNotification({ userId }: { userId: string }) {
  const [challenge, setChallenge] = useState<ChallengePayload | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [visible, setVisible] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase.channel(`challenge:${userId}`)
    channel
      .on('broadcast', { event: 'incoming_challenge' }, ({ payload }) => {
        setChallenge(payload as ChallengePayload)
        setVisible(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function accept() {
    if (!challenge) return
    setAccepting(true)
    await supabase.from('battles')
      .update({ status: 'in_progress' })
      .eq('id', challenge.battle_id)
    router.push(`/battle/${challenge.battle_id}`)
    setVisible(false)
  }

  function decline() {
    if (challenge) {
      supabase.from('battles').update({ status: 'declined' }).eq('id', challenge.battle_id)
    }
    setVisible(false)
    setChallenge(null)
  }

  if (!visible || !challenge) return null

  return (
    <div className={cn(
      'fixed bottom-24 right-4 z-50 md:bottom-6',
      'w-80 bg-white rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden',
      'animate-in slide-in-from-bottom-4 duration-300'
    )}>
      {/* Header */}
      <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-white" />
          <span className="text-white font-bold text-sm">Battle Challenge!</span>
        </div>
        <button onClick={decline} className="text-indigo-200 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700">
          <span className="font-bold text-gray-900">{challenge.challenger_username}</span> challenged you to a battle!
        </p>
        <div className="flex items-center gap-2">
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border capitalize', SUBJECT_COLORS[challenge.subject])}>
            {challenge.subject}
          </span>
          <span className="text-xs text-gray-500">Grade {challenge.grade_level}</span>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={decline}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Decline
          </button>
          <button
            onClick={accept}
            disabled={accepting}
            className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {accepting ? 'Joining...' : '⚔️ Accept'}
          </button>
        </div>
      </div>
    </div>
  )
}
