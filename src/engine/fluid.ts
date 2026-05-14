import type { HRZone, GITrainingLevel } from '../types'
import type { FluidResult } from '../types/results'
import { TEMP_FLUID_OFFSET, weightFluidOffset, INTENSITY_FLUID_OFFSET, GI_FLUID_MAX, elevationFluidOffset } from '../data/constants'

export function calculateFluid(
  hrZone: HRZone,
  weightKg: number,
  tempC: number,
  giTraining: GITrainingLevel,
  durationMinutes: number,
  elevationGainM?: number
): FluidResult {
  let base = 500

  // 温度调节
  for (const entry of TEMP_FLUID_OFFSET) {
    if (tempC > entry.threshold) {
      base += entry.offset
      break
    }
  }

  // 体重调节
  base += weightFluidOffset(weightKg)

  // 强度调节
  base += INTENSITY_FLUID_OFFSET[hrZone]

  // 爬升调节
  base += elevationFluidOffset(elevationGainM ?? 0, durationMinutes)

  // GI上限
  const maxSafe = GI_FLUID_MAX[giTraining]
  const rec = Math.round(Math.min(base, maxSafe))
  const low = Math.round(rec * 0.7)
  const high = Math.round(Math.min(rec * 1.3, maxSafe))

  const hours = durationMinutes / 60

  return {
    mlPerHour: { low, recommended: rec, high, unit: 'ml' },
    totalMl: Math.round(rec * hours),
    explanation: buildFluidExplanation(tempC, weightKg, rec, low, high, maxSafe, elevationGainM, durationMinutes),
    citations: [
      'Sawka MN et al. (2007) ACSM Position Stand. Med Sci Sports Exerc. 39(2):377-390.',
    ],
  }
}

function buildFluidExplanation(
  tempC: number,
  weightKg: number,
  rec: number,
  low: number,
  high: number,
  maxSafe: number,
  elevationGainM?: number,
  durationMinutes?: number
): string {
  const parts: string[] = []
  if (tempC > 25) parts.push('高温环境需增加补水')
  if (weightKg > 85) parts.push('体重较大需额外补充')
  if (elevationGainM && elevationGainM > 0 && durationMinutes && durationMinutes > 0) {
    const rate = Math.round(elevationGainM / (durationMinutes / 60))
    if (rate >= 200) parts.push(`爬升${elevationGainM}m增加出汗`)
  }
  parts.push(`推荐每小时 ${rec}ml（范围 ${low}-${high}ml/h，上限 ${maxSafe}ml/h）`)
  return parts.join('；') + '。'
}

