import { useState, useEffect } from 'react'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  label?: string
  sublabel?: string
}

export default function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
  label,
  sublabel,
}: NumberInputProps) {
  const [text, setText] = useState(String(value))
  // 外部value变化时同步文本
  useEffect(() => {
    setText(String(value))
  }, [value])

  const decrement = () => {
    const next = value - step
    if (next >= min) onChange(Math.round(next * 100) / 100)
  }
  const increment = () => {
    const next = value + step
    if (next <= max) onChange(Math.round(next * 100) / 100)
  }

  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw === '' || isNaN(n)) {
      // 恢复为当前有效值
      setText(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, Math.round(n * 100) / 100))
    onChange(clamped)
    setText(String(clamped))
  }

  return (
    <div>
      {label && <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-1.5">{label}</div>}
      {sublabel && <div className="text-xs text-[#86868b] dark:text-[#8e8e93] mb-2">{sublabel}</div>}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-l-xl bg-[#e8e8ed] dark:bg-[#2c2c2e] flex items-center justify-center text-lg font-medium text-[#1d1d1f] dark:text-white hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c] disabled:opacity-30 transition-colors shrink-0"
        >
          −
        </button>
        <div className="h-10 px-3 bg-white dark:bg-[#1c1c1e] border-y border-[#e8e8ed] dark:border-[#2c2c2e] flex items-center justify-center min-w-[80px]">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(text) }}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-center text-lg font-semibold text-[#1d1d1f] dark:text-white outline-none"
          />
          {unit && <span className="text-sm text-[#86868b] dark:text-[#8e8e93] ml-1 shrink-0">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="w-10 h-10 rounded-r-xl bg-[#e8e8ed] dark:bg-[#2c2c2e] flex items-center justify-center text-lg font-medium text-[#1d1d1f] dark:text-white hover:bg-[#dcdce2] dark:hover:bg-[#3a3a3c] disabled:opacity-30 transition-colors shrink-0"
        >
          +
        </button>
      </div>
    </div>
  )
}
