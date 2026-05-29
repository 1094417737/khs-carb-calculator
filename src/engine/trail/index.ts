import type { TrackPoint, UserProfile, WaypointConfig, NutritionItem, TrailResult } from '../../types/trail'
import { simplifyTrack, getTrailStats } from './gradient'
import { applyGAP, totalTimeMinutes, equivalentFlatDistanceKm } from './gap'
import { placeWaypoints } from './waypoint'
import { kcalPerHour, sodiumMgPerHour, carbsGPerHour } from './nutrition'

export { simplifyTrack, getTrailStats, categorizeGradient } from './gradient'
export { applyGAP, totalTimeMinutes, equivalentFlatDistance, equivalentFlatDistanceKm } from './gap'
export { placeWaypoints } from './waypoint'
export { kcalPerHour, sodiumMgPerHour, carbsGPerHour, matchNutrition, defaultNutritionLibrary } from './nutrition'

export interface ComputeTrailInput {
  points: TrackPoint[]
  profile: UserProfile
  waypointConfig: WaypointConfig
  nutritionLibrary: NutritionItem[]
  simplify?: boolean
  distanceOverrideKm?: number | null
  climbOverrideM?: number | null
}

export function computeTrail(input: ComputeTrailInput): TrailResult {
  const stats = getTrailStats(input.points)

  let points = input.points
  if (input.simplify !== false && points.length > 500) {
    points = simplifyTrack(points, 500)
  }

  const withGAP = applyGAP(points, input.profile)
  const kcalH = kcalPerHour(input.profile.weightKg)
  const sodiumH = sodiumMgPerHour(input.profile.weightKg, input.profile.tempC)
  const carbsH = carbsGPerHour(input.profile.weightKg)
  const waypoints = placeWaypoints(withGAP, input.waypointConfig, input.nutritionLibrary, kcalH, sodiumH, carbsH)
  let totalDist = input.points.length > 0 ? input.points[input.points.length - 1].cumulativeDistanceKm : 0
  let eqDist = equivalentFlatDistanceKm(withGAP)
  let timeMin = totalTimeMinutes(withGAP)
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