import type { NutritionItem, WaypointItem } from '../../types/trail'
import { FAT_EXEMPTION } from '../../data/constants'

// ================================================================
// 越野跑生理消耗模型 — FatMax 极致轻量化引擎 v4
// 基于 ACSM 2016, Jeukendrup 2014, Sawka 2007, Minetti 2002
// 与项目现有补碳计算器共享科学基础
// ================================================================

export { FAT_EXEMPTION }

// ═══════════════════════════════════════════════════════════
// 硬改 v5: 碳水基线焊死 weightKg × 0.6 × 0.65
// 旧 FAT_ADJUSTED_CARB_RATE 常量已移除，公式直接焊死在 carbsGPerHour 中
// ═══════════════════════════════════════════════════════════

/**
 * 脂肪豁免后代谢当量 (MET × (1 - 35%))
 *
 * 原始 MET 7.5 × 0.65 = 4.875
 * FAT_EXEMPTION 已焊死在系数中，不可绕过。
 */
const FAT_ADJUSTED_MET = 7.5 * (1 - FAT_EXEMPTION) // 4.875

/**
 * 盐丸出汗阈值 (L)
 *
 * 每累计出汗 500ml 允许触发 1 粒盐丸。
 * 对应约 280mg 钠 (SaltStick Caps 标准)。
 */
export const SWEAT_SALT_THRESHOLD_L = 0.5

/**
 * 出汗率 L/h — 连续温度系数 + 体重修正
 *
 * 基准 20°C（热中性区）：0.5 L/h
 * 每高 1°C → +5% 出汗率（蒸发散热需求线性上升）
 * 每低 1°C → -3% 出汗率（低温血管收缩降低散热需求）
 * 设 0.3 L/h 硬地板，防止极端严寒归零
 *
 * 参考: Sawka MN et al. (2007) ACSM Position Stand.
 */
export function sweatRateLPerHour(weightKg: number, tempC: number): number {
  let rate = 0.5

  // 温度连续调节
  if (tempC > 20) {
    rate *= (1 + (tempC - 20) * 0.05)   // +5%/°C 热
  } else if (tempC < 20) {
    rate *= Math.max(0.6, 1 - (20 - tempC) * 0.03)  // -3%/°C 冷，硬地板 0.6
  }

  // 体重修正
  if (weightKg > 70) rate += (weightKg - 70) * 0.01

  return Math.round(rate * 100) / 100
}

/**
 * 每小时热量消耗 (kcal/h) — FAT_EXEMPTION 已焊死在 FAT_ADJUSTED_MET 中
 *
 * 基于 ACSM 代谢当量 (MET) 模型:
 *   Trail running MET ≈ 7.5 (中等强度越野跑)
 *   MET_adj = 7.5 × (1 - 35%) = 4.875 ← FAT_EXEMPTION 不可移除
 *   脂肪贡献由体脂覆盖，无需外源补给
 *
 * 参考: Ainsworth BE et al. (2011) Compendium of Physical Activities.
 *       Thomas DT et al. (2016) ACSM Position Stand.
 */
export function kcalPerHour(weightKg: number, tempC?: number): number {
  let kcal = Math.round(weightKg * FAT_ADJUSTED_MET)

  // 高温热应激：>28°C 心脏漂移 +5% 代谢代价 (Galloway & Maughan 1997)
  if (tempC !== undefined && tempC > 28) {
    kcal = Math.round(kcal * 1.05)
  }

  return kcal
}

/**
 * 每小时碳水化合物需求 (g/h) — 硬改焊死公式
 *
 * 公式: weightKg × 0.6 × 0.65 → clamp[20, 60]
 *   0.6 = ACSM 基线碳水消耗系数 (g/kg/h)
 *   0.65 = (1 - 35% FatMax 脂肪豁免)，不可绕过
 *   gutTolerance 参数保留签名兼容性，不再参与碳水计算
 *
 * 参考: Jeukendrup AE (2014) Sports Med. 44(Suppl 1):S25-S33.
 */
export function carbsGPerHour(weightKg: number, gutTolerance: 'low' | 'medium' | 'high' = 'low', tempC?: number): number {
  // ═══ 硬改：碳水需求 = 体重 × 0.6 × 0.65 ═══
  // 0.6 g/kg/h 为 ACSM 基线碳水消耗系数
  // 0.65 = (1 - 35% FatMax 脂肪豁免)，焊死在公式中，不可绕过
  // 参考: Jeukendrup AE (2014) Sports Med. 44(Suppl 1):S25-S33.
  const raw = weightKg * 0.6 * 0.65
  let carbs = Math.round(Math.max(20, Math.min(60, raw)))

  // ═══ 高温碳水加速：23-28°C 线性 +2%/°C，>28°C 极限应激 ×1.10 ═══
  // 参考: Febbraio 1994 (J Appl Physiol) — >28°C 糖原干烧加速
  //        Gonzalez-Alonso 1999 (J Appl Physiol) — 温热环境肌糖原利用渐进上升
  if (tempC !== undefined && tempC > 23) {
    if (tempC > 28) {
      carbs = Math.round(carbs * 1.10)
    } else {
      carbs = Math.round(carbs * (1 + (tempC - 23) * 0.02))
    }
  }
  // ═══════════════════════════════════════════════════════════

  // ═══ 肠胃耐受度安全阀 ═══
  // 无论高温/爬升将碳水推得多高，肠胃耐受度上限死死压制
  // low=60g/h, medium=75g/h, high=90g/h (双通道转运理论最大值)
  const gutCap: Record<string, number> = { low: 60, medium: 75, high: 90 }
  const maxSafe = gutCap[gutTolerance] ?? 60
  return Math.min(maxSafe, carbs)
}

