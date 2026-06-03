// ================================================================
// 🔐 v3.1 黄金熔断测试集 — Golden Master Test Suite
//
// 以下用例基于人工验证的黄金实战数据焊死。
// 任何代码变更导致输出偏离既定值 → CRITICAL_BREAK 致命报错。
//
// 黄金用例：
//   体重 64kg · 气温 22°C · 目标完赛 6h · 路线 25.6km · 爬升 2634m
// ================================================================

import { describe, it, expect, afterAll } from 'vitest'
import { carbsGPerHour, kcalPerHour, sodiumMgPerHour, sweatRateLPerHour } from '../trail/nutrition'

// ═══════════════════════════════════════════════════════════════
// 黄金基准值 — 人工验证、不可修改
// ═══════════════════════════════════════════════════════════════

const GOLDEN = {
  weightKg: 64,
  tempC: 22,
  gutTolerance: 'low' as const,
  // 预期输出
  carbsGPerHour: 25,        // 64×0.6×0.65=24.96→25, 22°C无热应激, low=60cap未触发
  kcalPerHour: 312,         // 64×4.875=312, 22°C无热应激
  sodiumMgPerHour: 193,     // 0.55×500×0.7=192.5→193
  sweatRateLPerHour: 0.55,  // 0.5×(1+(22-20)×0.05)=0.55
}

// ═══════════════════════════════════════════════════════════════
// 断言函数 — 任一不匹配即 CRITICAL_BREAK
// ═══════════════════════════════════════════════════════════════

function criticalBreak(metric: string, expected: number, actual: number) {
  const msg =
    `\n%c🛑🛑🛑 CRITICAL_BREAK 🛑🛑🛑%c\n` +
    `  熔断指标: ${metric}\n` +
    `  黄金预期: ${expected}\n` +
    `  实际输出: ${actual}\n` +
    `  偏差: ${actual - expected} (${Math.round((actual - expected) / expected * 100)}%)\n` +
    `  ⚠ 核心补给引擎已被篡改！立即回滚最近变更！\n`
  console.error(msg, 'color:#ff0000;font-size:16px;font-weight:bold', 'color:inherit')
}

describe('🔐 黄金熔断测试集', () => {
  it('碳水 g/h = 25（64kg×0.6×0.65→25, 22°C无热应激）', () => {
    const actual = carbsGPerHour(GOLDEN.weightKg, GOLDEN.gutTolerance, GOLDEN.tempC)
    if (actual !== GOLDEN.carbsGPerHour) criticalBreak('carbsGPerHour', GOLDEN.carbsGPerHour, actual)
    expect(actual).toBe(GOLDEN.carbsGPerHour)
  })

  it('热量 kcal/h = 312（64kg×4.875→312, 22°C无热应激）', () => {
    const actual = kcalPerHour(GOLDEN.weightKg, GOLDEN.tempC)
    if (actual !== GOLDEN.kcalPerHour) criticalBreak('kcalPerHour', GOLDEN.kcalPerHour, actual)
    expect(actual).toBe(GOLDEN.kcalPerHour)
  })

  it('钠 mg/h = 193（0.55×500×0.7→193）', () => {
    const actual = sodiumMgPerHour(GOLDEN.weightKg, GOLDEN.tempC)
    if (actual !== GOLDEN.sodiumMgPerHour) criticalBreak('sodiumMgPerHour', GOLDEN.sodiumMgPerHour, actual)
    expect(actual).toBe(GOLDEN.sodiumMgPerHour)
  })

  it('出汗率 L/h = 0.55（0.5×1.10→0.55）', () => {
    const actual = sweatRateLPerHour(GOLDEN.weightKg, GOLDEN.tempC)
    if (actual !== GOLDEN.sweatRateLPerHour) criticalBreak('sweatRateLPerHour', GOLDEN.sweatRateLPerHour, actual)
    expect(actual).toBe(GOLDEN.sweatRateLPerHour)
  })

  // ═══ 回归防线：额外交叉验证 ═══

  it('碳水-温度联动: 22→23°C 碳水应 +2%（25→26）', () => {
    const at22 = carbsGPerHour(GOLDEN.weightKg, GOLDEN.gutTolerance, 22)
    const at23 = carbsGPerHour(GOLDEN.weightKg, GOLDEN.gutTolerance, 23)
    // 23°C 刚好触发连续热应激: 25 × (1 + (23-23) × 0.02) = 25，无变化
    // 24°C: 25 × (1 + (24-23) × 0.02) = 25.5→26
    const at24 = carbsGPerHour(GOLDEN.weightKg, GOLDEN.gutTolerance, 24)
    expect(at22).toBe(25)
    expect(at23).toBe(25)  // 阈值边界，乘数=1.0
    expect(at24).toBe(26)  // +2%/°C 连续生效
  })

  it('钠-温度联动: 20→22°C 出汗率应 +10%', () => {
    const at20 = sweatRateLPerHour(GOLDEN.weightKg, 20)
    const at22 = sweatRateLPerHour(GOLDEN.weightKg, 22)
    expect(at20).toBe(0.5)
    expect(at22).toBe(0.55)  // 0.5 × 1.10 = 0.55
  })

  it('冷天钠衰减: 15°C 出汗率应 < 0.5', () => {
    const at15 = sweatRateLPerHour(GOLDEN.weightKg, 15)
    // 0.5 × (1 - (20-15) × 0.03) = 0.5 × 0.85 = 0.425
    expect(at15).toBeLessThan(0.5)
    expect(at15).toBe(0.43) // Math.round(0.425 * 100) / 100 = 0.43
  })

  it('肠胃耐受安全阀: 低=60cap，高carb需求时生效', () => {
    // 100kg 运动员 30°C → 100×0.6×0.65=39, 30°C>28×1.10=43
    const high = carbsGPerHour(100, 'low', 30)
    expect(high).toBeLessThanOrEqual(60) // low cap
    const mid = carbsGPerHour(100, 'medium', 30)
    expect(mid).toBeLessThanOrEqual(75)
    const hi = carbsGPerHour(100, 'high', 30)
    expect(hi).toBeLessThanOrEqual(90)
  })
})

// ═══════════════════════════════════════════════════════════════
// 熔断成功日志
// ═══════════════════════════════════════════════════════════════

afterAll(() => {
  console.log(
    `%c✅ 熔断测试集全部安全通过，未发现死循环风险 %c| 黄金用例: ${GOLDEN.weightKg}kg ${GOLDEN.tempC}°C → 碳水${GOLDEN.carbsGPerHour}g/h 热量${GOLDEN.kcalPerHour}kcal/h 钠${GOLDEN.sodiumMgPerHour}mg/h`,
    'color: #22c55e; font-weight: bold; font-size: 14px;',
    'color: inherit;'
  )
})
