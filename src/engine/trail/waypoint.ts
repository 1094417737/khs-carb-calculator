import type { TrackPoint, Waypoint, WaypointConfig, NutritionItem, WaypointItem } from '../../types/trail'
import { matchNutrition } from './nutrition'

/**
 * 基于时间区块 + 冷却期的补给点生成 v3
 *
 * 核心改进:
 * 1. 强制 35 分钟最小间隔 (cooldown)
 * 2. 按时间区块累积缺口，每个区块只打 1 个点 (batching)
 * 3. 单点吸收上限: ≤2 胶 + ≤3 盐丸 + ≤45g 碳水
 * 4. CP 点强制清零累积缺口并重置冷却期
 * 5. 未被吸收的缺口顺延至下一区块
 *
 * 生理学基础:
 * - ACSM 2016: 运动中以 20-30min 间隔少量摄入碳水
 * - Jeukendrup 2014: 胃排空 + 肠道吸收上限 60-90g/h
 * - 越野跑实况: 35-50min 窗口找一个平缓路段停下来补给
 */
export function placeWaypoints(
  points: TrackPoint[],
  config: WaypointConfig,
  library: NutritionItem[],
  kcalRate: number,
  sodiumRate: number,
  carbsGRate: number
): Waypoint[] {
  if (points.length < 2) return []

  const totalTimeMin = points[points.length - 1].timeElapsed / 60
  if (totalTimeMin <= 0) return []

  let nextId = 1
  const cooldownMin = config.cooldownMinutes || 35
  const searchWinMin = config.searchWindowMinutes || 10
  const gelMax = config.gelMaxPerStop ?? 2
  const saltMax = config.saltMaxPerStop ?? 3
  const carbsMax = config.carbsGMaxPerStop ?? 45

  // 最小热量阈值: 半份胶的热量
  const minGel = library.filter(i => i.type === 'gel' && i.kcal > 0).sort((a, b) => a.kcal - b.kcal)[0]
  const kcalThreshold = minGel ? minGel.kcal * 0.5 : 55

  const result: Waypoint[] = []
  let lastWaypointTimeMin = -cooldownMin  // 允许第一个航点在起点附近

  // 累积缺口（不重置，而是减去已覆盖的部分）
  let accKcal = 0
  let accSodium = 0
  let accCarbs = 0
  let lastPtMin = 0

  const kcalPerMin = kcalRate / 60
  const sodiumPerMin = sodiumRate / 60
  const carbsPerMin = carbsGRate / 60

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    const ptMin = pt.timeElapsed / 60
    const dtMin = ptMin - lastPtMin
    lastPtMin = ptMin

    if (dtMin > 0) {
      accKcal += kcalPerMin * dtMin
      accSodium += sodiumPerMin * dtMin
      accCarbs += carbsPerMin * dtMin
    }

    // 冷却期未到，继续累积
    if (ptMin - lastWaypointTimeMin < cooldownMin) continue

    // 缺口未达阈值，继续累积
    if (accKcal < kcalThreshold) continue

    // 冷却期已到 + 缺口达标 → 在当前点的时间窗口内找最佳打点位置
    const windowSec = searchWinMin * 60
    const bestIdx = findBestInWindow(points, i, windowSec)
    if (bestIdx < 0) continue

    const best = points[bestIdx]

    // 从补给库匹配补给品，受吸收上限约束
    const { items, coveredKcal, coveredSodium, coveredCarbs } = matchNutrition(
      { kcal: Math.round(accKcal), sodiumMg: Math.round(accSodium), carbsG: Math.round(accCarbs) },
      library,
      { maxGels: gelMax, maxSalts: saltMax, maxCarbsG: carbsMax }
    )

    if (items.length === 0) {
      // 补给库无匹配项，不重置冷却期，缺口继续累积至下一点重试
      continue
    }

    const label = buildLabel(items, best)
    result.push({
      id: `wp_${nextId++}`,
      trackPointIndex: bestIdx,
      timeMinutes: Math.round(best.timeElapsed / 60),
      distanceKm: best.cumulativeDistanceKm,
      lat: best.lat,
      lon: best.lon,
      items,
      label,
      score: scorePoint(points, bestIdx),
    })

    // 减去实际覆盖的量（未被覆盖的缺口顺延至下一区块）
    accKcal = Math.max(0, accKcal - coveredKcal)
    accSodium = Math.max(0, accSodium - coveredSodium)
    accCarbs = Math.max(0, accCarbs - coveredCarbs)

    lastWaypointTimeMin = best.timeElapsed / 60
  }

  return result.sort((a, b) => a.distanceKm - b.distanceKm)
}

function findBestInWindow(points: TrackPoint[], aroundIdx: number, windowSec: number): number {
  const targetSec = points[aroundIdx].timeElapsed
  let bestIdx = -1
  let bestScore = -Infinity

  const half = windowSec / 2
  for (let i = 0; i < points.length; i++) {
    if (Math.abs(points[i].timeElapsed - targetSec) > half) continue
    const s = scorePoint(points, i)
    if (s > bestScore) { bestScore = s; bestIdx = i }
  }
  return bestIdx
}

function scorePoint(points: TrackPoint[], idx: number): number {
  const g = points[idx].gradient
  let s = 0

  // 平路优先 — 跑者可以安全停下来吃东西
  if (g >= -3 && g <= 3) s += 50
  else if (Math.abs(g) < 8) s += 25

  // 陡坡惩罚 — 大上坡或大下坡都很难停下来
  if (g > 15 || g < -15) s -= 100

  // 上坡前加点位置 — 上坡前吃胶，爬坡时有能量
  const aheadUp = aheadAvgGradient(points, idx, 0.5, 'up')
  if (aheadUp > 10) s += 30

  // 长下坡前 — 下坡前补充，防止后半程撞墙
  const aheadDown = aheadAvgGradient(points, idx, 0.5, 'down')
  if (aheadDown < -10) s += 20

  return s
}

function aheadAvgGradient(points: TrackPoint[], fromIdx: number, distKm: number, dir: 'up' | 'down'): number {
  const target = points[fromIdx].cumulativeDistanceKm + distKm
  let sum = 0, cnt = 0
  for (let i = fromIdx + 1; i < points.length && points[i].cumulativeDistanceKm <= target; i++) {
    const g = points[i].gradient
    if ((dir === 'up' && g > 0) || (dir === 'down' && g < 0)) { sum += g; cnt++ }
  }
  return cnt > 0 ? sum / cnt : 0
}

function buildLabel(items: WaypointItem[], pt: TrackPoint): string {
  const parts = items.map(i => `${i.itemName} x${i.quantity}`)
  return `${parts.join(', ')} @ ${Math.round(pt.timeElapsed / 60)}min`
}