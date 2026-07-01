'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopicPicker } from '@/components/battle/TopicPicker'
import { Subject, User } from '@/types'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BotDifficulty } from '@/components/battle/BattleRoom'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { Swords } from 'lucide-react'

type Mode = 'hub' | 'random' | 'bot' | 'friend'
type Step = 'pick' | 'searching' | 'found'

const TIMEOUT_MS = 20000

const BOT_OPTIONS: { difficulty: BotDifficulty; label: string; emoji: string; desc: string }[] = [
  { difficulty: 'easy',   label: 'Easy',   emoji: '🟢', desc: 'Slow and sometimes wrong — great for warming up.' },
  { difficulty: 'medium', label: 'Medium', emoji: '🟡', desc: 'A real challenge. Answers in 3–8 seconds.' },
  { difficulty: 'hard',   label: 'Hard',   emoji: '🔴', desc: 'Fast and accurate. Think you can beat it?' },
]

export default function MatchmakingPage() {
  const [mode, setMode]         = useState<Mode>('hub')
  const [step, setStep]         = useState<Step>('pick')
  const [subject, setSubject]   = useState<Subject | null>(null)
  const [grade, setGrade]       = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(20)
  const [statusMsg, setStatusMsg] = useState('Looking for an opponent...')
  const [botDiff, setBotDiff]   = useState<BotDifficulty>('medium')
  const [friends, setFriends]   = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const channelRef    = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const router        = useRouter()
  const supabase      = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) setCurrentUser(data) })
    })
  }, [])

  // Load accepted friends when friend mode selected
  useEffect(() => {
    if (mode !== 'friend' || !currentUser) return
    async function loadFriends() {
      const { data: rows } = await supabase
        .from('friendships').select('friend_id')
        .eq('user_id', currentUser!.id).eq('status', 'accepted')
      if (!rows || rows.length === 0) { setFriends([]); return }
      const ids = rows.map((r: any) => r.friend_id)
      const { data: users } = await supabase.from('users').select('*').in('id', ids)
      if (users) setFriends(users)
    }
    loadFriends()
  }, [mode, currentUser])

  function cleanup() {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  // ── Random matchmaking ────────────────────────────────────────
  async function startSearch(s: Subject, g: number) {
    setSubject(s); setGrade(g); setStep('searching'); setTimeLeft(20)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id, username, elo_rating').eq('id', user.id).single()
    if (!profile) return

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

        const opponent = others[0]
        setStep('found')
        setStatusMsg(`Found ${opponent.username}! Starting battle...`)

        if (user.id < opponent.user_id) {
          const { data: battle } = await supabase.from('battles').insert({
            challenger_id: user.id,
            opponent_id: opponent.user_id,
            subject: s, grade_level: g,
            status: 'in_progress',
            challenger_score: 0, opponent_score: 0, question_ids: [],
          }).select().single()
          if (battle) {
            await channel.send({ type: 'broadcast', event: 'battle_ready', payload: { battle_id: battle.id } })
            cleanup(); router.push(`/battle/${battle.id}`)
          }
        }
      })
      .on('broadcast', { event: 'battle_ready' }, ({ payload }) => {
        cleanup(); router.push(`/battle/${payload.battle_id}`)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED')
          await channel.track({ user_id: user.id, username: profile.username, elo: profile.elo_rating })
      })

    countdownRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(countdownRef.current!); return 0 } return t - 1 })
    }, 1000)

    timerRef.current = setTimeout(() => {
      cleanup(); setStep('pick')
      setStatusMsg('No opponent found. Try again or play vs Scholar Bot.')
    }, TIMEOUT_MS)
  }

  function cancelSearch() { cleanup(); setStep('pick') }

  // ── Bot battle ────────────────────────────────────────────────
  async function startBotBattle(s: Subject, g: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: battle } = await supabase.from('battles').insert({
      challenger_id: user.id,
      opponent_id: user.id,
      subject: s, grade_level: g,
      status: 'in_progress',
      challenger_score: 0, opponent_score: 0, question_ids: [],
    }).select().single()
    if (battle) router.push(`/battle/${battle.id}?difficulty=${botDiff}`)
  }

  // ── Friend challenge ──────────────────────────────────────────
  async function challengeFriend(friend: User, s: Subject, g: number) {
    if (!currentUser) return
    const { data: battle } = await supabase.from('battles').insert({
      challenger_id: currentUser.id,
      opponent_id: friend.id,
      subject: s, grade_level: g,
      status: 'pending',
      challenger_score: 0, opponent_score: 0, question_ids: [],
    }).select().single()
    if (!battle) return

    const notifChannel = supabase.channel(`challenge:${friend.id}`)
    await notifChannel.subscribe()
    await notifChannel.send({
      type: 'broadcast', event: 'incoming_challenge',
      payload: { battle_id: battle.id, challenger_username: currentUser.username, subject: s, grade_level: g },
    })
    supabase.removeChannel(notifChannel)
    router.push(`/battle/${battle.id}`)
  }

  useEffect(() => () => cleanup(), [])

  // ── Hub ───────────────────────────────────────────────────────
  if (mode === 'hub') {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h1 className="text-xl font-black text-white">⚔️ Battle</h1>
        <p className="text-sm text-white/40">Choose how you want to battle.</p>

        <div className="space-y-3">
          {/* Random */}
          <button
            onClick={() => setMode('random')}
            className="w-full text-left rounded-3xl p-5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-3xl flex-shrink-0">🌍</div>
            <div className="flex-1">
              <p className="font-black text-white text-base">Random Online Battle</p>
              <p className="text-xs text-white/50 mt-0.5">Get matched with a real player online. Ranked — ELO is on the line.</p>
            </div>
            <span className="text-white/30 text-lg">→</span>
          </button>

          {/* Bot */}
          <button
            onClick={() => setMode('bot')}
            className="w-full text-left rounded-3xl p-5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center text-3xl flex-shrink-0">🤖</div>
            <div className="flex-1">
              <p className="font-black text-white text-base">vs Scholar Bot</p>
              <p className="text-xs text-white/50 mt-0.5">Battle the AI at Easy, Medium, or Hard. Low-stakes ranked practice.</p>
            </div>
            <span className="text-white/30 text-lg">→</span>
          </button>

          {/* Friend */}
          <button
            onClick={() => setMode('friend')}
            className="w-full text-left rounded-3xl p-5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center text-3xl flex-shrink-0">👥</div>
            <div className="flex-1">
              <p className="font-black text-white text-base">Challenge a Friend</p>
              <p className="text-xs text-white/50 mt-0.5">Pick a friend from your list and send them a battle invite.</p>
            </div>
            <span className="text-white/30 text-lg">→</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Random flow ───────────────────────────────────────────────
  if (mode === 'random') {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setMode('hub'); setStep('pick'); setStatusMsg('Looking for an opponent...') }} className="text-white/40 hover:text-white text-sm font-semibold transition">← Back</button>
          <h1 className="text-xl font-black text-white">🌍 Random Online Battle</h1>
        </div>

        {step === 'pick' && (
          <Card>
            <CardContent className="p-5 space-y-3">
              {statusMsg !== 'Looking for an opponent...' && (
                <p className="text-sm text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">{statusMsg}</p>
              )}
              <p className="text-sm text-white/50">Pick a topic — we'll match you with someone online playing the same subject and grade.</p>
              <TopicPicker onSelect={startSearch} />
            </CardContent>
          </Card>
        )}

        {(step === 'searching' || step === 'found') && (
          <Card>
            <CardContent className="p-8 flex flex-col items-center gap-5">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className={cn('absolute inset-0 rounded-full border-4', step === 'found' ? 'border-green-400' : 'border-indigo-300 animate-ping opacity-60')} />
                <div className={cn('absolute inset-3 rounded-full border-4', step === 'found' ? 'border-green-500' : 'border-indigo-400 animate-ping opacity-40')} style={{ animationDelay: '0.3s' }} />
                <span className="text-3xl z-10">{step === 'found' ? '🎯' : '🔍'}</span>
              </div>
              <div className="text-center space-y-1">
                <p className="font-black text-white text-lg">{statusMsg}</p>
                {step === 'searching' && (
                  <p className="text-white/50 text-sm">Matching on <span className="font-semibold capitalize text-white/80">{subject}</span> · Grade {grade}</p>
                )}
              </div>
              {step === 'searching' && (
                <>
                  <div className="w-full space-y-1">
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / 20) * 100}%` }} />
                    </div>
                    <p className="text-xs text-center text-white/40">
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

  // ── Bot flow ──────────────────────────────────────────────────
  if (mode === 'bot') {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('hub')} className="text-white/40 hover:text-white text-sm font-semibold transition">← Back</button>
          <h1 className="text-xl font-black text-white">🤖 vs Scholar Bot</h1>
        </div>

        {/* Difficulty picker */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-bold text-white/60 uppercase tracking-wider text-xs">Difficulty</p>
            <div className="grid grid-cols-3 gap-2">
              {BOT_OPTIONS.map(opt => (
                <button
                  key={opt.difficulty}
                  onClick={() => setBotDiff(opt.difficulty)}
                  className={cn(
                    'rounded-2xl p-3 border text-center transition-all',
                    botDiff === opt.difficulty
                      ? 'bg-white/15 border-white/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <p className="text-2xl mb-1">{opt.emoji}</p>
                  <p className="text-xs font-black text-white">{opt.label}</p>
                  <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <p className="text-sm text-white/50">Pick a subject and grade, then battle the bot.</p>
            <TopicPicker onSelect={startBotBattle} />
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Friend flow ───────────────────────────────────────────────
  if (mode === 'friend') {
    return (
      <FriendChallengeFlow
        currentUser={currentUser}
        friends={friends}
        onBack={() => setMode('hub')}
        onChallenge={challengeFriend}
      />
    )
  }

  return null
}

// ── Friend challenge sub-view ─────────────────────────────────
function FriendChallengeFlow({
  currentUser,
  friends,
  onBack,
  onChallenge,
}: {
  currentUser: User | null
  friends: User[]
  onBack: () => void
  onChallenge: (friend: User, subject: Subject, grade: number) => void
}) {
  const [selected, setSelected] = useState<User | null>(null)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-white/40 hover:text-white text-sm font-semibold transition">← Back</button>
        <h1 className="text-xl font-black text-white">👥 Challenge a Friend</h1>
      </div>

      {!selected ? (
        <Card>
          <CardContent className="p-4 space-y-2">
            {friends.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6">No friends yet — add some on the Friends page!</p>
            ) : (
              <>
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">Pick who to challenge</p>
                {friends.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => setSelected(friend)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                  >
                    <UserAvatar username={friend.username} avatarUrl={(friend as any).avatar_url} size="md" />
                    <div className="flex-1 text-left">
                      <p className="font-bold text-white text-sm">{friend.username}</p>
                      <p className="text-xs text-white/40 capitalize">{friend.rank_tier} · {friend.elo_rating} ELO</p>
                    </div>
                    <Swords className="w-4 h-4 text-white/30" />
                  </button>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <UserAvatar username={selected.username} avatarUrl={(selected as any).avatar_url} size="md" />
            <div className="flex-1">
              <p className="font-black text-white">{selected.username}</p>
              <p className="text-xs text-white/40 capitalize">{selected.rank_tier} · {selected.elo_rating} ELO</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white text-xs font-semibold transition">Change</button>
          </div>
          <Card>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-white/50">Pick a subject and grade for the battle.</p>
              <TopicPicker onSelect={(s, g) => onChallenge(selected, s, g)} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
