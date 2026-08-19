import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateElo, getRankTier } from '@/types'
import { checkNewBadges } from '@/lib/badges'
import { COIN_REWARDS } from '@/lib/games'

const TOTAL_QUESTIONS = 10
const DIFFICULTY_ELO_BONUS: Record<string, number> = { easy: 6, medium: 10, hard: 16 }

export async function POST(req: NextRequest) {
  try {
    const { battleId, myScore, theirScore, botDifficulty } = await req.json()

    if (typeof battleId !== 'string') {
      return NextResponse.json({ error: 'battleId is required' }, { status: 400 })
    }
    if (!Number.isInteger(myScore) || myScore < 0 || myScore > TOTAL_QUESTIONS
      || !Number.isInteger(theirScore) || theirScore < 0 || theirScore > TOTAL_QUESTIONS) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 })
    }

    // Identify the caller from their real session — this is the one part of
    // the request that can't be spoofed.
    const authedSupabase = await createServerClient()
    const { data: { user } } = await authedSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: battle } = await admin.from('battles').select('*').eq('id', battleId).single()
    if (!battle) {
      return NextResponse.json({ error: 'battle not found' }, { status: 404 })
    }
    if (user.id !== battle.challenger_id && user.id !== battle.opponent_id) {
      return NextResponse.json({ error: 'not a participant in this battle' }, { status: 403 })
    }

    const isChallenger = user.id === battle.challenger_id
    const isSolo = battle.challenger_id === battle.opponent_id
    const rewardedColumn = isChallenger ? 'challenger_rewarded' : 'opponent_rewarded'

    // Guarded claim: only succeeds once per battle per side, atomically —
    // a repeat call (or a race between two near-simultaneous calls) no-ops.
    const { data: claimed } = await admin
      .from('battles')
      .update({ [rewardedColumn]: true })
      .eq('id', battleId)
      .eq(rewardedColumn, false)
      .select()
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: 'reward already claimed for this battle' }, { status: 409 })
    }

    const { data: profile } = await admin
      .from('users')
      .select('elo_rating, coins, total_wins, total_battles, season_wins, badges')
      .eq('id', user.id)
      .single()
    if (!profile) {
      return NextResponse.json({ error: 'profile not found' }, { status: 404 })
    }

    const currentElo = profile.elo_rating
    const iWon = myScore > theirScore
    const tied = myScore === theirScore
    let eloDelta = 0
    let coinsEarned = 0

    if (isSolo) {
      const difficulty = ['easy', 'medium', 'hard'].includes(botDifficulty) ? botDifficulty : 'medium'
      const eloBase = DIFFICULTY_ELO_BONUS[difficulty] ?? 10
      if (iWon) eloDelta = eloBase
      else if (!tied) eloDelta = -Math.floor(eloBase / 2)

      const coinKey = `bot_${difficulty}` as keyof typeof COIN_REWARDS
      const baseReward = COIN_REWARDS[coinKey] ?? 10
      coinsEarned = iWon ? baseReward : tied ? 0 : -Math.floor(baseReward / 2)
    } else {
      coinsEarned = iWon ? COIN_REWARDS.pvp_win : tied ? COIN_REWARDS.pvp_tie : -COIN_REWARDS.pvp_loss

      if (!tied) {
        const opponentId = isChallenger ? battle.opponent_id : battle.challenger_id
        const { data: opponentProfile } = await admin.from('users').select('elo_rating').eq('id', opponentId).single()
        if (opponentProfile) {
          const winnerElo = iWon ? currentElo : opponentProfile.elo_rating
          const loserElo = iWon ? opponentProfile.elo_rating : currentElo
          const [newWinnerElo, newLoserElo] = calculateElo(winnerElo, loserElo)
          const myNewElo = iWon ? newWinnerElo : newLoserElo
          eloDelta = myNewElo - currentElo
        }
      }
    }

    const newElo = Math.max(100, currentElo + eloDelta)
    const newTotalWins = iWon ? profile.total_wins + 1 : profile.total_wins
    const newTotalBattles = profile.total_battles + 1
    const currentBadges: string[] = profile.badges ?? []

    const newBadges = checkNewBadges({
      iWon, tied,
      myScore,
      totalQuestions: TOTAL_QUESTIONS,
      subject: battle.subject,
      isSolo,
      botDifficulty,
      newElo,
      newTotalBattles,
      newTotalWins,
      currentBadges,
    })

    const { error: updateErr } = await admin.from('users').update({
      elo_rating: newElo,
      rank_tier: getRankTier(newElo),
      total_wins: newTotalWins,
      total_battles: newTotalBattles,
      season_wins: iWon && !isSolo ? profile.season_wins + 1 : profile.season_wins,
      coins: Math.max(0, profile.coins + coinsEarned),
      badges: newBadges.length > 0 ? [...currentBadges, ...newBadges] : currentBadges,
    }).eq('id', user.id)

    if (updateErr) {
      console.error('[battle/complete] reward update failed:', updateErr.message)
      return NextResponse.json({ error: 'could not save reward' }, { status: 500 })
    }

    return NextResponse.json({ eloDelta, coinsEarned, newBadges })
  } catch (err: any) {
    console.error('[battle/complete] error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}
