'use client'
import { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'

export function ColorsSidePanel() {
  const [open, setOpen] = useState(false)
  const { theme, darkBg, lightBg, setDarkBg, setLightBg, darkPresets, lightPresets } = useTheme()

  const isDark = theme === 'dark'
  const current = isDark ? darkBg : lightBg
  const setter  = isDark ? setDarkBg : setLightBg
  const presets = isDark ? darkPresets : lightPresets

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Side tab + panel */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">

        {/* Sliding panel */}
        <div
          className={`transition-all duration-300 overflow-hidden ${open ? 'w-64 opacity-100' : 'w-0 opacity-0'}`}
        >
          <div className="w-64 bg-[var(--bg-nav)] border border-white/15 rounded-l-2xl shadow-2xl p-4 space-y-4">
            <p className="font-black text-white text-sm">🎨 Background Color</p>
            <p className="text-[11px] text-white/40 capitalize">{theme} mode</p>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-2">
              {presets.map(color => (
                <button
                  key={color}
                  onClick={() => setter(color)}
                  title={color}
                  className="w-full aspect-square rounded-xl border-2 transition-all hover:scale-110"
                  style={{
                    background: color,
                    borderColor: current === color ? '#818cf8' : 'rgba(255,255,255,0.15)',
                    boxShadow: current === color ? '0 0 0 2px #818cf8' : 'none',
                  }}
                />
              ))}

              {/* Custom picker */}
              <label
                className="w-full aspect-square rounded-xl border-2 border-white/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-all overflow-hidden relative bg-white/5"
                title="Custom color"
              >
                <span className="text-white/60 text-lg leading-none">+</span>
                <input
                  type="color"
                  value={current}
                  onChange={e => setter(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>

            {/* Current color */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
              <div className="w-4 h-4 rounded-md border border-white/20 flex-shrink-0" style={{ background: current }} />
              <span className="text-xs text-white/40 font-mono">{current}</span>
            </div>
          </div>
        </div>

        {/* Tab button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-col items-center justify-center gap-1.5 bg-[var(--bg-nav)] border border-white/15 border-r-0 rounded-l-2xl px-2 py-5 shadow-xl hover:bg-white/10 transition-all"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <span className="text-base">🎨</span>
          <span className="text-[11px] font-black text-white/70 tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>Colors</span>
        </button>

      </div>
    </>
  )
}
