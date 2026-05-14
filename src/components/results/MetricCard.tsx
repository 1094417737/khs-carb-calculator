import { ReactNode } from 'react'
import Card from '../layout/Card'

interface MetricCardProps {
  title: string
  icon: string
  value: number
  unit: string
  rangeLow?: number
  rangeHigh?: number
  children?: ReactNode
}

export default function MetricCard({
  title,
  icon,
  value,
  unit,
  rangeLow,
  rangeHigh,
  children,
}: MetricCardProps) {
  return (
    <Card padding="md" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="metric-label">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="metric-value">{value}</span>
        <span className="text-sm text-[#86868b] dark:text-[#8e8e93]">{unit}</span>
      </div>
      {rangeLow !== undefined && rangeHigh !== undefined && rangeHigh > rangeLow && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#aeaeb2] dark:text-[#636366]">
          <span>{rangeLow}</span>
          <div
            className="flex-1 h-1.5 rounded-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #34c759 0%, #ffcc00 40%, #ff9500 70%, #ff3b30 100%)',
            }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-white ring-2 ring-[#1d1d1f] dark:ring-black z-10 shadow-sm"
              style={{
                left: `calc(${Math.min(Math.max(((value - rangeLow) / (rangeHigh - rangeLow)) * 100, 4), 92)}% - 5px)`,
              }}
            />
          </div>
          <span>{rangeHigh}</span>
        </div>
      )}
      {children}
    </Card>
  )
}
