import { useState } from 'react'
import { useCalculator } from '../../hooks/useCalculator'
import Card from '../layout/Card'

export default function FeedingScheduleView() {
  const { results, planInputs } = useCalculator()
  const schedule = results?.schedule
  const [collapsed, setCollapsed] = useState(true)

  if (!schedule || schedule.items.length === 0) return null

  const totalHours = Math.floor(planInputs.durationMinutes / 60)
  const totalMins = planInputs.durationMinutes % 60
  const feedingCount = schedule.items.length

  return (
    <Card padding="md">
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-2 mb-1 text-left hover:opacity-80 transition-opacity"
      >
        <span className="text-lg">⏱</span>
        <span className="metric-label">补给时间表</span>
        <span className="text-[11px] text-[#aeaeb2] dark:text-[#636366]">
          每 {schedule.intervalMinutes} 分钟 · 共 {feedingCount} 次
        </span>
        <span className={`ml-auto text-xs text-[#aeaeb2] dark:text-[#636366] transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>
          ▼
        </span>
      </button>

      {!collapsed && (
        <>
          <p className="text-[11px] text-[#aeaeb2] dark:text-[#636366] mb-3">
            总时长 {totalHours > 0 ? `${totalHours}小时` : ''}{totalMins > 0 ? `${totalMins}分钟` : ''}
            {totalHours === 0 && totalMins === 0 ? '0分钟' : ''}
            {' · '}全程碳水 {results!.carbs.totalGrams}g
            {' · '}全程补水 {results!.fluid.totalMl}ml
          </p>

          <div className="space-y-0">
            {schedule.items.map((item, i) => {
              const isFirst = i === 0
              const isLast = i === schedule.items.length - 1

              return (
                <div
                  key={item.timeMinutes}
                  className={`flex items-start gap-3 py-2.5 border-b border-black/5 dark:border-white/5 last:border-0 ${
                    isFirst ? 'pt-1' : ''
                  }`}
                >
                  <div className="w-12 shrink-0 pt-0.5">
                    <span className={`text-xs font-mono font-semibold ${
                      isFirst
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : isLast
                        ? 'text-[#86868b] dark:text-[#8e8e93]'
                        : 'text-accent-600 dark:text-accent-400'
                    }`}>
                      {item.timeLabel}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#1d1d1f] dark:text-white leading-relaxed">
                      {isFirst ? '出发: ' : ''}{item.action}
                    </p>
                    <div className="flex gap-3 mt-0.5 text-[10px] text-[#aeaeb2] dark:text-[#636366]">
                      <span>碳水 {item.carbs}g</span>
                      <span>补水 {item.fluid}ml</span>
                      {item.sodium > 0 && <span>钠 {item.sodium}mg</span>}
                      {item.caffeine && <span className="text-amber-500">☕ {item.caffeine}mg</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 汇总 */}
          <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex gap-4 text-[11px]">
            <span className="text-[#86868b] dark:text-[#8e8e93]">
              碳水 <strong className="text-[#1d1d1f] dark:text-white">{results!.carbs.totalGrams}g</strong>
              <span className="text-[#aeaeb2] dark:text-[#636366]"> ({results!.carbs.totalGrams * 4} kcal)</span>
            </span>
            <span className="text-[#86868b] dark:text-[#8e8e93]">
              补水 <strong className="text-[#1d1d1f] dark:text-white">{results!.fluid.totalMl}ml</strong>
            </span>
            <span className="text-[#86868b] dark:text-[#8e8e93]">
              钠 <strong className="text-[#1d1d1f] dark:text-white">{results!.sodium.totalMg}mg</strong>
            </span>
          </div>
        </>
      )}
    </Card>
  )
}
