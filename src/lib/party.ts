// No O/0 or I/1 — avoids ambiguous characters when a code is read aloud or typed.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length = 6): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export const TEAM_COLORS = [
  { bg: 'bg-indigo-500/20', border: 'border-indigo-400/40', text: 'text-indigo-300', label: 'Indigo' },
  { bg: 'bg-rose-500/20', border: 'border-rose-400/40', text: 'text-rose-300', label: 'Rose' },
  { bg: 'bg-emerald-500/20', border: 'border-emerald-400/40', text: 'text-emerald-300', label: 'Emerald' },
  { bg: 'bg-amber-500/20', border: 'border-amber-400/40', text: 'text-amber-300', label: 'Amber' },
]

export type PartyMode = 'teams' | 'tournament'

export interface PartyRoom {
  id: string
  code: string
  host_id: string
  subject: string
  grade_level: number
  seconds_per_question: number
  mode: PartyMode
  team_count: number
  team_size: number | null
  max_players: number | null
  ranked: boolean
  status: 'lobby' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
}

export interface PartyParticipant {
  id: string
  room_id: string
  user_id: string
  team_number: number
  joined_at: string
  username?: string
  avatar_url?: string | null
  equipped_frame?: string | null
}

export interface TournamentMatch {
  id: string
  room_id: string
  round: number
  slot: number
  player_a_id: string | null
  player_b_id: string | null
  battle_id: string | null
  winner_id: string | null
  created_at: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface BracketPairing {
  slot: number
  playerA: string | null
  playerB: string | null
  /** Set immediately when one side is a bye (no opponent) — the other side auto-advances. */
  byeWinner: string | null
}

// Builds round-1 pairings from a shuffled player list, padding with byes
// (null) up to the next power of 2 so every round halves cleanly.
export function buildFirstRoundPairings(playerIds: string[]): BracketPairing[] {
  const shuffled = shuffle(playerIds)
  let bracketSize = 1
  while (bracketSize < shuffled.length) bracketSize *= 2
  const padded: (string | null)[] = [...shuffled]
  while (padded.length < bracketSize) padded.push(null)

  const pairings: BracketPairing[] = []
  for (let i = 0; i < padded.length; i += 2) {
    const playerA = padded[i]
    const playerB = padded[i + 1]
    pairings.push({
      slot: i / 2,
      playerA,
      playerB,
      byeWinner: playerA && !playerB ? playerA : (!playerA && playerB ? playerB : null),
    })
  }
  return pairings
}

// Pairs up a round's winners (ordered by slot) into the next round's slots.
export function buildNextRoundPairings(winnerIdsBySlot: string[]): BracketPairing[] {
  const pairings: BracketPairing[] = []
  for (let i = 0; i < winnerIdsBySlot.length; i += 2) {
    const playerA = winnerIdsBySlot[i] ?? null
    const playerB = winnerIdsBySlot[i + 1] ?? null
    pairings.push({
      slot: i / 2,
      playerA,
      playerB,
      byeWinner: playerA && !playerB ? playerA : (!playerA && playerB ? playerB : null),
    })
  }
  return pairings
}
