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

// Builds the actual (not just nominally-scheduled) end time for every
// question in order. A question ends at its full time allowance UNLESS
// every currently-accepted participant has answered it, in which case it
// ends shortly after the last of them answers. Each question's start is
// the PREVIOUS question's actual end — never a fixed multiple of
// start_at — so an early finish on question N doesn't leave question
// N+1's clock quietly inflated by the time that was saved. Every client
// derives this purely from team_battles.start_at + the polled
// team_battle_answers rows, so nothing needs to broadcast "next
// question" live.
export function computeQuestionSchedule(
  battle: TeamBattle,
  answers: TeamBattleAnswer[],
  participants: TeamBattleParticipant[],
  numQuestions: number
): number[] {
  const perQMs = battle.seconds_per_question * 1000
  const accepted = participants.filter(p => p.status === 'accepted')
  let t = new Date(battle.start_at).getTime()
  const ends: number[] = []
  for (let q = 0; q < numQuestions; q++) {
    const scheduledEnd = t + perQMs
    const qAnswers = answers.filter(a => a.question_index === q)
    const answeredIds = new Set(qAnswers.map(a => a.user_id))
    const everyoneAnswered = accepted.length > 0 && accepted.every(p => answeredIds.has(p.user_id))
    let end = scheduledEnd
    if (everyoneAnswered) {
      const latestAnswer = Math.max(...qAnswers.map(a => new Date(a.created_at).getTime()))
      end = Math.min(scheduledEnd, Math.max(t, latestAnswer + ADVANCE_BUFFER_MS))
    }
    ends.push(end)
    t = end
  }
  return ends
}

// Which question index should be showing right now, from the schedule above.
export function currentQuestionIndex(
  battle: TeamBattle,
  answers: TeamBattleAnswer[],
  participants: TeamBattleParticipant[],
  numQuestions: number
): number {
  if (msUntilStart(battle) > 0) return -1
  const now = Date.now()
  const ends = computeQuestionSchedule(battle, answers, participants, numQuestions)
  for (let q = 0; q < numQuestions; q++) {
    if (now < ends[q]) return q
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
