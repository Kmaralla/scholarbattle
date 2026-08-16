export type Frame = {
  id: string
  name: string
  coinCost: number
  border: string   // tailwind border classes
  glow?: string     // tailwind shadow classes
  special?: 'rainbow'
}

export const FRAMES: Frame[] = [
  { id: 'none',    name: 'Default',  coinCost: 0,   border: 'border-2 border-white/20' },
  { id: 'bronze',  name: 'Bronze',   coinCost: 75,  border: 'border-4 border-amber-600' },
  { id: 'silver',  name: 'Silver',   coinCost: 150, border: 'border-4 border-slate-300' },
  { id: 'gold',    name: 'Gold',     coinCost: 300, border: 'border-4 border-yellow-400', glow: 'shadow-lg shadow-yellow-400/40' },
  { id: 'diamond', name: 'Diamond',  coinCost: 500, border: 'border-4 border-cyan-300',   glow: 'shadow-lg shadow-cyan-300/40' },
  { id: 'prism',   name: 'Prism',    coinCost: 800, border: 'border-4 border-transparent', special: 'rainbow' },
]

export const FRAME_MAP = Object.fromEntries(FRAMES.map(f => [f.id, f]))
