import type { HRZone, GITrainingLevel, HomemadeRatio } from '../types'

/** HR 区间中文描述 */
export const HR_ZONE_LABELS: Record<HRZone, string> = {
  '50-60': '恢复 / 热身',
  '60-70': '有氧基础',
  '70-80': '节奏跑 / 长距离',
  '80-90': '阈值 / 高强度',
  '90-100': '最大摄氧量',
}

/** GI 训练水平中文描述 */
export const GI_TRAINING_LABELS: Record<GITrainingLevel, string> = {
  Low: '初学者 — 胃肠道对运动中进食较为敏感',
  Moderate: '有经验 — 胃肠道已适应中等量补给',
  Well: '适应性强 — 可耐受较高碳水摄入和大量液体',
}

/** 碳水基础范围 (g/h) — 按 HR 区间 */
export const BASE_CARB_RANGE: Record<HRZone, { low: number; rec: number; high: number }> = {
  '50-60':  { low: 20, rec: 30, high: 40 },
  '60-70':  { low: 30, rec: 45, high: 55 },
  '70-80':  { low: 45, rec: 60, high: 75 },
  '80-90':  { low: 60, rec: 75, high: 90 },
  '90-100': { low: 40, rec: 55, high: 70 },
}

/** GI 训练水平对碳水的调节系数 */
export const GI_CARB_MODIFIER: Record<GITrainingLevel, { min: number; rec: number; max: number }> = {
  Low:      { min: 0.70, rec: 0.85, max: 1.00 },
  Moderate: { min: 0.85, rec: 1.00, max: 1.15 },
  Well:     { min: 1.00, rec: 1.15, max: 1.30 },
}

/** 温度对补水的影响 */
export const TEMP_FLUID_OFFSET = [
  { threshold: 30, offset: 400 },
  { threshold: 25, offset: 250 },
  { threshold: 20, offset: 100 },
  { threshold: 10, offset: 25 },
  { threshold: -100, offset: 0 },
]

/** 体重对补水的影响 */
export function weightFluidOffset(kg: number): number {
  if (kg > 100) return 150
  if (kg > 85) return 100
  if (kg > 70) return 50
  if (kg < 50) return -50
  return 0
}

/** 强度对补水的影响 */
export const INTENSITY_FLUID_OFFSET: Record<HRZone, number> = {
  '50-60': -50,
  '60-70': 0,
  '70-80': 50,
  '80-90': 100,
  '90-100': 75,
}

/** GI 训练对补水上限的影响 */
export const GI_FLUID_MAX: Record<GITrainingLevel, number> = {
  Low: 800,
  Moderate: 1000,
  Well: 1200,
}

/** 爬升率 (m/h) 对碳水的调节系数 */
export function elevationCarbModifier(elevationGainM: number, durationMinutes: number): number {
  if (elevationGainM <= 0 || durationMinutes <= 0) return 1.0
  const rate = elevationGainM / (durationMinutes / 60)
  if (rate < 200) return 1.0
  if (rate < 400) return 1.10
  if (rate < 600) return 1.20
  return 1.30
}

/** 糖浆比例对应的碳水吸收上限 (g/h) — 双通道转运原理 */
export const RATIO_CARB_CEILING: Record<HomemadeRatio, number> = {
  '2:1':   60,   // 单转运蛋白为主
  '1:0.8': 80,   // 接近双通道
  '1:1':   90,   // 双通道全开 (葡萄糖SGLT1 + 果糖GLUT5)
}

/** 海盐换算: 1mg 钠 ≈ 2.5mg 食盐 (NaCl) */
export const SALT_PER_SODIUM = 2.5

/** 爬升率 (m/h) 对补水的额外加成 (ml) */
export function elevationFluidOffset(elevationGainM: number, durationMinutes: number): number {
  if (elevationGainM <= 0 || durationMinutes <= 0) return 0
  const rate = elevationGainM / (durationMinutes / 60)
  if (rate < 200) return 0
  if (rate < 400) return 50
  if (rate < 600) return 100
  return 150
}
