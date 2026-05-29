import { useState, useCallback } from 'react'
import { useTrail } from '../../hooks/useTrail'

export default function MapDashboard() {
  const { state, dispatch } = useTrail()
  const result = state.result
  if (!result) return null

  const tooShort = result.totalDistanceKm < 0.1

  const stats = [
    { label: '等效平地', value: tooShort ? '0.0 km' : `${result.equivalentFlatDistanceKm.toFixed(1)} km` },
    { label: '预估耗时', value: tooShort ? formatTime(state.userProfile.targetTimeMinutes) : formatTime(result.totalTimeMinutes) },
    { label: '累计下降', value: `-${result.elevationLossM} m`, color: 'text-[#00ffff]' },
    { label: '平均配速', value: tooShort ? '-:--/km' : formatPace(result.totalTimeMinutes / result.totalDistanceKm) },
  ]

  return (
    <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
      <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-3 w-fit max-w-[420px]">
        {/* Stats row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <EditableStat
            label="距离"
            suffix="km"
            parsed={state.trackPoints.length > 0 ? state.trackPoints[state.trackPoints.length - 1].cumulativeDistanceKm : 0}
            display={result.totalDistanceKm}
            override={state.distanceOverrideKm}
            onSet={v => dispatch({ type: 'SET_DISTANCE_OVERRIDE', value: v })}
            step={0.1}
          />

          <EditableStat
            label="累计爬升"
            suffix="m"
            parsed={result.elevationGainM > 0 ? result.elevationGainM : getOriginalClimb(state)}
            display={result.elevationGainM}
            override={state.climbOverrideM}
            onSet={v => dispatch({ type: 'SET_CLIMB_OVERRIDE', value: v })}
            step={1}
            color="text-[#ff00ff]"
          />

          {stats.map(s => (
            <div key={s.label} className="pointer-events-auto">
              <span className="text-[10px] text-[#aeaeb2] uppercase tracking-wider">{s.label}</span>
              <span className={`block text-sm font-mono font-semibold text-white ${s.color || ''}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Disclaimer — fills empty space naturally, mobile-first sizing */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-[10px] md:text-[11px] leading-relaxed text-gray-400 md:text-gray-300">
            💡 数据说明：导出的轨迹在第三方 App 中显示的爬升可能会因过滤算法不同而产生视觉误差。请放心，这绝不影响当前为您生成的精准补给策略。
          </p>
        </div>
      </div>
    </div>
  )
}

function EditableStat({
  label, suffix, parsed, display, override, onSet, step, color,
}: {
  label: string; suffix: string; parsed: number; display: number; override: number | null
  onSet: (v: number | null) => void; step: number; color?: string
}) {
  const [editing, setEditing] = useState(false)
  const actual = override ?? parsed

  const commit = useCallback((raw: string) => {
    setEditing(false)
    const v = parseFloat(raw)
    if (isNaN(v) || v <= 0 || Math.abs(v - parsed) < step * 0.5) {
      onSet(null)
    } else {
      onSet(Math.round(v * 100) / 100)
    }
  }, [parsed, onSet, step])

  if (editing) {
    return (
      <div className="pointer-events-auto">
        <span className="text-[10px] text-[#aeaeb2] uppercase tracking-wider">{label}</span>
        <input
          type="number" inputMode="decimal" step={step}
          defaultValue={actual}
          autoFocus
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditing(false) }}
          className="block text-sm font-mono font-semibold text-white bg-white/10 rounded px-1 w-20 border border-white/20 focus:outline-none focus:border-accent-400"
        />
      </div>
    )
  }

  return (
    <div className="pointer-events-auto cursor-text group" onClick={() => setEditing(true)}>
      <span className="text-[10px] text-[#aeaeb2] uppercase tracking-wider">
        {label}
        {override != null && <span className="ml-1 text-accent-400" title="支持根据官方路书手动校准">✎</span>}
      </span>
      <span className={`block text-sm font-mono font-semibold text-white ${color || ''}`}>
        {display.toFixed(suffix === 'km' ? 1 : 0)}{suffix === 'km' ? ' km' : ' m'}
        {override == null && (
          <span className="ml-1 text-[10px] text-[#aeaeb2] font-normal group-hover:opacity-100 opacity-0 transition-opacity" title="支持根据官方路书手动校准">✎</span>
        )}
        {override != null && (
          <span className="ml-1 text-[10px] text-accent-400 font-normal">已校准</span>
        )}
      </span>
    </div>
  )
}

function getOriginalClimb(state: ReturnType<typeof useTrail>['state']): number {
  let gain = 0
  for (let i = 1; i < state.trackPoints.length; i++) {
    const d = state.trackPoints[i].ele - state.trackPoints[i - 1].ele
    if (d > 0) gain += d
  }
  return Math.round(gain)
}

function formatTime(m: number): string { const h = Math.floor(m / 60); const r = m % 60; return h > 0 ? `${h}h${r}m` : `${r}min` }
function formatPace(p: number): string { const min = Math.floor(p); const sec = Math.round((p - min) * 60); return `${min}:${sec.toString().padStart(2, '0')}/km` }