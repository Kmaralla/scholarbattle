'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { Subject } from '@/types'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = 'pick' | 'searching' | 'found'

const TIMEOUT_MS = 20000

export default function MatchmakingPage() {
  const [step, setStep] = useState<Step>('pick')
  const [subject, setSubject] = useState<Subject | null>(null)
  const [grade, setGrade] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(20)
  const [statusMsg, setStatusMsg] = useState('Looking for an opponent...')
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function cleanup() {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  async function startSearch(s: Subject, g: number) {
    setSubject(s)
    setGrade(g)
    setStep('searching')
    setTimeLeft(20)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('users').select('id, username, elo_rating').eq('id', user.id).single()
    if (!profile) return

    // Join the matchmaking presence channel for this subject+grade combo
    const channelName = `matchmaking:${s}:${g}`
    const channel = supabase.channel(channelName, { config: { presence: { key: user.id } } })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, async () => {
        const state = channel.presenceState<{ user_id: string; username: string; elo: number }>()
        const others = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([, vals]) => (vals as any[])[0])

        if (others.length === 0) return

        // Pair with first available opponent
        const opponent = others[0]
        setStep('found')
        setStatusMsg(`Found ${opponent.username}! Starting battle...`)

        // Smaller user ID creates the battle (prevents double-creation)
        if (user.id < opponent.user_id) {
          const { data: battle } = await supabase.from('battles').insert({
            challenger_id: user.id,
            opponent_id: opponent.user_id,
            subject: s,
            grade_level: g,
            status: 'in_progress',
            challenger_score: 0,
            opponent_score: 0,
            question_ids: [],
          }).select().single()

          if (battle) {
            // Broadcast battle ID to opponent
            await channel.send({ type: 'broadcast', event: 'battle_ready', payload: { battle_id: battle.id } })
            cleanup()
            router.push(`/battle/${battle.id}`)
          }
        }
        // Larger ID waits for battle_ready broadcast
      })
      .on('broadcast', { event: 'battle_ready' }, ({ payload }) => {
        cleanup()
        router.push(`/battle/${payload.battle_id}`)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, username: profile.username, elo: profile.elo_rating })
        }
      })

    // Countdown timer
    countdownRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)

    // Timeout → give up
    timerRef.current = setTimeout(() => {
      cleanup()
      setStep('pick')
      setStatusMsg('No opponent found. Try again or play vs Scholar Bot.')
    }, TIMEOUT_MS)
  }

  function cancelSearch() {
    cleanup()
    setStep('pick')
  }

  useEffect(() => () => cleanup(), [])

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-xl font-black text-white">⚔️ Random Online Battle</h1>

      {step === 'pick' && (
        <Card>
          <CardContent className="p-5 space-y-2">
            {statusMsg !== 'Looking for an opponent...' && (
              <p className="text-sm text-amber-600 font-semibold bg-amber-50 rounded-xl px-3 py-2">{statusMsg}</p>
            )}
            <p className="text-sm text-gray-500">Pick a topic — we'll match you with someone online playing the same subject and grade.</p>
            <TopicPicker onSelect={startSearch} />
          </CardContent>
        </Card>
      )}

      {(step === 'searching' || step === 'found') && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-5">
            {/* Animated radar */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className={cn(
                'absolute inset-0 rounded-full border-4',
                step === 'found' ? 'border-green-400' : 'border-indigo-300 animate-ping opacity-60'
              )} />
              <div className={cn(
                'absolute inset-3 rounded-full border-4',
                step === 'found' ? 'border-green-500' : 'border-indigo-400 animate-ping opacity-40'
              )} style={{ animationDelay: '0.3s' }} />
              <span className="text-3xl z-10">{step === 'found' ? '🎯' : '🔍'}</span>
            </div>

            <div className="text-center space-y-1">
              <p className="font-black text-gray-900 text-lg">{statusMsg}</p>
              {step === 'searching' && (
                <p className="text-gray-400 text-sm">
                  Matching on <span className="font-semibold capitalize text-gray-600">{subject}</span> · Grade {grade}
                </p>
              )}
            </div>

            {step === 'searching' && (
              <>
                {/* Countdown bar */}
                <div className="w-full space-y-1">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(timeLeft / 20) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-400">
                    {timeLeft > 0 ? `Giving up in ${timeLeft}s if no match found` : 'No opponent found...'}
                  </p>
                </div>
                <Button variant="secondary" onClick={cancelSearch}>Cancel</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
