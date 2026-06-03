import { useState, useCallback, useEffect } from 'react'
import { useTrail } from '../../hooks/useTrail'
import Card from '../layout/Card'

export default function UserProfilePanel() {
  const { state, dispatch } = useTrail()
  const p = state.userProfile
  const result = state.result
  const totalMin = p.targetTimeMinutes
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60

  // 本地字符串态：允许用户全选删除，onBlur 时校验并提交
  const [hoursStr, setHoursStr] = useState(String(hours))
  const [minutesStr, setMinutesStr] = useState(String(minutes))
  const [tempStr, setTempStr] = useState(String(p.tempC))
  const [weightStr, setWeightStr] = useState(String(p.weightKg))
  useEffect(() => { setHoursStr(String(Math.floor(p.targetTimeMinutes / 60))) }, [p.targetTimeMinutes])
  useEffect(() => { setMinutesStr(String(p.targetTimeMinutes % 60)) }, [p.targetTimeMinutes])
  useEffect(() => { setTempStr(String(p.tempC)) }, [p.tempC])
  useEffect(() => { setWeightStr(String(p.weightKg)) }, [p.weightKg])

  const tooShort = result ? result.totalDistanceKm < 0.1 : true

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">运动参数</h3>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
        {/* 目标完赛 */}
        <div>
          <label className="text-[10px] sm:text-[11px] text-[#86868b] dark:text-[#8e8e93] uppercase block mb-1">
            目标完赛
          </label>
          <div className="flex items-center gap-0.5 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-lg px-2 h-11">
            <input
              type="text" inputMode="decimal" value={hoursStr}
              onChange={e => setHoursStr(e.target.value)}
              onBlur={() => {
                const n = parseInt(hoursStr, 10)
                if (isNaN(n)) setHoursStr(String(Math.floor(p.targetTimeMinutes / 60)))
                else dispatch({ type: 'SET_USER_PROFILE', profile: { targetTimeMinutes: Math.max(0, Math.min(48, n)) * 60 + (p.targetTimeMinutes % 60) } })
              }}
              className="w-8 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none"
            />
            <span className="text-[11px] text-[#aeaeb2]">h</span>
            <input
              type="text" inputMode="decimal" value={minutesStr}
              onChange={e => setMinutesStr(e.target.value)}
              onBlur={() => {
                const n = parseInt(minutesStr, 10)
                if (isNaN(n)) setMinutesStr(String(p.targetTimeMinutes % 60))
                else dispatch({ type: 'SET_USER_PROFILE', profile: { targetTimeMinutes: Math.floor(p.targetTimeMinutes / 60) * 60 + Math.max(0, Math.min(59, n)) } })
              }}
              className="w-8 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none"
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
              type="text" inputMode="decimal" value={tempStr}
              onChange={e => setTempStr(e.target.value)}
              onBlur={() => {
                const n = parseInt(tempStr, 10)
                if (isNaN(n)) setTempStr(String(p.tempC))
                else dispatch({ type: 'SET_USER_PROFILE', profile: { tempC: Math.max(-20, Math.min(50, n)) } })
              }}
              className="w-12 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none"
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
              type="text" inputMode="decimal" value={weightStr}
              onChange={e => setWeightStr(e.target.value)}
              onBlur={() => {
                const n = parseInt(weightStr, 10)
                if (isNaN(n)) setWeightStr(String(p.weightKg))
                else dispatch({ type: 'SET_USER_PROFILE', profile: { weightKg: Math.max(30, Math.min(150, n)) } })
              }}
              className="w-12 bg-transparent text-center font-mono text-base font-semibold text-[#1d1d1f] dark:text-white outline-none"
            />
            <span className="text-[11px] text-[#aeaeb2]">kg</span>
          </div>
        </div>
      </div>

      {/* 肠胃适应度 */}
      <div className="mt-3">
        <label className="text-[10px] sm:text-[11px] text-[#86868b] dark:text-[#8e8e93] uppercase block mb-1.5">
          肠胃碳水适应度
        </label>
        <p className="text-[9px] text-[#aeaeb2] dark:text-[#636366] leading-relaxed -mt-0.5 mb-1.5">
          💡 肠胃适应度作为高耗能段的最高安全防线，严防高渗呕吐
        </p>
        <div className="flex rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] p-0.5">
          {([
            ['low', '低', '保守减量'],
            ['medium', '中', '常规拉练'],
            ['high', '高', '极限冲锋'],
          ] as const).map(([key, label, sub]) => (
            <button
              key={key}
              type="button"
              onClick={() => dispatch({ type: 'SET_USER_PROFILE', profile: { gutTolerance: key } })}
              className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                p.gutTolerance === key
                  ? 'bg-white dark:bg-[#3a3a3c] text-accent-600 dark:text-accent-400 shadow-sm'
                  : 'text-[#aeaeb2] dark:text-[#636366]'
              }`}
            >
              <span className="block text-[12px] font-medium leading-tight">{label}</span>
              <span className="block text-[9px] leading-tight opacity-60">{sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== 路线总览数据 ===== */}
      {state.trackPoints.length > 0 && (
        <a
          href={`https://uri.amap.com/marker?position=${state.trackPoints[0].lon},${state.trackPoints[0].lat}&name=越野跑起点`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 w-full h-9 rounded-lg bg-accent-500 text-white text-[12px] font-medium hover:bg-accent-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          导航到起点
        </a>
      )}
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
            <StatItem label="预估耗时" value={formatTime(state.userProfile.targetTimeMinutes)} />
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