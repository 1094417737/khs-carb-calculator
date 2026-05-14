import type { HRZone, GITrainingLevel } from '../types'
import type { CarbResult } from '../types/results'
import { BASE_CARB_RANGE, GI_CARB_MODIFIER, elevationCarbModifier } from '../data/constants'

export function calculateCarbs(
  hrZone: HRZone,
  giTraining: GITrainingLevel,
  durationMinutes: number,
  elevationGainM?: number,
  customCarbTarget?: number
): CarbResult {
  const base = BASE_CARB_RANGE[hrZone]
  const mod = GI_CARB_MODIFIER[giTraining]

  // 爬升修正
  const elevMod = elevationCarbModifier(elevationGainM ?? 0, durationMinutes)

  let rec: number
  if (customCarbTarget !== undefined && customCarbTarget > 0) {
    const safeMax = Math.round(base.high * mod.max * elevMod)
    rec = Math.min(customCarbTarget, safeMax)
  } else {
    rec = Math.round(base.rec * mod.rec * elevMod)
  }

  const low = Math.round(base.low * mod.min * elevMod)
  const high = Math.round(base.high * mod.max * elevMod)

  const hours = durationMinutes / 60

  return {
    gramsPerHour: { low, recommended: rec, high, unit: 'g' },
    totalGrams: Math.round(rec * hours),
    explanation: buildCarbExplanation(hrZone, giTraining, rec, low, high, elevationGainM, durationMinutes),
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
  durationMinutes?: number
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
  let base = `基于${zoneMap[hrZone]}和${giMap[giTraining]}：推荐每小时补充 ${rec}g 碳水（范围 ${low}-${high}g/h）`
  if (elevationGainM && elevationGainM > 0 && durationMinutes && durationMinutes > 0) {
    const rate = Math.round(elevationGainM / (durationMinutes / 60))
    if (rate >= 200) base += `。因累计爬升 ${elevationGainM}m（${rate}m/h），碳水需求已上调`
  }
  return base + '。'
}