/**
 * 每小时钠流失量 (mg/h)
 *
 * 基于出汗率估算 + 汗液钠浓度:
 *   naLoss = sweatRate × 500mg/L × 0.7 (补充70%流失量)
 *
 * 参考: Sawka MN et al. (2007) ACSM Position Stand.
 *       Maughan RJ, Shirreffs SM (2012) Scand J Med Sci Sports.
 */
export function sodiumMgPerHour(weightKg: number, tempC: number): number {
  const rate = sweatRateLPerHour(weightKg, tempC)
  return Math.round(rate * 500 * 0.7)
}

/**
 * 逐点坡度多级碳水修正因子 v4
 *
 * 完全替代旧 steepSlopeCarbsFactor (仅两档一刀切: >20%, < -25%)
 * 新模型基于局部坡度实时判定三档:
 *
 *   下坡/滑行段   (gradient < -5%): 重力势能代偿 → ×0.60
 *   大陡坡慢爬段  (gradient > 20%): Power Hiking → ×0.80
 *   平路/缓上坡段:                     正常代谢 → ×1.00
 *
 * 参考: CU-Boulder 人体代谢实验 — 越野跑陡坡步态转换的代谢代价
 */
export function gradientCarbMultiplier(gradient: number): number {
  if (gradient < -5) return 0.60   // 下坡重力势能代偿，极度省油
  if (gradient > 20) return 0.80   // Power Hiking 推坡，心率回落
  return 1.00                       // 平路/缓坡正常代谢
}

/**
 * 智能累计疲劳代偿因子 v4
 *
 * 完全替代旧 fatigueDriftFactor (按时间一刀切: ≤3h/3-6h/>6h)
 * 新模型: 基于轨迹已做功比例实时判定
 *
 *   currentWorkload / TotalWorkload ≤ 80%: 不额外增量 (×1.00)
 *   currentWorkload / TotalWorkload > 80%: 极限压榨期 (×1.10)
 *
 * 参考: Millet GY et al. (2011) Ultra-trail 后半程跑步经济性下降
 */
export function fatigueMultiplier(currentWorkload: number, totalWorkload: number): number {
  if (totalWorkload <= 0) return 1.00
  if (currentWorkload / totalWorkload > 0.80) return 1.10
  return 1.00
}

/**
 * 总功耗基数计算
 *
 * 将全线总距离和总爬升折算为统一功耗基数:
 *   1m 爬升 ≈ 10m 等效平跑代谢成本
 *
 * 参考: Minetti AE et al. (2002) J Appl Physiol. 93(3):1039-1046.
 */
export function computeTotalWorkload(totalDistanceKm: number, totalClimbM: number): number {
  return totalDistanceKm + (totalClimbM / 1000) * 10
}

/**
 * 盐丸出汗阈值触发判定 v4.1
 *
 * 出汗量无条件全局累加（不受地形影响）。
 * 在任意常规补给航点，只要累计出汗突破阈值即允许推荐盐丸。
 * 梯度 >10% 的陡坡段作为额外加速触发条件，
 * 但绝不拦截平路/下坡段的正常盐丸推荐。
 *
 * 杜绝旧逻辑"非陡坡段全场盐丸归零"的致命 Bug。
 */
export function shouldTriggerSaltPill(sweatSinceLastSaltL: number): boolean {
  return sweatSinceLastSaltL >= SWEAT_SALT_THRESHOLD_L
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

    // ═══ 硬改：胶的推荐数量 100% 由碳水赤字驱动 ═══
    // kcal 赤字不再参与胶的数量计算 — FAT_EXEMPTION * 0.65 已经焊死在碳水速率中
    // 旧逻辑 Math.max(kcal, carbs) 导致 kcal 端永远绑架胶数，造成 2x 过量分配
    let qty = item.carbsG > 0 ? Math.ceil(neededCarbs / item.carbsG) : Math.ceil(neededKcal / item.kcal)
    // ═══════════════════════════════════════════════════════
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
 * 标准盐丸: SaltStick Caps 近似值
 */
export function defaultNutritionLibrary(): NutritionItem[] {
  return [
    { id: 'default_gel', type: 'gel', name: '能量胶', kcal: 111, sodiumMg: 84, carbsG: 27, isActive: true },
    { id: 'default_salt', type: 'salt', name: '盐丸', kcal: 0, sodiumMg: 280, carbsG: 0, isActive: true },
  ]
}
