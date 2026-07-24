// Programmatic sound effects using Web Audio API — no external files needed

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  return ctx
}

function play(fn: (ctx: AudioContext) => void) {
  const c = getCtx()
  if (!c) return
  try { fn(c) } catch {}
}

export const sounds = {
  correct() {
    play(c => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.type = 'sine'
      o.frequency.setValueAtTime(520, c.currentTime)
      o.frequency.exponentialRampToValueAtTime(780, c.currentTime + 0.12)
      g.gain.setValueAtTime(0.25, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3)
      o.start(); o.stop(c.currentTime + 0.3)
    })
  },

  wrong() {
    play(c => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(220, c.currentTime)
      o.frequency.exponentialRampToValueAtTime(110, c.currentTime + 0.2)
      g.gain.setValueAtTime(0.2, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25)
      o.start(); o.stop(c.currentTime + 0.25)
    })
  },

  countdown() {
    play(c => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.type = 'sine'
      o.frequency.setValueAtTime(440, c.currentTime)
      g.gain.setValueAtTime(0.15, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08)
      o.start(); o.stop(c.currentTime + 0.08)
    })
  },

  win() {
    play(c => {
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const o = c.createOscillator()
        const g = c.createGain()
        o.connect(g); g.connect(c.destination)
        o.type = 'sine'
        const t = c.currentTime + i * 0.12
        o.frequency.setValueAtTime(freq, t)
        g.gain.setValueAtTime(0.2, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
        o.start(t); o.stop(t + 0.2)
      })
    })
  },

  lose() {
    play(c => {
      const notes = [392, 349, 311, 261]
      notes.forEach((freq, i) => {
        const o = c.createOscillator()
        const g = c.createGain()
        o.connect(g); g.connect(c.destination)
        o.type = 'sine'
        const t = c.currentTime + i * 0.13
        o.frequency.setValueAtTime(freq, t)
        g.gain.setValueAtTime(0.18, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        o.start(t); o.stop(t + 0.22)
      })
    })
  },

  click() {
    play(c => {
      const o = c.createOscillator()
      const g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.type = 'sine'
      o.frequency.setValueAtTime(600, c.currentTime)
      g.gain.setValueAtTime(0.08, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05)
      o.start(); o.stop(c.currentTime + 0.05)
    })
  },
}
