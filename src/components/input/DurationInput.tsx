import { useState } from 'react'
import Tooltip from '../ui/Tooltip'

interface DurationInputProps {
  hours: number
  minutes: number
  distanceKm: number | undefined
  onChange: (totalMinutes: number) => void
  onDistanceChange: (km: number | undefined) => void
}

const QUICK_SELECT = [
  { label: '半马', minutes: 120, distance: 21.1 },
  { label: '全马', minutes: 240, distance: 42.2 },
  { label: '50K越野', minutes: 360, distance: 50 },
  { label: '100K越野', minutes: 720, distance: 100 },
  { label: '铁三', minutes: 180, distance: 51.5 },
]

export default function DurationInput({ hours, minutes, distanceKm, onChange, onDistanceChange }: DurationInputProps) {
  const [activeQuick, setActiveQuick] = useState<number | null>(null)
  const [distEnabled, setDistEnabled] = useState(distanceKm !== undefined)

  const totalMinutes = hours * 60 + minutes
  const pace = distanceKm && distanceKm > 0 && totalMinutes > 0
    ? totalMinutes / distanceKm
    : null
  const paceMin = pace ? Math.floor(pace) : 0
  const paceSec = pace ? Math.round((pace - paceMin) * 60) : 0

  function handleQuickSelect(qs: typeof QUICK_SELECT[number]) {
    setActiveQuick(qs.minutes)
    onChange(qs.minutes)
    onDistanceChange(qs.distance)
    setDistEnabled(true)
  }

  function handleTimeChange(h: number, m: number) {
    setActiveQuick(null)
    onChange(h * 60 + m)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">运动时长</span>
        <Tooltip content="输入预计运动总时长。开启距离后可显示平均配速" />
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
            onDistanceChange(next ? (activeQuick ? QUICK_SELECT.find(q => q.minutes === activeQuick)?.distance : undefined) : undefined)
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

      {/* 配速显示 */}
      {pace && (
        <p className="text-xs text-accent-600 dark:text-accent-400 font-medium mb-2">
          平均配速 {paceMin}:{paceSec.toString().padStart(2, '0')} /km
        </p>
      )}

      {/* 快速选择 */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_SELECT.map((qs) => (
          <button
            key={qs.minutes}
            type="button"
            onClick={() => handleQuickSelect(qs)}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              activeQuick === qs.minutes
                ? 'bg-accent-500 text-white'
                : 'bg-[#e8e8ed] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93] hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c]'
            }`}
          >
            {qs.label} ({Math.floor(qs.minutes / 60)}h{qs.minutes % 60 > 0 ? `${qs.minutes % 60}m` : ''} · {qs.distance}km)
          </button>
        ))}
      </div>
    </div>
  )
}
