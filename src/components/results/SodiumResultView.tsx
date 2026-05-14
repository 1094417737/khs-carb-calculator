import { useCalculator } from '../../hooks/useCalculator'
import MetricCard from './MetricCard'

export default function SodiumResultView() {
  const { results } = useCalculator()
  const sodium = results?.sodium
  if (!sodium) return null

  return (
    <MetricCard
      title="钠补充"
      icon=""
      value={sodium.mgPerHour.recommended}
      unit="mg / 小时"
      rangeLow={sodium.mgPerHour.low}
      rangeHigh={sodium.mgPerHour.high}
    >
      <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/8">
        <div className="text-xs text-[#86868b] dark:text-[#8e8e93]">
          总计约 <strong className="text-[#1d1d1f] dark:text-white">{sodium.totalMg}mg</strong> | 估算出汗率 <strong className="text-[#1d1d1f] dark:text-white">{sodium.sweatRateEstimate}</strong> L/h
        </div>
        <p className="text-[11px] text-[#aeaeb2] dark:text-[#636366] mt-1 leading-relaxed">
          {sodium.explanation}
        </p>
      </div>
    </MetricCard>
  )
}
