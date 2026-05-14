interface SliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  colorTrack?: boolean
  labels?: { value: number; label: string }[]
  formatValue?: (value: number) => string
}

export default function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  labels,
  formatValue,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="relative h-8 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#e8e8ed] dark:bg-[#2c2c2e]"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, ${pct < 100 ? '#e8e8ed' : '#3b82f6'} ${pct}%, #e8e8ed 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between">
        {labels ? (
          labels.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => onChange(l.value)}
              className={`text-xs transition-colors ${
                value === l.value
                  ? 'text-accent-600 dark:text-accent-400 font-medium'
                  : 'text-[#aeaeb2] dark:text-[#636366] hover:text-[#86868b] dark:hover:text-[#8e8e93]'
              }`}
            >
              {l.label}
            </button>
          ))
        ) : (
          <>
            <span className="text-xs text-[#aeaeb2] dark:text-[#636366]">
              {formatValue ? formatValue(min) : min}
            </span>
            <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">
              {formatValue ? formatValue(value) : value}
            </span>
            <span className="text-xs text-[#aeaeb2] dark:text-[#636366]">
              {formatValue ? formatValue(max) : max}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
