import type { HRZone, GITrainingLevel, WindLevel, SweatRateProfile } from '../types'
import type { FluidResult } from '../types/results'
import { weightFluidOffset, INTENSITY_FLUID_OFFSET, GI_FLUID_MAX, elevationFluidOffset } from '../data/constants'

/** 风速对补水的调节系数 (Saunders 2004, 风加速体表蒸发) */
const WIND_FLUID_MOD: Record<WindLevel, number> = {
  calm: 1.0,
  moderate: 1.10,
  strong: 1.20,
}

/** 出汗率个体差异对补水的影响 (ACSM 2007) */
const SWEAT_FLUID_MOD: Record<SweatRateProfile, number> = {
  Low: 0.6,
  Normal: 1.0,
  High: 1.5,
}

export function calculateFluid(
  hrZone: HRZone,
  weightKg: number,
  tempC: number,
  giTraining: GITrainingLevel,
  durationMinutes: number,
  elevationGainM?: number,
  cyclingWind?: WindLevel,
  sweatRateProfile?: SweatRateProfile
): FluidResult {
  let base = 500

  // ═══ 温度连续调节 (Sawka 2007 ACSM) ═══
  // 基准 20°C（热中性区）→ 无修正
  // 每高 1°C → +5% 出汗率（蒸发散热需求线性上升）
  // 每低 1°C → -3% 出汗率（低温血管收缩降低散热需求）
  // 底部设 0.4 倍硬地板，防止极端严寒归零
  if (tempC > 20) {
    base = Math.round(base * (1 + (tempC - 20) * 0.05))
  } else if (tempC < 20) {
    base = Math.round(base * Math.max(0.4, 1 - (20 - tempC) * 0.03))
  }

  // 体重调节
  base += weightFluidOffset(weightKg)

  // 强度调节
  base += INTENSITY_FLUID_OFFSET[hrZone]

  // 爬升调节
  base += elevationFluidOffset(elevationGainM ?? 0, durationMinutes)

  // 骑行风速调节
  if (cyclingWind) {
    base = Math.round(base * WIND_FLUID_MOD[cyclingWind])
  }

  // 出汗率个体差异调节（在 GI 上限之前应用，上限仍为安全帽）
  if (sweatRateProfile) {
    base = Math.round(base * SWEAT_FLUID_MOD[sweatRateProfile])
  }

  // GI上限
  const maxSafe = GI_FLUID_MAX[giTraining]
  const rec = Math.round(Math.min(base, maxSafe))
  const low = Math.round(rec * 0.7)
  const high = Math.round(Math.min(rec * 1.3, maxSafe))

  const hours = durationMinutes / 60

  return {
    mlPerHour: { low, recommended: rec, high, unit: 'ml' },
    totalMl: Math.round(rec * hours),
    explanation: buildFluidExplanation(tempC, weightKg, rec, low, high, maxSafe, elevationGainM, durationMinutes, cyclingWind, sweatRateProfile),
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
  durationMinutes?: number,
  cyclingWind?: WindLevel,
  sweatRateProfile?: SweatRateProfile
): string {
  const parts: string[] = []
  if (tempC > 25) parts.push(`高温 ${tempC}°C 显著增加出汗`)
  else if (tempC > 20) parts.push(`温度 ${tempC}°C 略高于热中性区`)
  else if (tempC < 10) parts.push(`低温 ${tempC}°C 显著减少出汗需求`)
  else if (tempC < 20) parts.push(`凉爽 ${tempC}°C 降低出汗需求`)
  if (weightKg > 85) parts.push('体重较大需额外补充')
  if (elevationGainM && elevationGainM > 0 && durationMinutes && durationMinutes > 0) {
    const rate = Math.round(elevationGainM / (durationMinutes / 60))
    if (rate >= 200) parts.push(`爬升${elevationGainM}m增加出汗`)
  }
  if (cyclingWind && cyclingWind !== 'calm') {
    const windLabel = cyclingWind === 'moderate' ? '中等风' : '大风'
    parts.push(`${windLabel}加速蒸发，补水已上调`)
  }
  if (sweatRateProfile) {
    const profileLabel: Record<SweatRateProfile, string> = { Low: '较少出汗', Normal: '正常出汗', High: '较多出汗' }
    parts.push(`出汗率自测：${profileLabel[sweatRateProfile]}个体`)
  }
  parts.push(`推荐每小时 ${rec}ml（范围 ${low}-${high}ml/h，上限 ${maxSafe}ml/h）`)
  return parts.join('；') + '。'
}

