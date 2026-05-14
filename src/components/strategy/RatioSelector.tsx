import { HomemadeRatio } from '../../types'
import { useCalculator } from '../../hooks/useCalculator'
import SegmentedControl from '../ui/SegmentedControl'

const RATIO_OPTIONS = [
  {
    value: '2:1' as const,
    label: '2:1',
    description: '标准比例 · 葡萄糖(可用麦芽糊精低甜度替代) : 果糖 = 2:1 · 吸收上限~60g/h',
  },
  {
    value: '1:1' as const,
    label: '1:1',
    description: '双通道全开 · 可直接用普通白砂糖(蔗糖=1:1) · 吸收上限~90g/h',
  },
  {
    value: '1:0.8' as const,
    label: '1:0.8',
    description: '优化比例 · 葡萄糖(可用麦芽糊精) : 果糖 = 1:0.8 · 吸收上限~80g/h',
  },
]

export default function RatioSelector() {
  const { strategyOptions, setStrategyOption } = useCalculator()

  return (
    <div>
      <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-2">
        糖浆混合比例
      </div>
      <SegmentedControl<HomemadeRatio>
        options={RATIO_OPTIONS}
        value={strategyOptions.homemadeRatio}
        onChange={(v) => setStrategyOption('homemadeRatio', v)}
      />
    </div>
  )
}
