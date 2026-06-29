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
    id: 'word-scramble',
    name: 'Word Scramble',
    description: 'Unscramble jumbled words before time runs out',
    emoji: '🔤',
    coinCost: 50,
    subjects: ['english'],
    fun: 3,
    color: 'from-blue-400 to-blue-600',
  },
  {
    id: 'math-sprint',
    name: 'Math Sprint',
    description: 'Solve as many math problems as you can in 30 seconds',
    emoji: '⚡',
    coinCost: 50,
    subjects: ['math'],
    fun: 3,
    color: 'from-green-400 to-green-600',
  },
  {
    id: 'hangman',
    name: 'Hangman',
    description: 'Guess the hidden word letter by letter',
    emoji: '🪢',
    coinCost: 100,
    subjects: ['english', 'science', 'history'],
    fun: 3,
    color: 'from-orange-400 to-orange-600',
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Match question and answer pairs — flip cards to find pairs',
    emoji: '🧠',
    coinCost: 200,
    subjects: ['all'],
    fun: 4,
    color: 'from-purple-400 to-purple-600',
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
