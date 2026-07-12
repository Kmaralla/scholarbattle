'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const DEFAULT_DARK  = '#0e0b2e'
const DEFAULT_LIGHT = '#eeeaff'

const DARK_PRESETS  = [DEFAULT_DARK, '#0a0f1e', '#0d1117', '#0a1a0f', '#1a0a0a', '#0a1520', '#1a1000']
const LIGHT_PRESETS = [DEFAULT_LIGHT, '#ffffff', '#fdf8f0', '#f0fff4', '#f0f8ff', '#fff5f0', '#fef9e7']

// Shifts a hex color slightly lighter (positive) or darker (negative)
function shiftHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  darkBg: string
  lightBg: string
  setDarkBg: (c: string) => void
  setLightBg: (c: string) => void
  darkPresets: string[]
  lightPresets: string[]
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark', toggle: () => {},
  darkBg: DEFAULT_DARK, lightBg: DEFAULT_LIGHT,
  setDarkBg: () => {}, setLightBg: () => {},
  darkPresets: DARK_PRESETS, lightPresets: LIGHT_PRESETS,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [darkBg,  setDarkBgState]  = useState(DEFAULT_DARK)
  const [lightBg, setLightBgState] = useState(DEFAULT_LIGHT)

  useEffect(() => {
    const savedTheme  = (localStorage.getItem('theme') as Theme) ?? 'dark'
    const savedDark   = localStorage.getItem('darkBg')  ?? DEFAULT_DARK
    const savedLight  = localStorage.getItem('lightBg') ?? DEFAULT_LIGHT
    setTheme(savedTheme)
    setDarkBgState(savedDark)
    setLightBgState(savedLight)
    applyTheme(savedTheme, savedDark, savedLight)
  }, [])

  function applyTheme(t: Theme, dark: string, light: string) {
    const html = document.documentElement
    const bg = t === 'dark' ? dark : light
    const nav = t === 'dark' ? shiftHex(dark, 15) : shiftHex(light, -12)
    html.style.setProperty('--background', bg)
    html.style.setProperty('--bg-base', bg)
    html.style.setProperty('--bg-nav', nav)
    if (t === 'light') { html.classList.add('light'); html.classList.remove('dark') }
    else               { html.classList.add('dark');  html.classList.remove('light') }
  }

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next, darkBg, lightBg)
  }

  function setDarkBg(c: string) {
    setDarkBgState(c)
    localStorage.setItem('darkBg', c)
    if (theme === 'dark') applyTheme('dark', c, lightBg)
  }

  function setLightBg(c: string) {
    setLightBgState(c)
    localStorage.setItem('lightBg', c)
    if (theme === 'light') applyTheme('light', darkBg, c)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, darkBg, lightBg, setDarkBg, setLightBg, darkPresets: DARK_PRESETS, lightPresets: LIGHT_PRESETS }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
