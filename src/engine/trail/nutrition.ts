import type { NutritionItem, WaypointItem } from '../../types/trail'

// ================================================================
// 越野跑生理消耗模型 — 基于 ACSM 2016, Jeukendrup 2014, Sawka 2007
// 与项目现有补碳计算器共享科学基础
// ================================================================

/**
 * 每小时热量消耗 (kcal/h)
 *
 * 基于 ACSM 代谢当量 (MET) 模型:
 *   Trail running MET ≈ 7.5 (中等强度越野跑)
 *   kcal/h = MET × 体重(kg)
 *
 * 参考: Ainsworth BE et al. (2011) Compendium of Physical Activities.
 *       Med Sci Sports Exerc. 43(8):1575-1581.
 *       Thomas DT et al. (2016) ACSM Position Stand. Med Sci Sports Exerc. 48(3):543-568.
 */
export function kcalPerHour(weightKg: number): number {
  const MET = 7.5
  return Math.round(weightKg * MET)
}

/**
 * 每小时碳水化合物需求 (g/h)
 *
 * 基线: 0.6g/kg/h, 钳制在 30-90g/h
 * 对应中等强度运动下胃排空与肠道吸收能力
 *
 * 参考: Jeukendrup AE (2014) Sports Med. 44(Suppl 1):S25-S33.
 *       — 60-90g/h 依赖于葡萄糖+果糖双通道转运
 */
export function carbsGPerHour(weightKg: number): number {
  const base = Math.round(weightKg * 0.6)
  return Math.max(30, Math.min(90, base))
}

/**
 * 每小时钠流失量 (mg/h)
 *
 * 基于出汗率估算 + 汗液钠浓度:
 *   sweatRate(L/h) = 0.5 + 温度修正 + 体重修正
 *   naLoss = sweatRate × 500mg/L × 0.7 (补充70%流失量)
 *
 * 参考: Sawka MN et al. (2007) ACSM Position Stand. Med Sci Sports Exerc. 39(2):377-390.
 *       Maughan RJ, Shirreffs SM (2012) Scand J Med Sci Sports. 22(Suppl 1):5-13.
 */
export function sodiumMgPerHour(weightKg: number, tempC: number): number {
  let sweatRate = 0.5 // L/h 基线
  if (tempC > 20) sweatRate += (tempC - 20) * 0.04
  if (weightKg > 70) sweatRate += (weightKg - 70) * 0.01
  // 个体差异系数 ±50% 已体现在 sweatRate 基线保守估计中
  return Math.round(sweatRate * 500 * 0.7)
}

/** 累积缺口 */
export interface Deficit {
  kcal: number
  sodiumMg: number
  carbsG: number
}

/**
 * 从补给库匹配最佳物品组合来覆盖缺口
 * 受外部吸收上限控制
 */
export function matchNutrition(
  deficit: Deficit,
  library: NutritionItem[],
  limits?: { maxGels?: number; maxSalts?: number; maxCarbsG?: number }
): { items: WaypointItem[]; coveredKcal: number; coveredSodium: number; coveredCarbs: number } {
  if (library.length === 0) return { items: [], coveredKcal: 0, coveredSodium: 0, coveredCarbs: 0 }

  // 仅使用激活项作为计算基准
  const activeLibrary = library.filter(i => i.isActive !== false)
  if (activeLibrary.length === 0) return { items: [], coveredKcal: 0, coveredSodium: 0, coveredCarbs: 0 }

  const maxGels = limits?.maxGels ?? 99
  const maxSalts = limits?.maxSalts ?? 99
  const maxCarbs = limits?.maxCarbsG ?? 999

  const items: WaypointItem[] = []
  let coveredKcal = 0
  let coveredSodium = 0
  let coveredCarbs = 0

  // 优先用能量胶填补热量+碳水缺口
  const gelItems = activeLibrary
    .filter(i => i.type === 'gel' && i.kcal > 0)
    .sort((a, b) => b.kcal - a.kcal)

  let gelCount = 0
  for (const item of gelItems) {
    if (gelCount >= maxGels) break
    const neededKcal = deficit.kcal - coveredKcal
    const neededCarbs = deficit.carbsG - coveredCarbs
    if (neededKcal <= 0 && neededCarbs <= 0) break

    let qty = Math.max(
      Math.ceil(neededKcal / item.kcal),
      item.carbsG > 0 ? Math.ceil(neededCarbs / item.carbsG) : 0
    )
    qty = Math.min(qty, maxGels - gelCount)

    // 碳水吸收上限
    if (item.carbsG > 0) {
      const maxByCarbs = Math.floor((maxCarbs - coveredCarbs) / item.carbsG)
      qty = Math.min(qty, Math.max(0, maxByCarbs))
    }
    qty = Math.max(0, qty)

    if (qty > 0) {
      items.push({ itemId: item.id, itemName: item.name, quantity: qty, type: item.type })
      coveredKcal += qty * item.kcal
      coveredSodium += qty * item.sodiumMg
      coveredCarbs += qty * item.carbsG
      gelCount += qty
    }
  }

  // 用盐丸填补钠缺口
  const saltItems = activeLibrary
    .filter(i => i.type === 'salt' && i.sodiumMg > 0 && !items.some(r => r.itemId === i.id))
    .sort((a, b) => b.sodiumMg - a.sodiumMg)

  let saltCount = 0
  for (const item of saltItems) {
    if (saltCount >= maxSalts) break
    const neededSodium = deficit.sodiumMg - coveredSodium
    if (neededSodium <= 0) break

    let qty = Math.min(Math.ceil(neededSodium / item.sodiumMg), maxSalts - saltCount)
    qty = Math.max(0, qty)

    if (qty > 0) {
      items.push({ itemId: item.id, itemName: item.name, quantity: qty, type: item.type })
      coveredKcal += qty * item.kcal
      coveredSodium += qty * item.sodiumMg
      coveredCarbs += qty * item.carbsG
      saltCount += qty
    }
  }

  return { items, coveredKcal, coveredSodium, coveredCarbs }
}

/**
 * 默认补给库 — 基于市面通用产品数据
 *
 * 基础款能量胶: GU Energy Gel 近似值
 *   热量 111 kcal, 碳水 27 g, 钠 84 mg
 *   参考: GU Energy Labs 官方营养标签
 *
 * 标准盐丸: SaltStick Caps 近似值
 *   热量 0 kcal, 碳水 0 g, 钠 280 mg
 */
export function defaultNutritionLibrary(): NutritionItem[] {
  return [
    { id: 'default_gel', type: 'gel', name: '能量胶', kcal: 111, sodiumMg: 84, carbsG: 27, isActive: true },
    { id: 'default_salt', type: 'salt', name: '盐丸', kcal: 0, sodiumMg: 280, carbsG: 0, isActive: true },
  ]
}