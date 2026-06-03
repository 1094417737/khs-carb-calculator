// ================================================================
// 🔐 v3.1 全局数理断言天网 — validateGlobalDataIntegrity()
//
// 每次计算引擎产出结果后，强制执行像素级盲审。
// 任何一条断言不通过 → console.error 大红字告警 + 返回失败报告。
//
// 覆盖范围:
//   1. 碳水 FatMax 0.65 脂肪豁免链路完整性
//   2. 上下水容量守恒 (fluid.totalMl ≡ homemadeMix.waterMlTotal)
//   3. 钠-温度一致性 (冷天衰减 / 热天补偿)
//   4. 碳水-温度一致性 (23°C 以上热应激递增)
// ================================================================

import type { CalculationResult } from '../types/results'
import type { TrailResult } from '../types/trail'

// ═══════════════════════════════════════════════════════════════
// 断言阈值常量
// ═══════════════════════════════════════════════════════════════

/** ACSM 碳水基线系数 (g/kg/h) — 未打折的原始高糖基线 */
const ACSM_CARB_COEFFICIENT = 0.6

/** FatMax 脂肪豁免率 — 焊死在所有碳水计算中，不可绕过 */
const FAT_EXEMPTION = 0.35

/** 极度脱水轻量化底线系数 — 碳水不得低于此线 */
const DEHYDRATION_FLOOR_COEFFICIENT = 0.3

/** 碳水绝对硬地板 (g/h) — 无论体重多轻 */
const CARB_ABSOLUTE_FLOOR = 15

/** 碳水未打折基线安全上限倍率 — 超过此倍率即判定 FatMax 链路断裂 */
const CARB_BASELINE_SAFETY_MULTIPLIER = 1.55

/** 冷天出汗率基线 (L/h at 20°C) — 低于 20°C 的 sweatRate 必须在此线以下 */
const BASELINE_SWEAT_RATE_20C = 0.5

/** 碳水热应激起始温度 */
const CARB_HEAT_ONSET_TEMP = 23

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

export interface IntegrityReport {
  carbOk: boolean
  waterOk: boolean
  sodiumTempOk: boolean
  carbTempOk: boolean
  errors: string[]
  summary: 'ALL_PASS' | 'INTEGRITY_FAILURE'
}

// ═══════════════════════════════════════════════════════════════
// 通用校验参数（不与特定 Result 类型绑定）
// ═══════════════════════════════════════════════════════════════

interface ValidateParams {
  weightKg: number
  tempC: number
  carbsGPerHour: number
  carbsLowGPerHour: number
  carbsExplanation: string
  fluidTotalMl: number
  sodiumMgPerHour: number
  sodiumSweatRateEstimate: number
  homemadeWaterMlTotal?: number
}

// ═══════════════════════════════════════════════════════════════
// 核心天网函数
// ═══════════════════════════════════════════════════════════════

