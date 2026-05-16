// ============================================================
// 计算结果类型
// ============================================================

/** 推荐范围（低-推荐-高） */
export interface MetricRange {
  low: number
  recommended: number
  high: number
  unit: string
}

/** 碳水计算结果 */
export interface CarbResult {
  gramsPerHour: MetricRange
  totalGrams: number
  gelEquivalentsPerHour?: number
  drinkEquivalentsPerHour?: number
  explanation: string
  citations: string[]
}

/** 补水计算结果 */
export interface FluidResult {
  mlPerHour: MetricRange
  totalMl: number
  explanation: string
  citations: string[]
}

/** 钠补充计算结果 */
export interface SodiumResult {
  mgPerHour: MetricRange
  totalMg: number
  sweatRateEstimate: number
  explanation: string
  citations: string[]
}

/** 单次咖啡因剂量 */
export interface CaffeineDose {
  timeMinutes: number
  label: string
  doseMg: number
  notes: string
}

/** 咖啡因策略 */
export interface CaffeinePlan {
  totalDoseMg: number
  doses: CaffeineDose[]
  warning?: string
  explanation: string
  citations: string[]
}

/** 补给时间表单项 */
export interface ScheduleItem {
  timeMinutes: number
  timeLabel: string
  action: string
  carbs: number
  fluid: number
  sodium: number
  caffeine?: number
}

/** 补给进食时间表 */
export interface FeedingSchedule {
  intervalMinutes: number
  items: ScheduleItem[]
}

/** 产品对比 */
export interface ProductComparison {
  selectedGelLabel?: string
  selectedDrinkLabel?: string
  totalGelsNeeded: number
  totalDrinkServingsNeeded: number
  totalCarbsFromProducts: number
  totalSodiumFromProducts: number
  carbShortfall: number
  sodiumShortfall: number
  totalCost?: number
  gelCarbsPerServing?: number
  drinkCarbsPerServing?: number
}

/** 自制补给配比 */
export interface HomemadeMix {
  glucosePerHour: number
  fructosePerHour: number
  totalSugarPerHour: number
  waterMlPerHour: number
  glucoseTotal: number
  fructoseTotal: number
  totalSugarTotal: number
  waterMlTotal: number
  concentration: number
  explanation: string
}

/** 完整计算结果 */
export interface CalculationResult {
  carbs: CarbResult
  fluid: FluidResult
  sodium: SodiumResult
  caffeine?: CaffeinePlan
  schedule: FeedingSchedule
  productComparison?: ProductComparison
  homemadeMix?: HomemadeMix
  cyclingKcal?: number
  warnings: string[]
}
