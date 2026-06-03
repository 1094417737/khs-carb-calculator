import { useMemo } from 'react'
import { useTrail } from '../../hooks/useTrail'
import { sweatRateLPerHour } from '../../engine/trail'
import Card from '../layout/Card'

interface PaceSegment {
  fromKm: number
  toKm: number
  avgGradient: number
  paceMinPerKm: number | null
  etaMinutes: number
  advice: string
  color: string
}

function gradientLabel(g: number): string {
  if (g > 12) return '陡上'
  if (g > 5) return '爬升'
  if (g > 1) return '缓上'
  if (g >= -1) return '平路'
  if (g >= -5) return '缓下'
  if (g >= -12) return '下降'
  return '陡降'
}

function gradientColor(g: number): string {
  if (g > 8) return 'text-red-500'
  if (g > 3) return 'text-orange-500'
  if (g >= -3) return 'text-green-500'
  if (g >= -10) return 'text-blue-400'
  return 'text-cyan-400'
}

function paceAdvice(avgG: number): string {
  if (avgG > 12) return '大幅降速，建议徒步保存体力'
  if (avgG > 5) return '控制心率，小步幅爬升'
  if (avgG > 1) return '保持节奏，勿冲坡'
  if (avgG >= -1) return '稳定配速，及时补给'
  if (avgG >= -5) return '利用下坡恢复，加大步幅'
  if (avgG >= -12) return '控制下坡速度，注意落脚点'
  return '陡降路段，刹车耗能，减速通过'
}

export default function PaceStrategy() {
  const { state } = useTrail()
  const points = state.result?.trackPoints
  const trailResult = state.result
  const sweatRate = sweatRateLPerHour(state.userProfile.weightKg, state.userProfile.tempC)
  // 全局总补水量 (L) = 出汗率 × 总耗时
  const totalWaterL = trailResult ? sweatRate * (trailResult.totalTimeMinutes / 60) : 0

  const segments = useMemo(() => {
    if (!points || points.length < 10 || !trailResult) return null

    // ═══ 强行对齐大盘距离（不再取 trackPoints 末尾，改用 result.totalDistanceKm）═══
    const totalDist = trailResult.totalDistanceKm
    if (totalDist < 1) return null

    const segCount = Math.max(4, Math.min(8, Math.ceil(totalDist / 5)))
    const segWidth = totalDist / segCount

    const result: PaceSegment[] = []

    for (let s = 0; s < segCount; s++) {
      const fromKm = s * segWidth
      const toKm = (s + 1) * segWidth

      const segPts = points.filter(
        p => p.cumulativeDistanceKm >= fromKm && p.cumulativeDistanceKm <= toKm
      )

      if (segPts.length < 2) continue

      const avgGradient = segPts.reduce((sum, p) => sum + p.gradient, 0) / segPts.length

      const segTime = segPts[segPts.length - 1].timeElapsed - segPts[0].timeElapsed
      const paceMinPerKm = segTime > 0 ? (segTime / 60) / segWidth : null

      const etaMinutes = Math.round(segPts[segPts.length - 1].timeElapsed / 60)

      result.push({
        fromKm: Math.round(fromKm * 10) / 10,
        toKm: Math.round(toKm * 10) / 10,
        avgGradient: Math.round(avgGradient * 10) / 10,
        paceMinPerKm: paceMinPerKm ? Math.round(paceMinPerKm * 10) / 10 : null,
        etaMinutes,
        advice: paceAdvice(avgGradient),
        color: gradientColor(avgGradient),
      })
    }

    return result
  }, [points, trailResult])

  if (!segments || segments.length === 0) return null

  function formatEta(min: number): string {
    const h = Math.floor(min / 60)
    const m = min % 60
    return h > 0 ? `${h}h${m}m` : `${m}min`
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🎯</span>
        <span className="metric-label">分段配速策略</span>
      </div>

      <div className="space-y-1.5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3 py-2.5 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e]"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-[11px] font-mono font-semibold text-[#1d1d1f] dark:text-white min-w-[70px]">
                {seg.fromKm}–{seg.toKm}km
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-[11px] text-[#86868b] dark:text-[#8e8e93]">
              {seg.paceMinPerKm != null && (
                <span className="font-mono">配速 {seg.paceMinPerKm.toFixed(1)}/km</span>
              )}
              <span className="font-mono">ETA {formatEta(seg.etaMinutes)}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-[11px] leading-relaxed text-[#86868b] dark:text-[#8e8e93] sm:ml-auto sm:text-right">
                {seg.advice}
              </p>
              {i > 0 && (() => {
                if (!trailResult) return null
                const segDurMin = seg.etaMinutes - segments[i - 1].etaMinutes
                const segWaterL = trailResult.totalTimeMinutes > 0
                  ? totalWaterL * (segDurMin / trailResult.totalTimeMinutes)
                  : 0
                return (
                  <p className="text-[11px] sm:text-[10px] text-blue-500 dark:text-blue-400 sm:text-right mt-0.5 font-medium">
                    💧 本赛段建议饮水：约 {Math.max(0.1, segWaterL).toFixed(1)} L
                  </p>
                )
              })()}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] sm:text-[10px] text-[#aeaeb2] dark:text-[#636366]">
        💧 补水 ${sweatRate.toFixed(1)}L/h · 各段按 ETA 权重拆分全局总量 · 配速基于 GAP 坡度感知算法推算
      </p>
    </Card>
  )
}
