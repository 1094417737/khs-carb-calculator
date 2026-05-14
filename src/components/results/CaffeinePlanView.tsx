import { useCalculator } from '../../hooks/useCalculator'
import Card from '../layout/Card'

export default function CaffeinePlanView() {
  const { results } = useCalculator()
  const plan = results?.caffeine
  if (!plan) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">☕</span>
        <span className="metric-label">咖啡因方案</span>
      </div>
      <div className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-2">
        总剂量: {plan.totalDoseMg}mg
      </div>

      {plan.warning && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-[#fff3cd] dark:bg-[#3a2e00] text-[#856404] dark:text-[#ffd60a] text-xs">
          ⚠ {plan.warning}
        </div>
      )}

      <div className="space-y-2">
        {plan.doses.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e]"
          >
            <div className="w-14 shrink-0 text-xs font-medium text-[#1d1d1f] dark:text-white">
              {d.label}
            </div>
            <div className="flex-1 text-xs text-[#86868b] dark:text-[#8e8e93]">
              {d.doseMg}mg
            </div>
            {d.notes && (
              <div className="text-[10px] text-[#aeaeb2] dark:text-[#636366] text-right">
                {d.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#aeaeb2] dark:text-[#636366] mt-2 leading-relaxed">
        {plan.explanation}
      </p>
    </Card>
  )
}
