import { SweatRateProfile } from '../../types'
import Tooltip from '../ui/Tooltip'

interface SweatRateInputProps {
  enabled: boolean
  profile: SweatRateProfile | undefined
  onToggle: (enabled: boolean) => void
  onProfileChange: (profile: SweatRateProfile | undefined) => void
}

const PROFILES: { value: SweatRateProfile; label: string; desc: string }[] = [
  {
    value: 'Low',
    label: '较少',
    desc: '天生出汗少，运动后衣服盐渍不明显。出汗率约 0.3-0.6 L/h（低于平均）',
  },
  {
    value: 'Normal',
    label: '正常',
    desc: '出汗量适中，运动后皮肤有明显盐粒。出汗率约 0.5-1.2 L/h（平均值）',
  },
  {
    value: 'High',
    label: '较多',
    desc: '出汗量大，运动后衣服湿透、大量盐渍。出汗率约 1.0-2.5 L/h（高于平均）',
  },
]

export default function SweatRateInput({ enabled, profile, onToggle, onProfileChange }: SweatRateInputProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white">出汗率自测</span>
          <Tooltip content="个体出汗量差异可达5倍以上（ACSM 2007）。通过观察运动后衣物盐渍程度和自我感知来评估。开启后可获得更精准的钠补充建议。" />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => {
            const next = !enabled
            onToggle(next)
            if (!next) onProfileChange(undefined)
            else if (!profile) onProfileChange('Normal')
          }}
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
          ? '根据你的个体出汗特征调整钠补充建议'
          : '开启后根据个体出汗特征更精准计算钠需求（基于 ACSM 2007 出汗率个体差异研究）'}
      </p>
      {enabled && (
        <div className="flex flex-col sm:flex-row gap-1.5">
          {PROFILES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => onProfileChange(p.value)}
              className={`flex-1 p-2.5 rounded-xl text-center transition-all duration-200 ${
                profile === p.value
                  ? 'bg-white dark:bg-[#2c2c2e] shadow-card dark:shadow-card-dark ring-1 ring-black/5 dark:ring-white/10'
                  : 'bg-[#f5f5f7] dark:bg-[#1c1c1e] hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              <div className={`text-sm font-semibold ${
                profile === p.value ? 'text-[#1d1d1f] dark:text-white' : 'text-[#86868b] dark:text-[#8e8e93]'
              }`}>
                {p.label}
              </div>
              <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] mt-0.5 leading-tight">
                {p.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
