'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { pickQuestionIndices } from '@/lib/questions'
import { Subject } from '@/types'
import {
  PartyRoom,
  PartyParticipant,
  TournamentMatch,
  buildFirstRoundPairings,
  buildNextRoundPairings,
} from '@/lib/party'
import { UserAvatar } from '@/components/profile/UserAvatar'

const POLL_MS = 4000

export function PartyBracket({
  room,
  participants,
  userId,
  isHost,
  onStarted,
}: {
  room: PartyRoom
  participants: PartyParticipant[]
  userId: string | null
  isHost: boolean
  onStarted: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [starting, setStarting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerInfo = new Map(participants.map(p => [p.user_id, p]))

  const loadMatches = useCallback(async () => {
    const { data } = await supabase
      .from('party_tournament_matches')
      .select('*')
      .eq('room_id', room.id)
      .order('round', { ascending: true })
      .order('slot', { ascending: true })
    if (data) setMatches(data as TournamentMatch[])
  }, [room.id])

  useEffect(() => {
    loadMatches()
    if (room.status !== 'in_progress') return
    const interval = setInterval(loadMatches, POLL_MS)
    return () => clearInterval(interval)
  }, [room.status, loadMatches])

  // Bracket generation needs the host to create battles between two OTHER
  // paired players, which the normal battles-table policy (auth.uid() =
  // challenger_id) blocks — so this goes through a SECURITY DEFINER RPC
  // that checks host-ness explicitly instead.
  async function createMatchesForRound(round: number, pairings: ReturnType<typeof buildFirstRoundPairings>) {
    const payload = pairings.map(p => ({
      slot: p.slot,
      player_a: p.playerA,
      player_b: p.playerB,
      bye_winner: p.byeWinner,
      question_ids: p.playerA && p.playerB ? pickQuestionIndices(room.subject as Subject, room.grade_level, 10) : [],
    }))
    const { error } = await supabase.rpc('create_tournament_matches', {
      p_room_id: room.id,
      p_round: round,
      p_pairings: payload,
    })
    if (error) throw error
  }

  async function startTournament() {
    if (participants.length < 2) { setError('Need at least 2 players to start.'); return }
    setStarting(true)
    setError(null)
    try {
      const pairings = buildFirstRoundPairings(participants.map(p => p.user_id))
      await createMatchesForRound(1, pairings)
      const { error } = await supabase.from('party_rooms').update({ status: 'in_progress' }).eq('id', room.id)
      if (error) throw error
      onStarted()
      await loadMatches()
    } catch (err: any) {
      console.error('[Party] start tournament failed:', err)
      setError(err?.message ?? 'Could not generate the bracket — try again.')
    } finally {
      setStarting(false)
    }
  }

  const maxRound = matches.reduce((m, x) => Math.max(m, x.round), 0)
  const currentRoundMatches = matches.filter(m => m.round === maxRound)
  const allDecided = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.winner_id)

  async function advanceRound() {
    setAdvancing(true)
    setError(null)
    try {
      const winners = currentRoundMatches
        .sort((a, b) => a.slot - b.slot)
        .map(m => m.winner_id)
        .filter((w): w is string => !!w)

      if (winners.length === 1) {
        const { error } = await supabase.from('party_rooms').update({ status: 'completed' }).eq('id', room.id)
        if (error) throw error
        await loadMatches()
        return
      }

      const nextPairings = buildNextRoundPairings(winners)
      await createMatchesForRound(maxRound + 1, nextPairings)
      await loadMatches()
    } catch (err: any) {
      console.error('[Party] advance round failed:', err)
      setError(err?.message ?? 'Could not advance the round — try again.')
    } finally {
      setAdvancing(false)
    }
  }

  function nameFor(id: string | null) {
    if (!id) return 'Bye'
    return playerInfo.get(id)?.username ?? 'Scholar'
  }

  if (room.status === 'lobby') {
    return (
      <div className="rounded-3xl p-4 border border-white/10 bg-white/5 space-y-3">
        <p className="text-sm font-bold text-white">
          {participants.length} player{participants.length !== 1 ? 's' : ''} joined
        </p>
        <div className="flex flex-wrap gap-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full pl-1 pr-3 py-1">
              <UserAvatar username={p.username ?? '?'} avatarUrl={p.avatar_url} frameId={p.equipped_frame} size="sm" />
              <span className="text-xs font-semibold text-white">{p.username}{p.user_id === userId && ' (you)'}</span>
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {isHost ? (
          <button
            onClick={startTournament}
            disabled={starting || participants.length < 2}
            className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-50"
          >
            {starting ? 'Generating bracket...' : participants.length < 2 ? 'Need 2+ players' : 'Generate Bracket & Start 🏆'}
          </button>
        ) : (
          <p className="text-center text-sm text-white/40">Waiting for the host to start the tournament...</p>
        )}
      </div>
    )
  }

  if (room.status === 'completed') {
    const finalMatch = matches.find(m => m.round === maxRound)
    const champion = finalMatch?.winner_id
    return (
      <div className="rounded-3xl p-6 border border-yellow-400/30 bg-yellow-500/10 text-center space-y-2">
        <p className="text-4xl">🏆</p>
        <p className="text-lg font-black text-white">{champion ? nameFor(champion) : 'Champion'} wins the tournament!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: maxRound }, (_, i) => i + 1).map(round => (
        <div key={round} className="rounded-2xl p-3 border border-white/10 bg-white/5">
          <p className="text-xs font-black uppercase tracking-wider text-white/40 mb-2">Round {round}</p>
          <div className="space-y-1.5">
            {matches.filter(m => m.round === round).sort((a, b) => a.slot - b.slot).map(m => {
              const iAmIn = m.player_a_id === userId || m.player_b_id === userId
              const canPlay = iAmIn && m.battle_id && !m.winner_id
              return (
                <div key={m.id} className="flex items-center justify-between gap-2 bg-white/5 rounded-xl px-3 py-2">
                  <div className="text-sm">
                    <span className={cn('font-semibold', m.winner_id === m.player_a_id ? 'text-green-400' : 'text-white/70')}>{nameFor(m.player_a_id)}</span>
                    <span className="text-white/30 mx-1.5">vs</span>
                    <span className={cn('font-semibold', m.winner_id === m.player_b_id ? 'text-green-400' : 'text-white/70')}>{nameFor(m.player_b_id)}</span>
                  </div>
                  {canPlay && (
                    <button
                      onClick={() => router.push(`/battle/${m.battle_id}?timeout=${room.seconds_per_question}`)}
                      className="text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-full px-3 py-1.5 transition flex-shrink-0"
                    >
                      Play Now →
                    </button>
                  )}
                  {!m.winner_id && !canPlay && !m.battle_id && (
                    <span className="text-xs text-white/30 flex-shrink-0">Bye</span>
                  )}
                  {!m.winner_id && m.battle_id && !canPlay && (
                    <span className="text-xs text-white/30 flex-shrink-0">In progress...</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {isHost && allDecided && (
        <button
          onClick={advanceRound}
          disabled={advancing}
          className="w-full py-3 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 transition disabled:opacity-50"
        >
          {advancing ? 'Advancing...' : currentRoundMatches.length === 1 ? 'Crown Champion 🏆' : 'Advance to Next Round →'}
        </button>
      )}
    </div>
  )
}
