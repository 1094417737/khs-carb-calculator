import { useState } from 'react'
import NumberInput from '../ui/NumberInput'
import Tooltip from '../ui/Tooltip'

interface ElevationInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  durationMinutes: number
}

const QUICK_SELECT = [
  { label: '平路/公路', gain: 0 },
  { label: '轻度越野', gain: 500 },
  { label: '中度山地', gain: 1500 },
  { label: '重度爬升', gain: 3000 },
  { label: '极高山', gain: 5000 },
]

function getRateLabel(r: number) {
  if (r === 0) return ''
  if (r < 200) return '起伏'
  if (r < 400) return '中等爬升'
  if (r < 600) return '大爬升'
  return '极限爬升'
}

function getRateColor(r: number) {
  if (r === 0) return ''
  if (r < 200) return 'text-emerald-500 dark:text-emerald-400'
  if (r < 400) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

export default function ElevationInput({ value, onChange, durationMinutes }: ElevationInputProps) {
  const [activeQuick, setActiveQuick] = useState<number | null>(null)
  const elevationGain = value ?? 0
  const hours = durationMinutes / 60
  const rate = hours > 0 ? Math.round(elevationGain / hours) : 0

  function handleQuickSelect(gain: number) {
    setActiveQuick(gain)
    onChange(gain)
  }

  function handleManualChange(v: number) {
    setActiveQuick(null)
    onChange(v)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">累计爬升</span>
        <Tooltip content="越野跑/山地骑行的累计海拔爬升。爬升越大能量消耗越高，需更多碳水补充" />
      </div>
      <NumberInput
        value={elevationGain}
        onChange={handleManualChange}
        min={0}
        max={10000}
        step={50}
        unit="m"
      />
      {rate > 0 && (
        <p className={`text-xs mt-1 ${getRateColor(rate)}`}>
          平均爬升率 {rate} m/h — {getRateLabel(rate)}
        </p>
      )}
      {rate === 0 && (
        <p className="text-xs text-[#aeaeb2] dark:text-[#636366] mt-1">
          0 = 平路/公路，越野跑请估算累计爬升
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {QUICK_SELECT.map((qs) => (
          <button
            key={qs.gain}
            type="button"
            onClick={() => handleQuickSelect(qs.gain)}
            className={`px-3 py-1 text-xs rounded-full transition-all ${
              activeQuick === qs.gain
                ? 'bg-accent-500 text-white'
                : 'bg-[#e8e8ed] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93] hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c]'
            }`}
          >
            {qs.label}{qs.gain > 0 ? ` ~${qs.gain}m` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
