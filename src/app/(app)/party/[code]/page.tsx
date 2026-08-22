'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/profile/UserAvatar'
import { cn } from '@/lib/utils'
import { PartyRoom, PartyParticipant, TEAM_COLORS } from '@/lib/party'
import { PartyBracket } from '@/components/party/PartyBracket'
import { Copy, Check, LogOut } from 'lucide-react'

const SUBJECT_EMOJI: Record<string, string> = { math: '🔢', science: '🔬', history: '📜', english: '📚' }

export default function PartyLobbyPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [room, setRoom] = useState<PartyRoom | null>(null)
  const [participants, setParticipants] = useState<PartyParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [joining, setJoining] = useState(false)
  const [pickTeam, setPickTeam] = useState(1)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRoster = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('party_participants')
      .select('*, users!party_participants_user_id_fkey(username, avatar_url, equipped_frame)')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
    if (data) {
      setParticipants(data.map((row: any) => ({
        ...row,
        username: row.users?.username ?? 'Scholar',
        avatar_url: row.users?.avatar_url ?? null,
        equipped_frame: row.users?.equipped_frame ?? null,
      })))
    }
  }, [])

  const reloadRoom = useCallback(async (roomId: string) => {
    const { data } = await supabase.from('party_rooms').select('*').eq('id', roomId).maybeSingle()
    if (data) setRoom(data)
  }, [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: roomRow } = await supabase.from('party_rooms').select('*').eq('code', code.toUpperCase()).maybeSingle()
      if (!roomRow) { setNotFound(true); setLoading(false); return }
      setRoom(roomRow)
      await loadRoster(roomRow.id)
      setLoading(false)

      channel = supabase.channel(`party:${roomRow.code}`)
      channel
        .on('broadcast', { event: 'roster_changed' }, () => { loadRoster(roomRow.id) })
        .on('broadcast', { event: 'room_changed' }, () => { reloadRoom(roomRow.id) })
        .subscribe()
    }
    load()

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [code])

  async function notify(event: 'roster_changed' | 'room_changed') {
    if (!room) return
    const ch = supabase.channel(`party:${room.code}`)
    await ch.subscribe()
    await ch.send({ type: 'broadcast', event, payload: {} })
    supabase.removeChannel(ch)
  }

  async function joinRoom() {
    if (!room || !userId) return
    setJoining(true)
    setError(null)
    const { error: joinErr } = await supabase.from('party_participants').insert({
      room_id: room.id,
      user_id: userId,
      team_number: room.mode === 'teams' ? pickTeam : 1,
    })
    setJoining(false)
    if (joinErr) { setError('Could not join — try again.'); return }
    await loadRoster(room.id)
    notify('roster_changed')
  }

  async function switchTeam(team: number) {
    if (!room || !userId) return
    await supabase.from('party_participants').update({ team_number: team }).eq('room_id', room.id).eq('user_id', userId)
    await loadRoster(room.id)
    notify('roster_changed')
  }

  async function leaveRoom() {
    if (!room || !userId) return
    await supabase.from('party_participants').delete().eq('room_id', room.id).eq('user_id', userId)
    router.push('/party')
  }

  function copyCode() {
    navigator.clipboard.writeText(room?.code ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-bounce">🎉</div>
          <p className="text-white/50 font-semibold">Loading party...</p>
        </div>
      </div>
    )
  }

  if (notFound || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">😵</div>
          <p className="font-bold text-white">No room found for code "{code}"</p>
          <button onClick={() => router.push('/party')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition">
            Back to Party Mode
          </button>
        </div>
      </div>
    )
  }

  const isHost = userId === room.host_id
  const me = participants.find(p => p.user_id === userId)
  const teams = Array.from({ length: room.team_count }, (_, i) => i + 1)
  const isTournament = room.mode === 'tournament'

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">{isTournament ? '🏆' : '🎉'} Party Lobby</h1>
        <button onClick={leaveRoom} className="flex items-center gap-1 text-white/40 hover:text-red-400 text-xs font-semibold transition">
          <LogOut className="w-3.5 h-3.5" /> Leave
        </button>
      </div>

      {/* Room code */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-violet-600/25 to-fuchsia-600/15 border border-violet-400/20 text-center space-y-2">
        <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">Room Code</p>
        <div className="flex items-center justify-center gap-3">
          <p className="text-4xl font-black text-white tracking-[0.2em]">{room.code}</p>
          <button onClick={copyCode} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/70" />}
          </button>
        </div>
        <p className="text-xs text-white/40">Share this code so others can join</p>
      </div>

      {/* Settings summary */}
      <div className="flex flex-wrap gap-2">
        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70">
          {SUBJECT_EMOJI[room.subject] ?? '📘'} {room.subject}
        </span>
        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70">Grade {room.grade_level}</span>
        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70">⏱ {room.seconds_per_question}s/question</span>
        {isTournament ? (
          <>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70">🏆 Tournament{room.max_players ? ` · up to ${room.max_players}` : ''}</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500/10 border border-green-400/20 text-green-300">Ranked (normal 1v1 battles)</span>
          </>
        ) : (
          <>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/70">{room.team_count} teams{room.team_size ? ` · ${room.team_size}/team` : ''}</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-400/20 text-amber-300">🎈 Unranked</span>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-400/20 rounded-xl px-3 py-2">{error}</p>}

      {/* Tournament: bracket / lobby handled entirely by PartyBracket */}
      {isTournament && (
        <>
          {!me && room.status === 'lobby' ? (
            <button
              onClick={joinRoom}
              disabled={joining}
              className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-50"
            >
              {joining ? 'Joining...' : 'Join Tournament 🏆'}
            </button>
          ) : (
            <PartyBracket
              room={room}
              participants={participants}
              userId={userId}
              isHost={isHost}
              onStarted={() => { reloadRoom(room.id); notify('room_changed') }}
            />
          )}
        </>
      )}

      {/* Teams: join picker + roster + coming-soon start */}
      {!isTournament && (
        <>
          {!me && room.status === 'lobby' && (
            <div className="rounded-3xl p-4 border border-white/10 bg-white/5 space-y-3">
              <p className="text-sm font-bold text-white">Pick a team to join</p>
              <div className="flex gap-2 flex-wrap">
                {teams.map(t => {
                  const tc = TEAM_COLORS[(t - 1) % TEAM_COLORS.length]
                  return (
                    <button
                      key={t}
                      onClick={() => setPickTeam(t)}
                      className={cn(
                        'px-4 py-2 rounded-xl border-2 text-sm font-black transition-all',
                        pickTeam === t ? `${tc.border} ${tc.bg} ${tc.text}` : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
                      )}
                    >
                      Team {t}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={joinRoom}
                disabled={joining}
                className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-50"
              >
                {joining ? 'Joining...' : `Join Team ${pickTeam} 🎉`}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {teams.map(t => {
              const tc = TEAM_COLORS[(t - 1) % TEAM_COLORS.length]
              const members = participants.filter(p => p.team_number === t)
              return (
                <div key={t} className={cn('rounded-2xl p-3 border', tc.border, tc.bg)}>
                  <p className={cn('text-xs font-black uppercase tracking-wider mb-2', tc.text)}>Team {t} · {members.length}</p>
                  {members.length === 0 ? (
                    <p className="text-xs text-white/30 italic">No one yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {members.map(p => (
                        <div key={p.id} className="flex items-center gap-2">
                          <UserAvatar username={p.username ?? '?'} avatarUrl={p.avatar_url} frameId={p.equipped_frame} size="sm" />
                          <p className="text-sm font-semibold text-white">
                            {p.username}
                            {p.user_id === room.host_id && <span className="ml-1.5 text-[10px] text-violet-300 font-bold">HOST</span>}
                            {p.user_id === userId && <span className="ml-1.5 text-[10px] text-white/30">(you)</span>}
                          </p>
                          {p.user_id === userId && room.status === 'lobby' && (
                            <button
                              onClick={() => {
                                const next = t === room.team_count ? 1 : t + 1
                                switchTeam(next)
                              }}
                              className="ml-auto text-[10px] text-white/40 hover:text-white transition font-semibold"
                            >
                              Switch team →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pt-2">
            {isHost ? (
              <div className="space-y-1.5">
                <button
                  disabled
                  title="Full Party Mode team battles are coming soon"
                  className="w-full py-4 rounded-2xl font-black text-white/50 text-base bg-white/5 border border-white/10 cursor-not-allowed"
                >
                  🚧 Start Battle (Coming Soon)
                </button>
                <p className="text-xs text-center text-white/25">The lobby works — the live team battle itself is being built next.</p>
              </div>
            ) : (
              <p className="text-center text-sm text-white/40">Waiting for the host to start the battle...</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
