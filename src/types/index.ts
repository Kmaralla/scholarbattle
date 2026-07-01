export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type Subject = 'math' | 'science' | 'history' | 'english'
export type BattleStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined'
export type FriendshipStatus = 'pending' | 'accepted'
export type QuestionType = 'multiple_choice' | 'typed'

export interface User {
  id: string
  username: string
  avatar_url: string | null
  elo_rating: number
  rank_tier: RankTier
  grade_level: number
  total_wins: number
  total_battles: number
  created_at: string
}

export interface Question {
  id: string
  subject: Subject
  grade_level: number
  question_text: string
  type: QuestionType
  options: string[] | null
  correct_answer: string
  explanation?: string
  difficulty: number
  source: 'curated' | 'ai_generated'
}

export interface Battle {
  id: string
  challenger_id: string
  opponent_id: string
  subject: Subject
  grade_level: number
  status: BattleStatus
  winner_id: string | null
  challenger_score: number
  opponent_score: number
  question_ids: string[]
  created_at: string
  completed_at: string | null
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  friend?: User
}

export interface BattleAnswer {
  battle_id: string
  user_id: string
  question_id: string
  answer: string
  is_correct: boolean
  time_ms: number
}

export interface PresenceState {
  user_id: string
  username: string
  online_at: string
}

export const RANK_THRESHOLDS: Record<RankTier, [number, number]> = {
  bronze:   [1000, 1199],
  silver:   [1200, 1399],
  gold:     [1400, 1599],
  platinum: [1600, 1799],
  diamond:  [1800, 9999],
}

export const RANK_COLORS: Record<RankTier, string> = {
  bronze:   'text-amber-700 bg-amber-100',
  silver:   'text-gray-600 bg-gray-100',
  gold:     'text-yellow-600 bg-yellow-100',
  platinum: 'text-cyan-600 bg-cyan-100',
  diamond:  'text-blue-500 bg-blue-100',
}

export const SUBJECT_COLORS: Record<Subject, string> = {
  math:    'bg-yellow-100 text-yellow-800 border-yellow-300',
  science: 'bg-green-100 text-green-800 border-green-300',
  history: 'bg-blue-100 text-blue-800 border-blue-300',
  english: 'bg-purple-100 text-purple-800 border-purple-300',
}

export function getRankTier(elo: number): RankTier {
  if (elo >= 1800) return 'diamond'
  if (elo >= 1600) return 'platinum'
  if (elo >= 1400) return 'gold'
  if (elo >= 1200) return 'silver'
  return 'bronze'
}

export function calculateElo(winnerElo: number, loserElo: number): [number, number] {
  const K = 32
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  const expectedLoser = 1 - expectedWinner
  const newWinnerElo = Math.round(winnerElo + K * (1 - expectedWinner))
  const newLoserElo = Math.round(loserElo + K * (0 - expectedLoser))
  return [newWinnerElo, newLoserElo]
}
