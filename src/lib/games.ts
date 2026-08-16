export interface GameDef {
  id: string
  name: string
  description: string
  emoji: string
  coinCost: number
  subjects: string[]   // 'all' or specific subjects
  fun: number          // 1–5 star rating displayed
  color: string        // tailwind gradient classes
}

export const GAMES: GameDef[] = [
  {
    id: 'flashcards',
    name: 'Flashcards',
    description: 'Flip through cards and test your memory',
    emoji: '🃏',
    coinCost: 0,
    subjects: ['all'],
    fun: 2,
    color: 'from-slate-400 to-slate-600',
  },
  {
    id: 'speed-quiz',
    name: 'Speed Quiz',
    description: 'Lightning-fast 20-question blitz — beat the clock!',
    emoji: '🏎️',
    coinCost: 400,
    subjects: ['all'],
    fun: 5,
    color: 'from-rose-400 to-pink-600',
  },
]

export const COIN_REWARDS = {
  bot_easy: 5,
  bot_medium: 10,
  bot_hard: 20,
  pvp_win: 30,
  pvp_loss: 5,
  pvp_tie: 15,
}
