import { useMemo } from 'react'
import { useTrail } from '../../hooks/useTrail'
import Card from '../layout/Card'

interface GradeBin {
  label: string
  emoji: string
  color: string
  barColor: string
  km: number
  pct: number
}

export default function GradientBreakdown() {
  const { state } = useTrail()
  const points = state.result?.trackPoints

  const bins = useMemo(() => {
    if (!points || points.length < 2) return null

    let steepUp = 0, gentleUp = 0, flat = 0, gentleDown = 0, steepDown = 0

    for (let i = 1; i < points.length; i++) {
      const segDist = points[i].cumulativeDistanceKm - points[i - 1].cumulativeDistanceKm
      if (segDist <= 0) continue
      const g = points[i].gradient
      if (g > 8) steepUp += segDist
      else if (g > 1) gentleUp += segDist
      else if (g >= -1) flat += segDist
      else if (g >= -8) gentleDown += segDist
      else steepDown += segDist
    }

    const total = steepUp + gentleUp + flat + gentleDown + steepDown
    if (total <= 0) return null

    const pct = (v: number) => Math.round(v / total * 100)

    return [
      { label: '陡上', emoji: '🔴', color: 'text-red-500', barColor: 'bg-red-500', km: steepUp, pct: pct(steepUp) },
      { label: '缓上', emoji: '🟠', color: 'text-orange-500', barColor: 'bg-orange-400', km: gentleUp, pct: pct(gentleUp) },
      { label: '平路', emoji: '🟢', color: 'text-green-500', barColor: 'bg-green-400', km: flat, pct: pct(flat) },
      { label: '缓下', emoji: '🔵', color: 'text-blue-400', barColor: 'bg-blue-400', km: gentleDown, pct: pct(gentleDown) },
      { label: '陡降', emoji: '🟣', color: 'text-purple-400', barColor: 'bg-purple-400', km: steepDown, pct: pct(steepDown) },
    ]
  }, [points])

  if (!bins) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <span className="metric-label">坡度分布</span>
      </div>

      <div className="space-y-1.5">
        {bins.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[10px] w-8 text-right font-mono text-[#86868b] dark:text-[#8e8e93]">
              {b.km.toFixed(1)}km
            </span>
            <span className="text-[10px] w-7 text-right font-mono font-semibold text-[#1d1d1f] dark:text-white">
              {b.pct}%
            </span>
            <div className="flex-1 h-3 rounded-full bg-[#e8e8ed] dark:bg-[#3a3a3c] overflow-hidden">
              <div
                className={`h-full rounded-full ${b.barColor} transition-all`}
                style={{ width: `${Math.max(b.pct, 2)}%` }}
              />
            </div>
            <span className={`text-[11px] font-medium w-8 shrink-0 ${b.color}`}>
              {b.emoji} {b.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
