import type { HRZone, SweatRateProfile } from '../types'
import type { SodiumResult } from '../types/results'

/** 出汗率个体差异系数 (ACSM 2007: 个体差异可达±50%) */
const SWEAT_PROFILE_MULTIPLIER: Record<SweatRateProfile, number> = {
  Low: 0.6,
  Normal: 1.0,
  High: 1.5,
}

export function calculateSodium(
  hrZone: HRZone,
  weightKg: number,
  tempC: number,
  durationMinutes: number,
  sweatRateProfile?: SweatRateProfile
): SodiumResult {
  // 基础出汗率估算 (L/hr)
  let sweatRate = 0.5
  if (tempC > 20) sweatRate += (tempC - 20) * 0.04
  if (weightKg > 70) sweatRate += (weightKg - 70) * 0.01
  if (['70-80', '80-90', '90-100'].includes(hrZone)) sweatRate += 0.2

  // 个体差异调节
  if (sweatRateProfile) {
    sweatRate *= SWEAT_PROFILE_MULTIPLIER[sweatRateProfile]
  }

  sweatRate = Math.round(sweatRate * 100) / 100

  const sweatSodiumPerL = 500

  let rec = Math.round(sweatRate * sweatSodiumPerL * 0.7)
  rec = Math.max(200, Math.min(rec, 1500))

  const low = Math.round(Math.max(150, rec * 0.6))
  const high = Math.round(Math.min(1800, rec * 1.5))

  const hours = durationMinutes / 60

  return {
    mgPerHour: { low, recommended: rec, high, unit: 'mg' },
    totalMg: Math.round(rec * hours),
    sweatRateEstimate: sweatRate,
    explanation: buildSodiumExplanation(sweatRate, rec, low, high, sweatRateProfile),
    citations: [
      'Maughan RJ, Shirreffs SM (2012) Scand J Med Sci Sports. 22(Suppl 1):5-13.',
      'Sawka MN et al. (2007) ACSM Position Stand. Med Sci Sports Exerc. 39(2):377-390.',
    ],
  }
}

function buildSodiumExplanation(
  sweatRate: number,
  rec: number,
  low: number,
  high: number,
  sweatProfile?: SweatRateProfile
): string {
  const profileLabel: Record<SweatRateProfile, string> = {
    Low: '较少出汗',
    Normal: '正常出汗',
    High: '较多出汗',
  }
  let base = `估算出汗率 ${sweatRate} L/h`
  if (sweatProfile) {
    base += `（${profileLabel[sweatProfile]}个体）`
  }
  base += `，按补充70%流失钠计算：推荐每小时 ${rec}mg 钠（范围 ${low}-${high}mg/h）。`
  return base
}
