import { useCalculator } from '../../hooks/useCalculator'
import MetricCard from './MetricCard'

export default function CarbResultView() {
  const { results } = useCalculator()
  const carbs = results?.carbs
  if (!carbs) return null

  return (
    <MetricCard
      title="碳水需求"
      icon=""
      value={carbs.gramsPerHour.recommended}
      unit="g / 小时"
      rangeLow={carbs.gramsPerHour.low}
      rangeHigh={carbs.gramsPerHour.high}
    >
      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/8">
        <div className="flex gap-3 text-xs text-[#86868b] dark:text-[#8e8e93]">
          <span>总计 <strong className="text-[#1d1d1f] dark:text-white">{carbs.totalGrams}g</strong> 碳水</span>
          <span>≈ <strong className="text-[#1d1d1f] dark:text-white">{carbs.totalGrams * 4}</strong> kcal</span>
        </div>
        <p className="text-[11px] text-[#aeaeb2] dark:text-[#636366] mt-1 leading-relaxed">
          {carbs.explanation}
        </p>
      </div>
    </MetricCard>
  )
}
