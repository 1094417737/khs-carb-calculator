import { useCalculator } from '../../hooks/useCalculator'
import MetricCard from './MetricCard'

export default function FluidResultView() {
  const { results } = useCalculator()
  const fluid = results?.fluid
  if (!fluid) return null

  return (
    <MetricCard
      title="补水需求"
      icon=""
      value={fluid.mlPerHour.recommended}
      unit="ml / 小时"
      rangeLow={fluid.mlPerHour.low}
      rangeHigh={fluid.mlPerHour.high}
    >
      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/8">
        <div className="text-xs text-[#86868b] dark:text-[#8e8e93]">
          总计约 <strong className="text-[#1d1d1f] dark:text-white">{fluid.totalMl}ml</strong> ({ (fluid.totalMl / 1000).toFixed(1) }L)
        </div>
        <p className="text-[11px] text-[#aeaeb2] dark:text-[#636366] mt-1 leading-relaxed">
          {fluid.explanation}
        </p>
      </div>
    </MetricCard>
  )
}
