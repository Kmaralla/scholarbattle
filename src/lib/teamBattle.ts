export interface TeamBattle {
  id: string
  host_id: string
  subject: string
  grade_level: number
  seconds_per_question: number
  teams_enabled: boolean
  question_ids: number[]
  points_to_win: number
  start_at: string
  status: 'in_progress' | 'completed' | 'cancelled'
  winning_team: number | null
  created_at: string
}

export interface TeamBattleParticipant {
  id: string
  team_battle_id: string
  user_id: string
  team_number: number
  status: 'invited' | 'accepted' | 'declined'
  username?: string
  avatar_url?: string | null
  equipped_frame?: string | null
}

export interface TeamBattleAnswer {
  id: string
  team_battle_id: string
  user_id: string
  question_index: number
  is_correct: boolean
  time_ms: number
  created_at: string
}

const ADVANCE_BUFFER_MS = 1000

// Each question is open until either its full time allowance elapses, or
// someone answers it (plus a short buffer so everyone sees it was
// answered) — whichever comes first. Every client derives this purely
// from team_battles.start_at + the polled team_battle_answers rows, so
// nothing needs to broadcast "next question" live; as soon as a client's
// poll picks up an answer, it reaches the same conclusion every other
// client will reach once their poll catches up.
export function questionEndTime(
  battle: TeamBattle,
  answers: TeamBattleAnswer[],
  questionIndex: number
): number {
  const perQMs = battle.seconds_per_question * 1000
  const scheduledStart = new Date(battle.start_at).getTime() + questionIndex * perQMs
  const scheduledEnd = scheduledStart + perQMs
  const qAnswers = answers.filter(a => a.question_index === questionIndex)
  if (qAnswers.length === 0) return scheduledEnd
  const earliestAnswer = Math.min(...qAnswers.map(a => new Date(a.created_at).getTime()))
  return Math.min(scheduledEnd, Math.max(scheduledStart, earliestAnswer + ADVANCE_BUFFER_MS))
}

// Which question index should be showing right now — walks the schedule
// forward from start_at, letting each question end early the moment
// someone answers it (see questionEndTime).
export function currentQuestionIndex(
  battle: TeamBattle,
  answers: TeamBattleAnswer[],
  numQuestions: number
): number {
  if (msUntilStart(battle) > 0) return -1
  const now = Date.now()
  for (let q = 0; q < numQuestions; q++) {
    if (now < questionEndTime(battle, answers, q)) return q
  }
  return numQuestions
}

export function msUntilStart(battle: TeamBattle): number {
  return new Date(battle.start_at).getTime() - Date.now()
}

// A team scores a question's point only if EVERY accepted member answered
// it correctly; among teams that cleared that bar, fastest combined answer
// time wins the point.
export function computeTeamScores(
  answers: TeamBattleAnswer[],
  participants: TeamBattleParticipant[],
  questionsSoFar: number
): Record<number, number> {
  const accepted = participants.filter(p => p.status === 'accepted')
  const teamSizes = new Map<number, number>()
  for (const p of accepted) {
    teamSizes.set(p.team_number, (teamSizes.get(p.team_number) ?? 0) + 1)
  }
  const teamOf = new Map(accepted.map(p => [p.user_id, p.team_number]))

  const scores: Record<number, number> = {}
  for (const t of teamSizes.keys()) scores[t] = 0

  for (let q = 0; q < questionsSoFar; q++) {
    const qAnswers = answers.filter(a => a.question_index === q)
    const byTeam = new Map<number, TeamBattleAnswer[]>()
    for (const a of qAnswers) {
      const t = teamOf.get(a.user_id)
      if (t == null) continue
      if (!byTeam.has(t)) byTeam.set(t, [])
      byTeam.get(t)!.push(a)
    }

    let bestTeam: number | null = null
    let bestTime = Infinity
    for (const [team, teamAnswers] of byTeam) {
      const expected = teamSizes.get(team) ?? 0
      if (expected === 0 || teamAnswers.length < expected) continue // not everyone on the team has answered yet
      if (!teamAnswers.every(a => a.is_correct)) continue // someone got it wrong
      const totalTime = teamAnswers.reduce((sum, a) => sum + a.time_ms, 0)
      if (totalTime < bestTime) { bestTime = totalTime; bestTeam = team }
    }
    if (bestTeam != null) scores[bestTeam] = (scores[bestTeam] ?? 0) + 1
  }

  return scores
}
