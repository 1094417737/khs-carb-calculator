// ============================================================
// 核心用户输入类型
// ============================================================

/** 心率区间 */
export type HRZone = '50-60' | '60-70' | '70-80' | '80-90' | '90-100'

/** GI 训练水平 */
export type GITrainingLevel = 'Low' | 'Moderate' | 'Well'

/** 出汗率个体差异 */
export type SweatRateProfile = 'Low' | 'Normal' | 'High'

/** 补给计划输入 */
export interface PlanInputs {
  durationMinutes: number
  distanceKm?: number       // 运动距离 (公里)
  hrZone: HRZone
  weightKg: number
  tempC: number
  giTraining: GITrainingLevel
  elevationGainM?: number  // 累计爬升 (米)
  sweatRateProfile?: SweatRateProfile  // 出汗率自测
  customCarbTarget?: number
}

// ============================================================
// 策略选项类型
// ============================================================

/** 自制补给糖浆比例 */
export type HomemadeRatio = '1:1' | '2:1' | '1:0.8'

/** 补给策略选项 */
export interface StrategyOptions {
  useCaffeine: boolean
  useHomemade: boolean
  selectedCommercialGel?: string
  selectedCommercialDrink?: string
  homemadeRatio: HomemadeRatio
}

// ============================================================
// 组合输入
// ============================================================

export interface CalculatorInputs {
  plan: PlanInputs
  strategy: StrategyOptions
}

// ============================================================
// 验证
// ============================================================

export interface ValidationError {
  field: string
  message: string
}

export type ValidationResult = ValidationError[]
