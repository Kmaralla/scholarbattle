'use client'
import { useTheme } from '@/components/ThemeProvider'

export function BgColorPicker() {
  const { theme, darkBg, lightBg, setDarkBg, setLightBg, darkPresets, lightPresets } = useTheme()

  const isDark = theme === 'dark'
  const current = isDark ? darkBg : lightBg
  const setter  = isDark ? setDarkBg : setLightBg
  const presets = isDark ? darkPresets : lightPresets

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <h2 className="font-black text-white text-sm flex items-center gap-2">
        🎨 Background Color
        <span className="text-white/30 font-normal text-xs capitalize">({theme} mode)</span>
      </h2>

      {/* Preset swatches */}
      <div className="flex gap-2 flex-wrap">
        {presets.map(color => (
          <button
            key={color}
            onClick={() => setter(color)}
            title={color}
            className="w-8 h-8 rounded-xl border-2 transition-all hover:scale-110"
            style={{
              background: color,
              borderColor: current === color ? '#818cf8' : 'rgba(255,255,255,0.15)',
              boxShadow: current === color ? '0 0 0 2px #818cf8' : 'none',
            }}
          />
        ))}

        {/* Custom color picker */}
        <label className="w-8 h-8 rounded-xl border-2 border-white/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-all overflow-hidden relative" title="Custom color">
          <span className="text-base">＋</span>
          <input
            type="color"
            value={current}
            onChange={e => setter(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>

      {/* Current color preview */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md border border-white/20 flex-shrink-0" style={{ background: current }} />
        <span className="text-xs text-white/40 font-mono">{current}</span>
        {!presets.includes(current) && (
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">custom</span>
        )}
      </div>
    </div>
  )
}
