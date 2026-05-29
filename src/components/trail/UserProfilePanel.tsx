import { useState, useCallback } from 'react'
import { useTrail } from '../../hooks/useTrail'
import Card from '../layout/Card'

export default function UserProfilePanel() {
  const { state, dispatch } = useTrail()
  const p = state.userProfile
  const result = state.result
  const totalMin = p.targetTimeMinutes
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60

  function setHours(h: number) {
    dispatch({ type: 'SET_USER_PROFILE', profile: { targetTimeMinutes: h * 60 + minutes } })
  }
  function setMinutes(m: number) {
    dispatch({ type: 'SET_USER_PROFILE', profile: { targetTimeMinutes: hours * 60 + m } })
  }
  function setTempC(v: number) {
    dispatch({ type: 'SET_USER_PROFILE', profile: { tempC: v } })
  }
  function setWeight(v: number) {
    dispatch({ type: 'SET_USER_PROFILE', profile: { weightKg: v } })
  }

  const tooShort = result ? result.totalDistanceKm < 0.1 : true

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">运动参数</h3>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* 目标完赛 */}
        <div>
          <label className="text-[10px] sm:text-[11px] text-[#86868b] dark:text-[#8e8e93] uppercase block mb-1">
            目标完赛
          </label>
          <div className="flex items-center gap-0.5 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-lg px-2 h-11">
            <input
              type="number" inputMode="decimal" min={0} max={48} value={hours}
              onChange={e => setHours(Math.max(0, Number(e.target.value)))}
              className="w-8 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none [appearance:textfield]"
            />
            <span className="text-[11px] text-[#aeaeb2]">h</span>
            <input
              type="number" inputMode="decimal" min={0} max={59} value={minutes}
              onChange={e => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
              className="w-8 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none [appearance:textfield]"
            />
            <span className="text-[11px] text-[#aeaeb2]">m</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] sm:text-[11px] text-[#86868b] dark:text-[#8e8e93] uppercase block mb-1">
            气温
          </label>
          <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-lg px-2 h-11">
            <input
              type="number" inputMode="decimal" min={-20} max={50} value={p.tempC}
              onChange={e => setTempC(Number(e.target.value))}
              className="w-12 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none [appearance:textfield]"
            />
            <span className="text-[11px] text-[#aeaeb2]">°C</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] sm:text-[11px] text-[#86868b] dark:text-[#8e8e93] uppercase block mb-1">
            体重
          </label>
          <div className="flex items-center gap-1 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-lg px-2 h-11">
            <input
              type="number" inputMode="decimal" min={30} max={150} value={p.weightKg}
              onChange={e => setWeight(Number(e.target.value))}
              className="w-12 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none [appearance:textfield]"
            />
            <span className="text-[11px] text-[#aeaeb2]">kg</span>
          </div>
        </div>
      </div>

      {/* ===== 路线总览数据（融合自 MapDashboard） ===== */}
      {result && (
        <>
          <hr className="border-t border-black/10 dark:border-white/10 my-3" />

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
            <StatItem label="等效平地" value={tooShort ? '0.0 km' : `${result.equivalentFlatDistanceKm.toFixed(1)} km`} />
            <StatItem label="预估耗时" value={tooShort ? formatTime(state.userProfile.targetTimeMinutes) : formatTime(result.totalTimeMinutes)} />
            <StatItem label="累计下降" value={`-${result.elevationLossM} m`} color="text-[#00ffff]" />
            <StatItem label="平均配速" value={tooShort ? '-:--/km' : formatPace(result.totalTimeMinutes / result.totalDistanceKm)} />
          </div>

          {/* 代谢数据 */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[#aeaeb2] dark:text-[#636366]">
            <span>热量 <strong className="text-[#1d1d1f] dark:text-white">{result.kcalPerHour}kcal/h</strong></span>
            <span>碳水 <strong className="text-[#1d1d1f] dark:text-white">{result.carbsGPerHour}g/h</strong></span>
            <span>钠 <strong className="text-[#1d1d1f] dark:text-white">{result.sodiumMgPerHour}mg/h</strong></span>
          </div>

          {/* Disclaimer */}
          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10">
            <p className="text-[10px] md:text-[11px] leading-relaxed text-[#86868b] dark:text-[#636366]">
              💡 数据说明：导出的轨迹在第三方 App 中显示的爬升可能会因过滤算法不同而产生视觉误差。请放心，这绝不影响当前为您生成的精准补给策略。
            </p>
          </div>
        </>
      )}
    </Card>
  )
}

// ---- helpers ----

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span className="text-[10px] text-[#86868b] dark:text-[#aeaeb2] uppercase tracking-wider">{label}</span>
      <span className={`block text-sm font-mono font-semibold text-[#1d1d1f] dark:text-white ${color || ''}`}>{value}</span>
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
      <div>
        <span className="text-[10px] text-[#86868b] dark:text-[#aeaeb2] uppercase tracking-wider">{label}</span>
        <input
          type="number" inputMode="decimal" step={step}
          defaultValue={actual}
          autoFocus
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditing(false) }}
          className="block text-sm font-mono font-semibold text-[#1d1d1f] dark:text-white bg-[#f5f5f7] dark:bg-white/10 rounded px-1 w-20 border border-black/10 dark:border-white/20 focus:outline-none focus:border-accent-400"
        />
      </div>
    )
  }

  return (
    <div className="cursor-text group" onClick={() => setEditing(true)}>
      <span className="text-[10px] text-[#86868b] dark:text-[#aeaeb2] uppercase tracking-wider">
        {label}
        {override != null && <span className="ml-1 text-accent-500" title="支持根据官方路书手动校准">✎</span>}
      </span>
      <span className={`block text-sm font-mono font-semibold text-[#1d1d1f] dark:text-white ${color || ''}`}>
        {display.toFixed(suffix === 'km' ? 1 : 0)}{suffix === 'km' ? ' km' : ' m'}
        {override == null && (
          <span className="ml-1 text-[10px] text-[#86868b] dark:text-[#aeaeb2] font-normal group-hover:opacity-100 opacity-0 transition-opacity" title="支持根据官方路书手动校准">✎</span>
        )}
        {override != null && (
          <span className="ml-1 text-[10px] text-accent-500 font-normal">已校准</span>
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