import type { HRZone, GITrainingLevel } from '../types'
import type { CarbResult } from '../types/results'
import { BASE_CARB_RANGE, GI_CARB_MODIFIER, elevationCarbModifier, FAT_EXEMPTION } from '../data/constants'

/**
 * 脂肪豁免后碳水推荐值计算
 *
 * FAT_EXEMPTION 已焊死在 BASE 值层面（第一时间乘入），
 * 后续 GI/爬升/自定义目标等所有修正均建立在此豁免后的基础上。
 *
 * 参考: Jeukendrup 2014, ACSM 2016
 */
export function calculateCarbs(
  hrZone: HRZone,
  giTraining: GITrainingLevel,
  durationMinutes: number,
  elevationGainM?: number,
  customCarbTarget?: number,
  tempC?: number,
  weightKg?: number
): CarbResult {
  const base = BASE_CARB_RANGE[hrZone]
  const mod = GI_CARB_MODIFIER[giTraining]

  // 爬升修正
  const elevMod = elevationCarbModifier(elevationGainM ?? 0, durationMinutes)

  // ═══ 体重缩放：BASE_CARB_RANGE 按 65kg 校准，实际体重按比例缩放 ═══
  // 50kg → ×0.77, 80kg → ×1.23, 100kg → ×1.54
  const weightScale = weightKg !== undefined && weightKg > 0
    ? Math.max(0.5, Math.min(2.0, weightKg / 65))
    : 1.0
  // ═══════════════════════════════════════════════════════════════

  // ═══ FAT_EXEMPTION 焊死在 base 值第一层 ═══
  // base.* × (1 - 0.35) = base.* × 0.65
  const baseLow  = base.low  * (1 - FAT_EXEMPTION) * weightScale
  const baseRec  = base.rec  * (1 - FAT_EXEMPTION) * weightScale
  const baseHigh = base.high * (1 - FAT_EXEMPTION) * weightScale
  // ═══════════════════════════════════════════════

  let rec: number
  if (customCarbTarget !== undefined && customCarbTarget > 0) {
    const safeMax = Math.round(baseHigh * mod.max * elevMod)
    rec = Math.min(customCarbTarget, safeMax)
  } else {
    rec = Math.round(baseRec * mod.rec * elevMod)
  }

  let low  = Math.round(baseLow  * mod.min * elevMod)
  let high = Math.round(baseHigh * mod.max * elevMod)

  // ═══ 高温碳水加速：23-28°C 线性 +2%/°C，>28°C 极限应激 ×1.10 ═══
  // 参考: Febbraio 1994 (J Appl Physiol 76(1):131-137) — >28°C 糖原干烧加速
  //        Gonzalez-Alonso 1999 (J Appl Physiol 86(3):1032-1039) — 温热环境肌糖原利用渐进上升
  let heatMultiplier = 1.0
  let heatStressed = false
  let heatSevere = false
  if (tempC !== undefined && tempC > 23) {
    if (tempC > 28) {
      heatMultiplier = 1.10
      heatSevere = true
      heatStressed = true
    } else {
      heatMultiplier = 1 + (tempC - 23) * 0.02  // +2%/°C 连续递增
      heatStressed = true
    }
  }
  if (heatMultiplier !== 1.0) {
    rec  = Math.round(rec  * heatMultiplier)
    low  = Math.round(low  * heatMultiplier)
    high = Math.round(high * heatMultiplier)
  }
  // ═══════════════════════════════════════════════════════════════════

  const hours = durationMinutes / 60

  return {
    gramsPerHour: { low, recommended: rec, high, unit: 'g' },
    totalGrams: Math.round(rec * hours),
    explanation: buildCarbExplanation(hrZone, giTraining, rec, low, high, elevationGainM, durationMinutes, heatStressed, heatSevere, tempC, weightKg),
    citations: [
      'Thomas DT et al. (2016) ACSM Position Stand. Med Sci Sports Exerc. 48(3):543-568.',
      'Jeukendrup AE (2014) Sports Med. 44(Suppl 1):S25-S33.',
    ],
  }
}

function buildCarbExplanation(
  hrZone: HRZone,
  giTraining: GITrainingLevel,
  rec: number,
  low: number,
  high: number,
  elevationGainM?: number,
  durationMinutes?: number,
  heatStressed?: boolean,
  heatSevere?: boolean,
  tempC?: number,
  weightKg?: number
): string {
  const zoneMap: Record<HRZone, string> = {
    '50-60': '低强度恢复区',
    '60-70': '有氧基础区',
    '70-80': '节奏/耐力区',
    '80-90': '阈值强度区',
    '90-100': '最大摄氧量区',
  }
  const giMap: Record<GITrainingLevel, string> = {
    Low: 'GI适应水平较低',
    Moderate: 'GI适应水平中等',
    Well: 'GI适应水平良好',
  }
  let base = `基于${zoneMap[hrZone]}和${giMap[giTraining]}`
  if (weightKg !== undefined && weightKg > 0) base += `（${weightKg}kg）`
  base += `：推荐每小时补充 ${rec}g 碳水（范围 ${low}-${high}g/h）`
  if (elevationGainM && elevationGainM > 0 && durationMinutes && durationMinutes > 0) {
    const rate = Math.round(elevationGainM / (durationMinutes / 60))
    if (rate >= 200) base += `。因累计爬升 ${elevationGainM}m（${rate}m/h），碳水需求已上调`
  }
  if (heatSevere) {
    base += '。极限热应激（>28°C）致糖原干烧加速，碳水需求已上调 10%'
  } else if (heatStressed && tempC !== undefined) {
    base += `。温热环境（${tempC}°C）加速肌糖原消耗，碳水需求已连续上调 ~${Math.round((1 + (tempC - 23) * 0.02 - 1) * 100)}%`
  }
  return base + '。'
}
