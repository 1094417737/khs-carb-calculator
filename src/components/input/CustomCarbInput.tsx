import { useState } from 'react'
import NumberInput from '../ui/NumberInput'

interface CustomCarbInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  algorithmTarget: number
}

export default function CustomCarbInput({ value, onChange, algorithmTarget }: CustomCarbInputProps) {
  const [enabled, setEnabled] = useState(value !== undefined)

  const handleToggle = (on: boolean) => {
    setEnabled(on)
    onChange(on ? algorithmTarget : undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">自定义碳水目标</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
            enabled ? 'bg-accent-500' : 'bg-gray-200 dark:bg-[#48484a]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 translate-y-[1.5px] ${
              enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-[#86868b] dark:text-[#8e8e93] mb-2">
        {enabled
          ? `自定义覆盖算法推荐值（${algorithmTarget} g/h）`
          : `开启后可手动设置每小时碳水目标，覆盖算法推荐的 ${algorithmTarget} g/h`}
      </p>
      {enabled && (
        <NumberInput
          value={value ?? algorithmTarget}
          onChange={(v) => onChange(v)}
          min={10}
          max={150}
          step={5}
          unit="g/h"
        />
      )}
    </div>
  )
}