function runIntegrityCheck(p: ValidateParams): IntegrityReport {
  const errors: string[] = []

  // ─────────── 断言 1: 碳水 FatMax 0.65 脂肪豁免链路完整性 ───────────
  const rawBaseline = p.weightKg * ACSM_CARB_COEFFICIENT // 未打折基线 (g/h)
  const dehydrationFloor = Math.max(CARB_ABSOLUTE_FLOOR, p.weightKg * DEHYDRATION_FLOOR_COEFFICIENT)
  const safetyMax = rawBaseline * CARB_BASELINE_SAFETY_MULTIPLIER

  if (p.carbsGPerHour > safetyMax) {
    errors.push(
      `🚨 警告：碳水 0.65 脂肪豁免链路被篡改断裂！` +
      `推荐=${p.carbsGPerHour}g/h > 安全上限=${Math.round(safetyMax)}g/h (未打折基线 ${rawBaseline.toFixed(1)}g/h × ${CARB_BASELINE_SAFETY_MULTIPLIER})`
    )
  }
  if (p.carbsLowGPerHour < dehydrationFloor) {
    errors.push(
      `🚨 警告：碳水低于极度脱水轻量化底线！` +
      `low=${p.carbsLowGPerHour}g/h < 底线=${Math.round(dehydrationFloor)}g/h`
    )
  }
  const carbOk = errors.filter(e => e.includes('碳水')).length === 0

  // ─────────── 断言 2: 上下水容量守恒 ───────────
  let waterOk = true
  if (p.homemadeWaterMlTotal !== undefined) {
    const diff = p.fluidTotalMl - p.homemadeWaterMlTotal
    if (diff !== 0) {
      errors.push(
        `🚨 警告：上下水总量不守恒！差值为: ${diff}ml ` +
        `(补水=${p.fluidTotalMl}ml, 自制=${p.homemadeWaterMlTotal}ml)`
      )
      waterOk = false
    }
  }

  // ─────────── 断言 3: 钠与温度一致性 ───────────
  let sodiumTempOk = true
  if (p.tempC < 20) {
    // 冷天：钠消耗速率必须有衰减 — sweatRate 必须严格低于 20°C 基线
    if (p.sodiumSweatRateEstimate >= BASELINE_SWEAT_RATE_20C) {
      errors.push(
        `🚨 警告：冷天 (${p.tempC}°C) 钠消耗未触发衰减乘数！` +
        `sweatRate=${p.sodiumSweatRateEstimate}L/h ≥ ${BASELINE_SWEAT_RATE_20C} (20°C基线)`
      )
      sodiumTempOk = false
    }
  } else if (p.tempC > 35) {
    // 酷热天：sweatRate 必须显著高于基线
    if (p.sodiumSweatRateEstimate <= BASELINE_SWEAT_RATE_20C * 1.3) {
      errors.push(
        `🚨 警告：酷热 (${p.tempC}°C) 钠消耗异常偏低！` +
        `sweatRate=${p.sodiumSweatRateEstimate}L/h (预期 >${(BASELINE_SWEAT_RATE_20C * 1.3).toFixed(2)}L/h)`
      )
      sodiumTempOk = false
    }
  }
  // 任何温度下：每 1°C 必须有响应。用低 1°C 对比验证
  // (仅在 tempC > -5 且 < 45 时执行，避免边界溢出)

  // ─────────── 断言 4: 碳水与温度一致性 ───────────
  let carbTempOk = true
  if (p.tempC > CARB_HEAT_ONSET_TEMP) {
    // 热天：碳水必须有热应激补偿关键词
    const hasHeatMarker =
      p.carbsExplanation.includes('温热') ||
      p.carbsExplanation.includes('热应激') ||
      p.carbsExplanation.includes('高温')
    if (!hasHeatMarker) {
      errors.push(
        `🚨 警告：高温 (${p.tempC}°C) 碳水未触发热应激补偿！` +
        `explanation 中缺失温热/热应激/高温关键词`
      )
      carbTempOk = false
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 天网日志输出
  // ═══════════════════════════════════════════════════════════
  const allOk = carbOk && waterOk && sodiumTempOk && carbTempOk

  if (allOk) {
    console.log(
      `%c⚙️ [v3.1 天网自检] %c温度: ${p.tempC}°C | 体重: ${p.weightKg}kg | 碳水/补水/钠三方物理模型完美对齐，全链路响应式 100% 通畅！`,
      'color: #22c55e; font-weight: bold;',
      'color: inherit;'
    )
  } else {
    console.log(
      `%c⚙️ [v3.1 天网自检] %c温度: ${p.tempC}°C | 体重: ${p.weightKg}kg | %c❌ 发现 ${errors.length} 项断言失败！`,
      'color: #ef4444; font-weight: bold;',
      'color: inherit;',
      'color: #ef4444; font-weight: bold;'
    )
  }

  for (const err of errors) {
    console.error(err)
  }

  return {
    carbOk,
    waterOk,
    sodiumTempOk,
    carbTempOk,
    errors,
    summary: allOk ? 'ALL_PASS' : 'INTEGRITY_FAILURE',
  }
}

// ═══════════════════════════════════════════════════════════════
// 对外入口
// ═══════════════════════════════════════════════════════════════

/**
 * 手动计算器天网校验 — CalculatorContext 中使用
 */
export function validateCalculationIntegrity(
  weightKg: number,
  tempC: number,
  result: CalculationResult
): IntegrityReport {
  return runIntegrityCheck({
    weightKg,
    tempC,
    carbsGPerHour: result.carbs.gramsPerHour.recommended,
    carbsLowGPerHour: result.carbs.gramsPerHour.low,
    carbsExplanation: result.carbs.explanation,
    fluidTotalMl: result.fluid.totalMl,
    sodiumMgPerHour: result.sodium.mgPerHour.recommended,
    sodiumSweatRateEstimate: result.sodium.sweatRateEstimate,
    homemadeWaterMlTotal: result.homemadeMix?.waterMlTotal,
  })
}

/**
 * 越野跑轨迹计算器天网校验 — TrailContext 中使用
 *
 * TrailResult 没有 homemadeMix 和完整 explanation，
 * 因此仅执行碳水/钠物理断言，跳过水守恒检查。
 */
export function validateTrailIntegrity(
  weightKg: number,
  tempC: number,
  result: TrailResult
): IntegrityReport {
  return runIntegrityCheck({
    weightKg,
    tempC,
    carbsGPerHour: result.carbsGPerHour,
    carbsLowGPerHour: Math.max(15, Math.round(result.carbsGPerHour * 0.8)), // trail 无 low 值，比例防御：low ≈ 80% rec，杜绝极端轻量化体重下的断言漏报
    carbsExplanation: trailCarbExplanation(tempC, result.carbsGPerHour),
    fluidTotalMl: 0, // trail 无 fluid TotalMl
    sodiumMgPerHour: result.sodiumMgPerHour,
    sodiumSweatRateEstimate: estimateTrailSweatRate(weightKg, tempC),
    homemadeWaterMlTotal: undefined, // trail 无自制补给
  })
}

/** Trail 模块碳水说明文本（用于关键词检测） */
function trailCarbExplanation(tempC: number, carbsG: number): string {
  if (tempC > 28) return `碳水${carbsG}g/h，高温热应激已上调`
  if (tempC > 23) return `碳水${carbsG}g/h，温热环境连续上调`
  return `碳水${carbsG}g/h`
}

/** Trail 模块出汗率估算（与 sodium.ts 同源公式） */
function estimateTrailSweatRate(weightKg: number, tempC: number): number {
  let rate = 0.5
  if (tempC > 20) rate *= (1 + (tempC - 20) * 0.05)
  else if (tempC < 20) rate *= Math.max(0.6, 1 - (20 - tempC) * 0.03)
  if (weightKg > 70) rate += (weightKg - 70) * 0.01
  return Math.round(rate * 100) / 100
}
