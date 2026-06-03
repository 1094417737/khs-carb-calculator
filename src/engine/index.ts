import type { CalculatorInputs } from '../types'
import type { CalculationResult, CarbResult } from '../types/results'
import { calculateCarbs } from './carbs'
import { calculateFluid } from './fluid'
import { calculateSodium } from './sodium'
import { calculateCaffeinePlan } from './caffeine'
import { generateSchedule } from './schedule'
import { buildProductComparison } from './products'
import { calculateHomemadeMix } from './homemade'
import { RATIO_CARB_CEILING } from '../data/constants'

export function calculate(inputs: CalculatorInputs): CalculationResult {
  const { plan, strategy } = inputs

  let carbs = calculateCarbs(
    plan.hrZone,
    plan.giTraining,
    plan.durationMinutes,
    plan.elevationGainM,
    plan.customCarbTarget && plan.customCarbTarget > 0 ? plan.customCarbTarget : undefined,
    plan.tempC,
    plan.weightKg
  )

  // 自制模式：糖浆比例决定碳水吸收上限（双通道转运原理）
  if (strategy.useHomemade) {
    const ceiling = RATIO_CARB_CEILING[strategy.homemadeRatio]
    carbs = applyRatioCeiling(carbs, ceiling)
  }

  const fluid = calculateFluid(
    plan.hrZone,
    plan.weightKg,
    plan.tempC,
    plan.giTraining,
    plan.durationMinutes,
    plan.elevationGainM,
    plan.cyclingEnabled ? plan.cyclingWind : undefined,
    plan.sweatRateProfile
  )

  const sodium = calculateSodium(
    plan.hrZone,
    plan.weightKg,
    plan.tempC,
    plan.durationMinutes,
    plan.sweatRateProfile
  )

  // 骑行: 功率→kcal + 跟风→碳水修正
  let cyclingKcal: number | undefined
  if (plan.cyclingEnabled && plan.cyclingPowerWatts && plan.cyclingPowerWatts > 0) {
    const hours = plan.durationMinutes / 60
    // 机械功 kJ = Watts × hours × 3.6 → 近似 kcal (标准骑行营养学公式)
    cyclingKcal = Math.round(plan.cyclingPowerWatts * hours * 3.6)

    // 跟风节省能量 → 降低碳水需求 (Blocken 2018: 混合-15%, 跟风-27%)
    const draftingMod: Record<string, number> = { solo: 1.0, mixed: 0.85, drafting: 0.73 }
    const draftMod = draftingMod[plan.cyclingDrafting ?? 'solo']
    if (draftMod < 1.0) {
      carbs = {
        ...carbs,
        gramsPerHour: {
          low: Math.round(carbs.gramsPerHour.low * draftMod),
          recommended: Math.round(carbs.gramsPerHour.recommended * draftMod),
          high: Math.round(carbs.gramsPerHour.high * draftMod),
          unit: 'g',
        },
        totalGrams: Math.round(carbs.totalGrams * draftMod),
        explanation: carbs.explanation + `（跟风节能 ~${Math.round((1 - draftMod) * 100)}%）`,
      }
    }
  }

  const caffeine = calculateCaffeinePlan(
    plan.weightKg,
    plan.durationMinutes,
    strategy.useCaffeine
  )

  const productComparison = buildProductComparison(
    strategy,
    carbs,
    sodium,
    plan.durationMinutes
  )

  const homemadeMix = strategy.useHomemade
    ? calculateHomemadeMix(strategy.homemadeRatio, carbs.gramsPerHour.recommended, plan.durationMinutes, plan.giTraining, fluid.mlPerHour.recommended, fluid.totalMl)
    : undefined

  const schedule = generateSchedule(
    plan.durationMinutes,
    carbs,
    fluid,
    sodium,
    caffeine,
    productComparison,
    homemadeMix
  )

  const warnings: string[] = []
  if (caffeine?.warning) warnings.push(caffeine.warning)
  if (fluid.mlPerHour.recommended > 1200) {
    warnings.push('液体摄入量较高（>1200ml/h），GI训练水平低的人群可能出现腹胀。')
  }

  // 比例上限警告
  if (strategy.useHomemade) {
    const ceiling = RATIO_CARB_CEILING[strategy.homemadeRatio]
    if (carbs.gramsPerHour.recommended >= ceiling * 0.9) {
      warnings.push(`当前${strategy.homemadeRatio}比例碳水吸收上限约${ceiling}g/h，推荐值已接近上限。如需更高碳水摄入，建议切换至1:1比例开启双通道吸收。`)
    }
  }

  return { carbs, fluid, sodium, caffeine, schedule, productComparison, homemadeMix, cyclingKcal, warnings }
}

/** 根据糖浆比例上限修正碳水推荐值 */
function applyRatioCeiling(carbs: CarbResult, ceiling: number): CarbResult {
  if (carbs.gramsPerHour.recommended <= ceiling) return carbs

  const scale = ceiling / carbs.gramsPerHour.recommended
  return {
    ...carbs,
    gramsPerHour: {
      low: Math.round(carbs.gramsPerHour.low * scale),
      recommended: ceiling,
      high: Math.min(carbs.gramsPerHour.high, ceiling),
      unit: 'g',
    },
    totalGrams: Math.round(carbs.totalGrams * scale),
    explanation: carbs.explanation + `（已按比例上限调整为${ceiling}g/h）`,
  }
}
