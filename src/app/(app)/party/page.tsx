'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Subject } from '@/types'
import { cn } from '@/lib/utils'
import { generateRoomCode, PartyMode } from '@/lib/party'
import { Users, PartyPopper } from 'lucide-react'

const SUBJECTS: { value: Subject; label: string; emoji: string }[] = [
  { value: 'math', label: 'Math', emoji: '🔢' },
  { value: 'science', label: 'Science', emoji: '🔬' },
  { value: 'history', label: 'History', emoji: '📜' },
  { value: 'english', label: 'English', emoji: '📚' },
]
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const TIME_OPTIONS = [10, 15, 20, 30]
const TEAM_COUNTS = [2, 3, 4]
const TEAM_SIZES = [2, 3, 4, 5]
const MAX_PLAYERS_OPTIONS = [4, 8, 16]

type Step = 'hub' | 'create' | 'join'

export default function PartyPage() {
  const [step, setStep] = useState<Step>('hub')
  const [mode, setMode] = useState<PartyMode>('teams')
  const [subject, setSubject] = useState<Subject>('math')
  const [grade, setGrade] = useState(5)
  const [seconds, setSeconds] = useState(15)
  const [teamCount, setTeamCount] = useState(2)
  const [teamSize, setTeamSize] = useState(4)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [ranked, setRanked] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function createRoom() {
    setCreating(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You must be signed in.'); return }

      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateRoomCode()
        const { data: room, error: roomErr } = await supabase.from('party_rooms').insert({
          code,
          host_id: user.id,
          subject,
          grade_level: grade,
          seconds_per_question: seconds,
          mode,
          team_count: mode === 'teams' ? teamCount : 1,
          team_size: mode === 'teams' ? teamSize : null,
          max_players: mode === 'tournament' ? maxPlayers : null,
          ranked: mode === 'teams' ? ranked : false,
        }).select().single()

        if (roomErr) {
          if (roomErr.code === '23505') continue // code collision — retry with a new one
          console.error('[Party] create room failed:', roomErr.message)
          setError(`Could not create room: ${roomErr.message}`)
          return
        }

        const { error: joinErr } = await supabase.from('party_participants').insert({
          room_id: room.id,
          user_id: user.id,
          team_number: 1,
        })
        if (joinErr) console.error('[Party] host self-join failed:', joinErr.message)

        router.push(`/party/${room.code}`)
        return
      }
      setError('Could not generate a unique room code — try again.')
    } catch (err: any) {
      console.error('[Party] create room threw:', err)
      setError(`Something went wrong: ${err?.message ?? 'unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    router.push(`/party/${code}`)
  }

  if (step === 'hub') {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center gap-2">
          <PartyPopper className="w-6 h-6 text-violet-400" />
          <h1 className="text-xl font-black text-white">🎉 Party Mode</h1>
        </div>
        <p className="text-sm text-white/40">Battle in teams or run a tournament with a group — host a room and share the code, or join one.</p>

        <button
          onClick={() => setStep('create')}
          className="w-full text-left rounded-3xl p-5 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center text-3xl flex-shrink-0">🎊</div>
          <div className="flex-1">
            <p className="font-black text-white text-base">Host a Party</p>
            <p className="text-xs text-white/50 mt-0.5">Teams or tournament — set it up and get a shareable room code.</p>
          </div>
          <span className="text-white/30 text-lg">→</span>
        </button>

        <div className="rounded-3xl p-5 border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-3xl flex-shrink-0"><Users className="w-7 h-7 text-indigo-300" /></div>
            <div>
              <p className="font-black text-white text-base">Join a Party</p>
              <p className="text-xs text-white/50 mt-0.5">Enter the room code someone shared with you.</p>
            </div>
          </div>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 text-sm font-black tracking-widest outline-none focus:border-indigo-400 transition uppercase"
            />
            <button type="submit" className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm transition">
              Join
            </button>
          </form>
        </div>

        <p className="text-xs text-center text-white/25">🚧 Teams battles are a lobby preview for now — Tournament mode is fully playable.</p>
      </div>
    )
  }

  // step === 'create'
  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('hub')} className="text-white/40 hover:text-white text-sm font-semibold transition">← Back</button>
        <h1 className="text-xl font-black text-white">🎊 Host a Party</h1>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">{error}</p>}

      {/* Mode */}
      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Format</p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('teams')}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl border-2 transition-all',
              mode === 'teams' ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
            )}
          >
            <span className="text-lg">👥</span>
            <span className="text-sm font-black">Teams</span>
          </button>
          <button
            onClick={() => setMode('tournament')}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-3 rounded-xl border-2 transition-all',
              mode === 'tournament' ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
            )}
          >
            <span className="text-lg">🏆</span>
            <span className="text-sm font-black">Tournament</span>
          </button>
        </div>
        <p className="text-[11px] text-white/40 mt-1.5 pl-1">
          {mode === 'teams'
            ? 'Split into teams. Lobby + team assignment work now; the live team battle itself is coming soon.'
            : 'Single-elimination bracket of normal 1v1 battles — fully playable once everyone joins.'}
        </p>
      </div>

      {/* Subject */}
      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Subject</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SUBJECTS.map(s => (
            <button
              key={s.value}
              onClick={() => setSubject(s.value)}
              className={cn(
                'flex items-center gap-1.5 p-2 rounded-xl border-2 text-xs font-semibold transition-all',
                subject === s.value ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
              )}
            >
              <span className="text-base">{s.emoji}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grade */}
      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Grade Level</p>
        <div className="grid grid-cols-6 gap-1">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={cn(
                'py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all',
                grade === g ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-indigo-400/50'
              )}
            >
              Gr.{g}
            </button>
          ))}
        </div>
      </div>

      {/* Time per question */}
      <div>
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Time per Question</p>
        <div className="flex gap-2">
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setSeconds(t)}
              className={cn(
                'flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all',
                seconds === t ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              )}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      {mode === 'teams' ? (
        <>
          {/* Team count */}
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Number of Teams</p>
            <div className="flex gap-2">
              {TEAM_COUNTS.map(t => (
                <button
                  key={t}
                  onClick={() => setTeamCount(t)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all',
                    teamCount === t ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                  )}
                >
                  {t} Teams
                </button>
              ))}
            </div>
          </div>

          {/* People per team */}
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">People per Team</p>
            <div className="flex gap-2">
              {TEAM_SIZES.map(t => (
                <button
                  key={t}
                  onClick={() => setTeamSize(t)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all',
                    teamSize === t ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Ranked toggle */}
          <div>
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Stakes</p>
            <div className="flex gap-2">
              <button
                onClick={() => setRanked(false)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all',
                  !ranked ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                )}
              >
                🎈 Unranked
              </button>
              <button
                onClick={() => setRanked(true)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border-2 text-sm font-black transition-all',
                  ranked ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                )}
              >
                🏆 Ranked
              </button>
            </div>
            {ranked && (
              <p className="text-[11px] text-amber-300/80 mt-1.5 bg-amber-500/10 border border-amber-400/20 rounded-lg px-2.5 py-1.5">
                Ranked team battles are still being designed — this room will start out unranked either way for now.
              </p>
            )}
          </div>
        </>
      ) : (
        <div>
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">Max Players</p>
          <div className="flex gap-2">
            {MAX_PLAYERS_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className={cn(
                  'flex-1 py-2 rounded-xl border-2 text-sm font-black transition-all',
                  maxPlayers === n ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/40 mt-1.5 pl-1">Odd numbers of players get a random bye in round 1. Each match is a normal ranked 1v1 battle.</p>
        </div>
      )}

      <button
        onClick={createRoom}
        disabled={creating}
        className="w-full py-4 rounded-2xl font-black text-white text-base bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition-all disabled:opacity-50"
      >
        {creating ? 'Creating room...' : 'Create Room 🎉'}
      </button>
    </div>
  )
}
