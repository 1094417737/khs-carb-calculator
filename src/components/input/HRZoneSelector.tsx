import { HRZone } from '../../types'

interface HRZoneSelectorProps {
  value: HRZone
  onChange: (zone: HRZone) => void
}

const ZONES: { value: HRZone; label: string; desc: string; color: string; darkColor: string }[] = [
  { value: '50-60', label: '50-60%', desc: '恢复/热身', color: 'bg-gray-400', darkColor: 'bg-gray-500' },
  { value: '60-70', label: '60-70%', desc: '有氧基础', color: 'bg-emerald-400', darkColor: 'bg-emerald-500' },
  { value: '70-80', label: '70-80%', desc: '节奏跑', color: 'bg-blue-400', darkColor: 'bg-blue-500' },
  { value: '80-90', label: '80-90%', desc: '阈值强度', color: 'bg-amber-400', darkColor: 'bg-amber-500' },
  { value: '90-100', label: '90-100%', desc: '最大摄氧', color: 'bg-red-400', darkColor: 'bg-red-500' },
]

export default function HRZoneSelector({ value, onChange }: HRZoneSelectorProps) {
  return (
    <div>
      <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-2">心率强度区间</div>
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {ZONES.map((zone) => (
          <button
            key={zone.value}
            type="button"
            onClick={() => onChange(zone.value)}
            className={`flex flex-col items-center gap-0.5 p-1.5 sm:p-2.5 rounded-2xl transition-all duration-200 ${
              value === zone.value
                ? 'bg-white dark:bg-[#2c2c2e] shadow-card dark:shadow-card-dark ring-1 ring-black/5 dark:ring-white/10'
                : 'hover:bg-white/60 dark:hover:bg-white/5'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${value === zone.value ? zone.darkColor : zone.color} ${
              value === zone.value ? 'scale-110' : ''
            } transition-transform`} />
            <span className={`text-[10px] sm:text-xs font-semibold ${
              value === zone.value ? 'text-[#1d1d1f] dark:text-white' : 'text-[#86868b] dark:text-[#8e8e93]'
            }`}>
              {zone.label}
            </span>
            <span className="text-[10px] text-[#aeaeb2] dark:text-[#636366] text-center leading-tight">
              {zone.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
