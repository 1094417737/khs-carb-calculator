import { GITrainingLevel } from '../../types'
import SegmentedControl from '../ui/SegmentedControl'

interface GITrainingSelectorProps {
  value: GITrainingLevel
  onChange: (level: GITrainingLevel) => void
}

const OPTIONS = [
  {
    value: 'Low' as const,
    label: '低',
    description: '初学者：训练中很少进行系统补给训练，胃肠道对运动中进食较为敏感',
  },
  {
    value: 'Moderate' as const,
    label: '中等',
    description: '有经验：训练中有规律地进行补给，胃肠道已适应中等量碳水摄入',
  },
  {
    value: 'Well' as const,
    label: '良好',
    description: '适应性强：长期系统训练胃肠道，可耐受较高碳水摄入（>90g/h）和大量液体',
  },
]

export default function GITrainingSelector({ value, onChange }: GITrainingSelectorProps) {
  return (
    <div>
      <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-2">GI 训练水平</div>
      <SegmentedControl
        options={OPTIONS}
        value={value}
        onChange={onChange}
        descClass={value === 'Well' ? 'text-red-500 dark:text-red-400' : 'text-[#86868b] dark:text-[#8e8e93]'}
      />
    </div>
  )
}
