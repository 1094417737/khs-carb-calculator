import Slider from '../ui/Slider'

interface TemperatureInputProps {
  value: number
  onChange: (temp: number) => void
}

const TEMP_LABELS = [
  { value: 0, label: '0°C 冬季' },
  { value: 10, label: '10°C' },
  { value: 20, label: '20°C 春秋' },
  { value: 30, label: '30°C 夏季' },
  { value: 40, label: '40°C' },
]

function getTempFeel(c: number): string {
  if (c <= 0) return '严寒'
  if (c <= 10) return '寒冷'
  if (c <= 20) return '凉爽'
  if (c <= 28) return '温暖'
  if (c <= 35) return '炎热'
  return '酷热'
}

function getTempColor(c: number): string {
  if (c <= 5) return 'text-blue-500 dark:text-blue-400'
  if (c <= 18) return 'text-emerald-500 dark:text-emerald-400'
  if (c <= 28) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

export default function TemperatureInput({ value, onChange }: TemperatureInputProps) {
  return (
    <div>
      <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-1.5">
        环境温度
        <span className={`ml-2 text-xs ${getTempColor(value)}`}>
          {getTempFeel(value)}
        </span>
      </div>
      <div className="bg-[#f5f5f7] dark:bg-[#2c2c2e] rounded-2xl px-4 py-3">
        <div className="text-center mb-1">
          <span className="text-2xl font-semibold text-[#1d1d1f] dark:text-white">{value}</span>
          <span className="text-sm text-[#86868b] dark:text-[#8e8e93] ml-0.5">°C</span>
        </div>
        <Slider
          value={value}
          onChange={onChange}
          min={-5}
          max={45}
          step={1}
          labels={TEMP_LABELS}
        />
      </div>
    </div>
  )
}
