import type { HomemadeRatio, GITrainingLevel } from '../types'
import type { HomemadeMix } from '../types/results'

/** 不同GI水平推荐浓度 */
const CONCENTRATION: Record<GITrainingLevel, number> = {
  Low: 0.06,
  Moderate: 0.08,
  Well: 0.10,
}

export function calculateHomemadeMix(
  ratio: HomemadeRatio,
  carbTargetPerHour: number,
  durationMinutes: number,
  giTraining: GITrainingLevel
): HomemadeMix {
  const hours = durationMinutes / 60
  const ratioMap: Record<HomemadeRatio, { g: number; f: number }> = {
    '2:1':    { g: 2 / 3,     f: 1 / 3 },
    '1:1':    { g: 1 / 2,     f: 1 / 2 },
    '1:0.8':  { g: 1 / 1.8,   f: 0.8 / 1.8 },
  }

  const { g: gFrac, f: fFrac } = ratioMap[ratio]
  const conc = CONCENTRATION[giTraining]

  const glucosePerHour = Math.round(carbTargetPerHour * gFrac)
  const fructosePerHour = Math.round(carbTargetPerHour * fFrac)
  const totalSugarPerHour = glucosePerHour + fructosePerHour
  const waterMlPerHour = Math.round(totalSugarPerHour / conc)

  return {
    glucosePerHour,
    fructosePerHour,
    totalSugarPerHour,
    waterMlPerHour,
    glucoseTotal: Math.round(glucosePerHour * hours),
    fructoseTotal: Math.round(fructosePerHour * hours),
    totalSugarTotal: Math.round(totalSugarPerHour * hours),
    waterMlTotal: Math.round(waterMlPerHour * hours),
    concentration: conc * 100,
    explanation: buildHomemadeExplanation(ratio, conc, glucosePerHour, fructosePerHour, waterMlPerHour),
  }
}

function buildHomemadeExplanation(
  ratio: HomemadeRatio,
  concentration: number,
  glucosePerHour: number,
  fructosePerHour: number,
  waterMl: number
): string {
  const ratioLabel: Record<HomemadeRatio, string> = {
    '2:1': '标准比例',
    '1:1': '双通道吸收（可用白砂糖直接替代）',
    '1:0.8': '优化比例',
  }
  const sugarDesc = ratio === '1:1'
    ? `${glucosePerHour + fructosePerHour}g 白砂糖`
    : `${glucosePerHour}g 葡萄糖 + ${fructosePerHour}g 果糖`
  return `${ratioLabel[ratio]}。每小时: ${sugarDesc}，溶于 ${waterMl}ml 水（${Math.round(concentration * 100)}%浓度）。`
}
