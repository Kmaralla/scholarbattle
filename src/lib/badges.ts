export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type Badge = {
  id: string
  name: string
  emoji: string
  description: string
  rarity: BadgeRarity
}

export const BADGES: Badge[] = [
  // Common
  { id: 'first_battle',    name: 'First Steps',     emoji: '⚔️',  description: 'Complete your first battle',          rarity: 'common'    },
  { id: 'first_win',       name: 'First Victory',   emoji: '🏆',  description: 'Win your first battle',               rarity: 'common'    },
  { id: 'math_warrior',    name: 'Math Warrior',    emoji: '🔢',  description: 'Win a Math battle',                   rarity: 'common'    },
  { id: 'science_warrior', name: 'Science Warrior', emoji: '🔬',  description: 'Win a Science battle',                rarity: 'common'    },
  { id: 'history_warrior', name: 'History Warrior', emoji: '📜',  description: 'Win a History battle',                rarity: 'common'    },
  { id: 'english_warrior', name: 'Word Warrior',    emoji: '📝',  description: 'Win an English battle',               rarity: 'common'    },
  // Rare
  { id: 'sharp_shooter',   name: 'Sharp Shooter',   emoji: '🎯',  description: 'Score 8 or more in a single battle',  rarity: 'rare'      },
  { id: 'perfect',         name: 'Perfect Score',   emoji: '💯',  description: 'Score 10/10 in a battle',             rarity: 'rare'      },
  { id: 'veteran',         name: 'Veteran',         emoji: '🛡️',  description: 'Complete 10 battles',                 rarity: 'rare'      },
  { id: 'ten_wins',        name: '10 Wins',         emoji: '🥇',  description: 'Win 10 battles',                      rarity: 'rare'      },
  { id: 'bot_slayer',      name: 'Bot Slayer',      emoji: '🤖',  description: 'Beat the Hard bot',                   rarity: 'rare'      },
  // Epic
  { id: 'silver_rank',     name: 'Silver Scholar',  emoji: '🥈',  description: 'Reach Silver rank',                   rarity: 'epic'      },
  { id: 'gold_rank',       name: 'Gold Scholar',    emoji: '🥇',  description: 'Reach Gold rank',                     rarity: 'epic'      },
  { id: 'twenty_five_wins',name: '25 Wins',         emoji: '🔥',  description: 'Win 25 battles',                      rarity: 'epic'      },
  // Legendary
  { id: 'platinum_rank',   name: 'Platinum Scholar',emoji: '💎',  description: 'Reach Platinum rank',                 rarity: 'legendary' },
  { id: 'diamond_rank',    name: 'Diamond Scholar', emoji: '👑',  description: 'Reach Diamond rank',                  rarity: 'legendary' },
  { id: 'fifty_wins',      name: 'Legend',          emoji: '🌟',  description: 'Win 50 battles',                      rarity: 'legendary' },
]

export const BADGE_MAP = Object.fromEntries(BADGES.map(b => [b.id, b]))

export const RARITY_STYLES: Record<BadgeRarity, { border: string; bg: string; label: string; glow: string }> = {
  common:    { border: 'border-slate-400/40',  bg: 'bg-slate-700/30',   label: 'text-slate-300',  glow: '' },
  rare:      { border: 'border-blue-400/50',   bg: 'bg-blue-900/30',    label: 'text-blue-300',   glow: 'shadow-blue-500/20' },
  epic:      { border: 'border-violet-400/50', bg: 'bg-violet-900/30',  label: 'text-violet-300', glow: 'shadow-violet-500/20' },
  legendary: { border: 'border-yellow-400/60', bg: 'bg-yellow-900/30',  label: 'text-yellow-300', glow: 'shadow-yellow-500/30' },
}

export type BattleContext = {
  iWon: boolean
  tied: boolean
  myScore: number
  totalQuestions: number
  subject: string
  isSolo: boolean
  botDifficulty?: string
  newElo: number
  newTotalBattles: number
  newTotalWins: number
  currentBadges: string[]
}

export function checkNewBadges(ctx: BattleContext): string[] {
  const earned: string[] = []
  const already = new Set(ctx.currentBadges)

  function check(id: string, condition: boolean) {
    if (condition && !already.has(id)) earned.push(id)
  }

  check('first_battle',    ctx.newTotalBattles >= 1)
  check('first_win',       ctx.iWon && ctx.newTotalWins >= 1)
  check('math_warrior',    ctx.iWon && ctx.subject === 'math')
  check('science_warrior', ctx.iWon && ctx.subject === 'science')
  check('history_warrior', ctx.iWon && ctx.subject === 'history')
  check('english_warrior', ctx.iWon && ctx.subject === 'english')
  check('sharp_shooter',   ctx.myScore >= 8)
  check('perfect',         ctx.myScore === ctx.totalQuestions && ctx.totalQuestions >= 10)
  check('veteran',         ctx.newTotalBattles >= 10)
  check('ten_wins',        ctx.newTotalWins >= 10)
  check('bot_slayer',      ctx.iWon && ctx.isSolo && ctx.botDifficulty === 'hard')
  check('silver_rank',     ctx.newElo >= 1100)
  check('gold_rank',       ctx.newElo >= 1300)
  check('twenty_five_wins',ctx.newTotalWins >= 25)
  check('platinum_rank',   ctx.newElo >= 1600)
  check('diamond_rank',    ctx.newElo >= 2000)
  check('fifty_wins',      ctx.newTotalWins >= 50)

  return earned
}
