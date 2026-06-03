import type { TrackPoint, UserProfile, WaypointConfig, NutritionItem, TrailResult, CustomMarker } from '../../types/trail'
import { simplifyTrack, getTrailStats } from './gradient'
import { applyGAP, totalTimeMinutes, equivalentFlatDistanceKm } from './gap'
import { placeWaypoints } from './waypoint'
import { kcalPerHour, sodiumMgPerHour, carbsGPerHour, sweatRateLPerHour } from './nutrition'

export { simplifyTrack, getTrailStats, categorizeGradient } from './gradient'
export { applyGAP, totalTimeMinutes, equivalentFlatDistance, equivalentFlatDistanceKm } from './gap'
export { placeWaypoints } from './waypoint'
export {
  kcalPerHour,
  sodiumMgPerHour,
  carbsGPerHour,
  sweatRateLPerHour,
  matchNutrition,
  defaultNutritionLibrary,
  gradientCarbMultiplier,
  fatigueMultiplier,
  computeTotalWorkload,
  shouldTriggerSaltPill,
  SWEAT_SALT_THRESHOLD_L,
  FAT_EXEMPTION,
} from './nutrition'

export interface ComputeTrailInput {
  points: TrackPoint[]
  profile: UserProfile
  waypointConfig: WaypointConfig
  nutritionLibrary: NutritionItem[]
  simplify?: boolean
  distanceOverrideKm?: number | null
  climbOverrideM?: number | null
  customMarkers?: CustomMarker[]
}

export function computeTrail(input: ComputeTrailInput): TrailResult {
  const stats = getTrailStats(input.points)

  let points = input.points
  if (input.simplify !== false && points.length > 500) {
    points = simplifyTrack(points, 500)
  }

  let withGAP = applyGAP(points, input.profile)
  const kcalH = kcalPerHour(input.profile.weightKg, input.profile.tempC)
  const sodiumH = sodiumMgPerHour(input.profile.weightKg, input.profile.tempC)
  const carbsH = carbsGPerHour(input.profile.weightKg, input.profile.gutTolerance, input.profile.tempC)

  // 强制对齐：将 GAP 推算的累积耗时缩放到目标完赛时间
  const gaptimeMin = totalTimeMinutes(withGAP)
  const targetMin = input.profile.targetTimeMinutes
  if (gaptimeMin > 0 && Math.abs(targetMin - gaptimeMin) > 1) {
    const timeScale = targetMin / gaptimeMin
    withGAP = withGAP.map((pt, i) =>
      i === 0 ? pt : { ...pt, timeElapsed: Math.round(pt.timeElapsed * timeScale) }
    )
  }

  const sweatH = sweatRateLPerHour(input.profile.weightKg, input.profile.tempC)
  const waypoints = placeWaypoints(withGAP, input.waypointConfig, input.nutritionLibrary, kcalH, sodiumH, carbsH, sweatH, input.customMarkers)
  let totalDist = input.points.length > 0 ? input.points[input.points.length - 1].cumulativeDistanceKm : 0
  let eqDist = equivalentFlatDistanceKm(withGAP)
  let timeMin = targetMin  // 强制使用目标完赛时间
  let gain = stats.elevationGainM

  if (input.climbOverrideM != null && gain > 0) {
    const climbDeltaKm = (input.climbOverrideM - gain) / 100
    const origEqDist = eqDist
    eqDist = Math.max(0.1, eqDist + climbDeltaKm)
    if (origEqDist > 0) timeMin = Math.round(timeMin * (eqDist / origEqDist))
    gain = input.climbOverrideM
  }

  if (input.distanceOverrideKm != null && input.distanceOverrideKm > 0 && totalDist > 0) {
    const distScale = input.distanceOverrideKm / totalDist
    timeMin = Math.round(timeMin * distScale)
    eqDist = Math.round(eqDist * distScale * 100) / 100
    totalDist = input.distanceOverrideKm
  }

  return {
    trackPoints: withGAP,
    waypoints,
    totalDistanceKm: Math.round(totalDist * 100) / 100,
    equivalentFlatDistanceKm: eqDist,
    totalTimeMinutes: timeMin,
    elevationGainM: gain,
    elevationLossM: stats.elevationLossM,
    maxElevation: stats.maxElevation,
    minElevation: stats.minElevation,
    kcalPerHour: kcalH,
    sodiumMgPerHour: sodiumH,
    carbsGPerHour: carbsH,
  }
}