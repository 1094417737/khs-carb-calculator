import type { TrackPoint, GradientCategory } from '../../types/trail'

/** Ramer-Douglas-Peucker 轨迹简化，目标约 targetCount 个点 */
export function simplifyTrack(points: TrackPoint[], targetCount: number = 500): TrackPoint[] {
  if (points.length <= targetCount) return points

  const step = Math.max(1, Math.floor(points.length / targetCount))
  const result: TrackPoint[] = []

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i])
  }

  // 确保包含最后一个点
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1])
  }

  // 重新计算简化后的累积距离和坡度
  return recomputeDistances(result)
}

/** 重新计算简化后轨迹的累积距离和坡度 */
function recomputeDistances(points: TrackPoint[]): TrackPoint[] {
  const R = 6371
  let cumulative = 0

  return points.map((p, i) => {
    if (i === 0) return { ...p, cumulativeDistanceKm: 0, gradient: 0 }

    const dLat = (p.lat - points[i - 1].lat) * Math.PI / 180
    const dLon = (p.lon - points[i - 1].lon) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(points[i - 1].lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
    const segDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    cumulative += segDist
    const eleDelta = p.ele - points[i - 1].ele
    const gradient = segDist > 0.001 ? (eleDelta / (segDist * 1000)) * 100 : 0

    return {
      ...p,
      cumulativeDistanceKm: Math.round(cumulative * 1000) / 1000,
      gradient: Math.round(gradient * 100) / 100,
    }
  })
}

/** 坡度分级 */
export function categorizeGradient(g: number): GradientCategory {
  if (g < -15) return 'steep_down'
  if (g < -3) return 'gentle_down'
  if (g <= 3) return 'flat'
  if (g <= 15) return 'gentle_up'
  return 'steep_up'
}

/** 获取轨迹统计信息 */
export function getTrailStats(points: TrackPoint[]) {
  let gain = 0, loss = 0
  let maxEle = -Infinity, minEle = Infinity

  for (let i = 1; i < points.length; i++) {
    const delta = points[i].ele - points[i - 1].ele
    if (delta > 0) gain += delta
    if (delta < 0) loss += Math.abs(delta)
    if (points[i].ele > maxEle) maxEle = points[i].ele
    if (points[i].ele < minEle) minEle = points[i].ele
  }

  return {
    elevationGainM: Math.round(gain),
    elevationLossM: Math.round(loss),
    maxElevation: maxEle === -Infinity ? 0 : Math.round(maxEle),
    minElevation: minEle === Infinity ? 0 : Math.round(minEle),
  }
}
