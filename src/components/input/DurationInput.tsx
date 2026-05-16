import { useState } from 'react'
import Tooltip from '../ui/Tooltip'

export type SportMode = '跑步/马拉松' | '越野' | '骑行' | null

interface DurationInputProps {
  hours: number
  minutes: number
  distanceKm: number | undefined
  onChange: (totalMinutes: number) => void
  onDistanceChange: (km: number | undefined) => void
  onModeChange?: (mode: SportMode) => void
}

const SPORT_MODES: { mode: SportMode; label: string; icon: string; color: string; minutes: number; distance: number; desc: string }[] = [
  { mode: '跑步/马拉松', label: '跑步/马拉松', icon: '🏃', color: '#2563eb', minutes: 180, distance: 21.1, desc: '路跑·田径场' },
  { mode: '越野', label: '越野', icon: '🏔️', color: '#16a34a', minutes: 360, distance: 50, desc: '山地·爬升' },
  { mode: '骑行', label: '骑行', icon: '🚴', color: '#ea580c', minutes: 180, distance: 60, desc: '公路·铁三' },
]

export default function DurationInput({ hours, minutes, distanceKm, onChange, onDistanceChange, onModeChange }: DurationInputProps) {
  const [activeMode, setActiveMode] = useState<SportMode>(null)
  const [distEnabled, setDistEnabled] = useState(distanceKm !== undefined)

  const totalMinutes = hours * 60 + minutes
  const pace = distanceKm && distanceKm > 0 && totalMinutes > 0
    ? totalMinutes / distanceKm
    : null
  const paceMin = pace ? Math.floor(pace) : 0
  const paceSec = pace ? Math.round((pace - paceMin) * 60) : 0
  const speedKmh = distanceKm && distanceKm > 0 && totalMinutes > 0
    ? (distanceKm / (totalMinutes / 60)).toFixed(1)
    : null

  function handleModeSelect(sm: typeof SPORT_MODES[number]) {
    setActiveMode(sm.mode)
    onChange(sm.minutes)
    onDistanceChange(sm.distance)
    setDistEnabled(true)
    onModeChange?.(sm.mode)
  }

  function handleTimeChange(h: number, m: number) {
    setActiveMode(null)
    onChange(h * 60 + m)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">运动时长</span>
        <Tooltip content="输入预计运动总时长，或选择运动类型快速设置" />
      </div>

      {/* 运动类型选择 */}
      <div className="flex gap-2 mb-3">
        {SPORT_MODES.map((sm) => (
          <button
            key={sm.mode}
            type="button"
            onClick={() => handleModeSelect(sm)}
            className={`flex-1 py-2 px-3 rounded-xl text-center transition-all duration-200 ${
              activeMode === sm.mode
                ? 'text-white shadow-sm'
                : 'bg-[#e8e8ed] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93] hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c]'
            }`}
            style={activeMode === sm.mode ? { backgroundColor: sm.color } : undefined}
          >
            <div className="text-base mb-0.5">{sm.icon}</div>
            <div className="text-[11px] font-semibold leading-tight">{sm.label}</div>
          </button>
        ))}
      </div>

      {/* 时间选择 */}
      <div className="flex items-center gap-2 mb-2">
        <select
          value={hours}
          onChange={(e) => handleTimeChange(Number(e.target.value), minutes)}
          className="appearance-none bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-xl px-3 py-2.5 text-lg font-semibold text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 dark:focus:border-accent-600 focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none cursor-pointer"
        >
          {Array.from({ length: 25 }, (_, i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <span className="text-sm text-[#86868b] dark:text-[#8e8e93]">小时</span>
        <select
          value={minutes}
          onChange={(e) => handleTimeChange(hours, Number(e.target.value))}
          className="appearance-none bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-xl px-3 py-2.5 text-lg font-semibold text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 dark:focus:border-accent-600 focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none cursor-pointer"
        >
          {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-sm text-[#86868b] dark:text-[#8e8e93]">分钟</span>
      </div>

      {/* 距离输入 */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          role="switch"
          aria-checked={distEnabled}
          onClick={() => {
            const next = !distEnabled
            setDistEnabled(next)
            if (!next) onDistanceChange(undefined)
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
            distEnabled ? 'bg-accent-500' : 'bg-gray-200 dark:bg-[#48484a]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 translate-y-[1.5px] ${
              distEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
        <span className="text-xs text-[#86868b] dark:text-[#8e8e93]">距离</span>
        {distEnabled && (
          <>
            <input
              type="number"
              value={distanceKm ?? ''}
              onChange={(e) => {
                const v = e.target.value
                onDistanceChange(v ? Number(v) : undefined)
              }}
              onFocus={(e) => e.target.select()}
              placeholder="km"
              min={1}
              max={999}
              step={0.1}
              className="w-20 bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-xl px-3 py-2 text-sm font-semibold text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-300 dark:focus:border-accent-600 focus:bg-white dark:focus:bg-[#1c1c1e] focus:outline-none"
            />
            <span className="text-xs text-[#86868b] dark:text-[#8e8e93]">km</span>
          </>
        )}
      </div>

      {/* 配速/速度 */}
      {pace && (
        <p className="text-xs text-accent-600 dark:text-accent-400 font-medium">
          {activeMode === '骑行' && speedKmh
            ? `平均时速 ${speedKmh} km/h`
            : `平均配速 ${paceMin}:${paceSec.toString().padStart(2, '0')} /km`
          }
        </p>
      )}
    </div>
  )
}
