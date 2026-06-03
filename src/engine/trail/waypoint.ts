import type { TrackPoint, Waypoint, WaypointConfig, NutritionItem, WaypointItem, CustomMarker } from '../../types/trail'
import {
  matchNutrition,
  gradientCarbMultiplier,
  fatigueMultiplier,
  computeTotalWorkload,
  shouldTriggerSaltPill,
  SWEAT_SALT_THRESHOLD_L,
} from './nutrition'

/**
 * 基于功耗积分 + 脂肪氧化模型的补给点生成 v4
 *
 * 核心改进 (v4):
 * 1. TotalWorkload 预计算 → 疲劳因子仅在后 20% 轨道触发
 * 2. 逐点三档坡度判定 (gradientCarbMultiplier) 替代旧两档一刀切
 * 3. 统一 combinedMultiplier = gradK × fatigueK
 * 4. 盐丸双门槛: gradient>10% + 累计出汗≥500ml, 非核心段强制 0 粒
 * 5. CP 点强制清零累积缺口并重置冷却期 (保留)
 *
 * 生理学基础:
 * - Jeukendrup 2014: 脂肪最大氧化承担 35% 能耗 (FatMax)
 * - ACSM 2016: 运动中以 20-30min 间隔少量摄入碳水
 * - Minetti 2002: 1m 爬升 ≈ 10m 平跑代谢成本
 * - Sawka 2007: 出汗率 × 钠浓度 × 70% 补充率
 */
export function placeWaypoints(
  points: TrackPoint[],
  config: WaypointConfig,
  library: NutritionItem[],
  kcalRate: number,
  sodiumRate: number,
  carbsGRate: number,
  sweatRateLPerH: number,
  customMarkers?: CustomMarker[]
): Waypoint[] {
  if (points.length < 2) return []

  const totalTimeMin = points[points.length - 1].timeElapsed / 60
  if (totalTimeMin <= 0) return []

  // 提取 CP 点列表（距离 + 类型）
  const cpList = (customMarkers ?? [])
    .filter(m => m.cpType != null)
    .map(m => ({ dist: m.distanceKm, type: m.cpType! }))

  let nextId = 1
  const cooldownMin = config.cooldownMinutes || 35
  const searchWinMin = config.searchWindowMinutes || 10
  const gelMax = config.gelMaxPerStop ?? 2
  const saltMax = config.saltMaxPerStop ?? 3
  const carbsMax = config.carbsGMaxPerStop ?? 45
  const CP_SNAP_M = 0.25

  // 最小热量阈值: 半份胶的热量
  const minGel = library.filter(i => i.type === 'gel' && i.kcal > 0).sort((a, b) => a.kcal - b.kcal)[0]
  const kcalThreshold = minGel ? minGel.kcal * 0.5 : 55

  // ═══════════════════════════════════════════════════════════
  // 预计算 TotalWorkload
  // ═══════════════════════════════════════════════════════════
  let totalClimbM = 0
  for (let i = 1; i < points.length; i++) {
    const d = points[i].ele - points[i - 1].ele
    if (d > 0) totalClimbM += d
  }
  const totalDistKm = points[points.length - 1].cumulativeDistanceKm
  const TotalWorkload = computeTotalWorkload(totalDistKm, totalClimbM)

  const result: Waypoint[] = []
  let lastWaypointTimeMin = -cooldownMin

  // 累积缺口
  let accKcal = 0
  let accSodium = 0
  let accCarbs = 0
  let lastPtMin = 0

  const kcalPerMin = kcalRate / 60
  const sodiumPerMin = sodiumRate / 60
  const carbsPerMin = carbsGRate / 60
  const sweatPerMin = sweatRateLPerH / 60

  // 做功与出汗追踪
  let cumulativeClimbM = 0
  let sweatSinceLastSaltL = 0

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]
    const ptMin = pt.timeElapsed / 60
    const dtMin = ptMin - lastPtMin
    lastPtMin = ptMin

    // CP 点感知：接近官方补给站时按比例扣减缺口并重置冷却期
    const hitCP = cpList.find(cp => Math.abs(pt.cumulativeDistanceKm - cp.dist) <= CP_SNAP_M)
    if (hitCP) {
      console.log(`[CP DEBUG] ✅ HIT pt#${i}@${pt.cumulativeDistanceKm.toFixed(2)}km → CP@${hitCP.dist.toFixed(1)}km (${hitCP.type}) | factor=${hitCP.type === 'full' ? 0.45 : 0.80}`)
      const factor = hitCP.type === 'full' ? 0.45 : 0.80
      accKcal *= factor
      accSodium *= factor
      accCarbs *= factor
      lastWaypointTimeMin = ptMin
      continue
    }

    if (dtMin > 0) {
      const g = pt.gradient

      // 实时做功累加
      if (i > 0) {
        const eleDelta = pt.ele - points[i - 1].ele
        if (eleDelta > 0) cumulativeClimbM += eleDelta
      }
      const currentWorkload = computeTotalWorkload(pt.cumulativeDistanceKm, cumulativeClimbM)

      // 逐点双系数相乘
      const gradK = gradientCarbMultiplier(g)
      const fatigueK = fatigueMultiplier(currentWorkload, TotalWorkload)
      const combinedK = gradK * fatigueK

      accKcal += kcalPerMin * dtMin * combinedK
      accCarbs += carbsPerMin * dtMin * combinedK
      accSodium += sodiumPerMin * dtMin

      // 出汗量独立累加 (用于盐丸触发判定)
      const sweatL = sweatPerMin * dtMin
      sweatSinceLastSaltL += sweatL
    }

    // 冷却期未到，继续累积
    if (ptMin - lastWaypointTimeMin < cooldownMin) continue

    // 缺口未达阈值，继续累积
    if (accKcal < kcalThreshold) continue

    // ═══════════════════════════════════════════════════════════
    // 终点绝对禁区锁：剩余 ≤3.0km 或 ≤35min → 禁止生成任何补给航点
    // 实战常识：终点近在眼前，不需要再吃胶/吞盐丸
    // ═══════════════════════════════════════════════════════════
    const remainingDistKm = totalDistKm - pt.cumulativeDistanceKm
    const remainingTimeMin = totalTimeMin - ptMin
    if (remainingDistKm <= 3.0 || remainingTimeMin <= 35) continue

    // 冷却期已到 + 缺口达标 → 在当前点的时间窗口内找最佳打点位置
    const windowSec = searchWinMin * 60
    const bestIdx = findBestInWindow(points, i, windowSec)
    if (bestIdx < 0) continue

    const best = points[bestIdx]

    // 盐丸出汗阈值判定 — 无条件全局累汗，任意航点均可触发
    const effectiveSaltMax = shouldTriggerSaltPill(sweatSinceLastSaltL) ? saltMax : 0

    // 从补给库匹配补给品，受吸收上限约束
    const { items, coveredKcal, coveredSodium, coveredCarbs } = matchNutrition(
      { kcal: Math.round(accKcal), sodiumMg: Math.round(accSodium), carbsG: Math.round(accCarbs) },
      library,
      { maxGels: gelMax, maxSalts: effectiveSaltMax, maxCarbsG: carbsMax }
    )

    if (items.length === 0) {
      continue
    }

    // 若盐丸被推荐，消耗出汗阈值
    const saltCount = items.filter(it => it.type === 'salt').reduce((s, it) => s + it.quantity, 0)
    if (saltCount > 0) {
      sweatSinceLastSaltL = Math.max(0, sweatSinceLastSaltL - SWEAT_SALT_THRESHOLD_L * saltCount)
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
