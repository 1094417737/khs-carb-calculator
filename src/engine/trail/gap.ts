import type { TrackPoint, UserProfile } from '../../types/trail'

/**
 * GAP (Grade-Adjusted Pace) 时间推演引擎 v2
 *
 * 流程:
 * 1. 计算整条轨迹的等效平地距离
 *    — 每爬升100m = 等效平地增加1km
 *    — 陡下坡(<-15%)加制动惩罚
 * 2. 基准平地配速 = 目标完赛时间 / 等效平地距离
 * 3. 逐点根据坡度系数推算累计耗时
 */

/** 计算等效平地距离 */
export function equivalentFlatDistance(points: TrackPoint[]): number {
  let flatDist = 0
  for (let i = 1; i < points.length; i++) {
    const segDist = points[i].cumulativeDistanceKm - points[i - 1].cumulativeDistanceKm
    if (segDist <= 0) continue

    const eleDelta = points[i].ele - points[i - 1].ele
    let bonus = 0

    if (eleDelta > 0) {
      // 爬升: 每100m +1km
      bonus = eleDelta / 100
    } else if (points[i].gradient < -15) {
      // 陡下坡制动惩罚: 每100m下降 +0.3km (比陡上坡刹车更费能)
      bonus = Math.abs(eleDelta) / 100 * 0.3
    } else if (points[i].gradient < -3) {
      // 缓下坡: 略微减少等效距离 (跑得更快)
      bonus = -Math.abs(eleDelta) / 100 * 0.15
    }

    flatDist += segDist + bonus
  }
  return Math.max(flatDist, points[points.length - 1].cumulativeDistanceKm)
}

/** GAP 时间推演 */
export function applyGAP(points: TrackPoint[], profile: UserProfile): TrackPoint[] {
  const eqDist = equivalentFlatDistance(points)
  const flatPaceMinPerKm = profile.targetTimeMinutes / eqDist
  const flatSpeedKmPerH = 60 / flatPaceMinPerKm

  let totalSeconds = 0
  const result: TrackPoint[] = [{ ...points[0], timeElapsed: 0 }]

  for (let i = 1; i < points.length; i++) {
    const segDistKm = points[i].cumulativeDistanceKm - points[i - 1].cumulativeDistanceKm
    if (segDistKm <= 0) {
      result.push({ ...points[i], timeElapsed: totalSeconds })
      continue
    }

    const mult = speedMultiplier(points[i].gradient)
    const speedKmPerH = flatSpeedKmPerH * mult
    totalSeconds += (segDistKm / speedKmPerH) * 3600
    result.push({ ...points[i], timeElapsed: Math.round(totalSeconds) })
  }

  return result
}

/** 坡度 → 速度系数 */
function speedMultiplier(gradient: number): number {
  if (gradient > 0) {
    const g = Math.min(gradient, 15)
    return 1.0 - (g / 15) * 0.45
  }
  if (gradient >= -3) {
    return 1.0 + (Math.abs(gradient) / 3) * 0.05
  }
  if (gradient >= -15) {
    const t = (Math.abs(gradient) - 3) / 12
    return 1.0 + t * 0.2 - t * t * 0.25
  }
  return 0.70
}

export function totalTimeMinutes(points: TrackPoint[]): number {
  if (points.length === 0) return 0
  return Math.round(points[points.length - 1].timeElapsed / 60)
}

export function equivalentFlatDistanceKm(points: TrackPoint[]): number {
  return Math.round(equivalentFlatDistance(points) * 100) / 100
}