import type { HomemadeRatio, GITrainingLevel } from '../types'
import type { HomemadeMix } from '../types/results'

export function calculateHomemadeMix(
  ratio: HomemadeRatio,
  carbTargetPerHour: number,
  durationMinutes: number,
  giTraining: GITrainingLevel,
  fluidMlPerHour: number,
  fluidTotalMl: number
): HomemadeMix {
  const hours = durationMinutes / 60
  const ratioMap: Record<HomemadeRatio, { g: number; f: number }> = {
    '2:1':    { g: 2 / 3,     f: 1 / 3 },
    '1:1':    { g: 1 / 2,     f: 1 / 2 },
    '1:0.8':  { g: 1 / 1.8,   f: 0.8 / 1.8 },
  }

  const { g: gFrac, f: fFrac } = ratioMap[ratio]

  const glucosePerHour = Math.round(carbTargetPerHour * gFrac)
  const fructosePerHour = Math.round(carbTargetPerHour * fFrac)
  const totalSugarPerHour = glucosePerHour + fructosePerHour

  // ═══ 硬改：水量强制取自全局 fluid 计算（温度+体重+出汗率），不再从糖÷浓度推导 ═══
  const waterMlPerHour = fluidMlPerHour
  // 实际浓度 = 糖 ÷ 全局水量（仅作信息展示，GI 适配逻辑后续可在此叠加）
  const actualConc = waterMlPerHour > 0 ? totalSugarPerHour / waterMlPerHour : 0
  const concPercent = Math.round(actualConc * 100)
  // ═══════════════════════════════════════════════════════════════

  return {
    glucosePerHour,
    fructosePerHour,
    totalSugarPerHour,
    waterMlPerHour,
    glucoseTotal: Math.round(glucosePerHour * hours),
    fructoseTotal: Math.round(fructosePerHour * hours),
    totalSugarTotal: Math.round(totalSugarPerHour * hours),
    waterMlTotal: fluidTotalMl,
    concentration: concPercent,
    explanation: buildHomemadeExplanation(ratio, concPercent, glucosePerHour, fructosePerHour, waterMlPerHour),
  }
}

function buildHomemadeExplanation(
  ratio: HomemadeRatio,
  concentrationPercent: number,
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
  return `${ratioLabel[ratio]}。每小时: ${sugarDesc}，溶于 ${waterMl}ml 水（实际浓度约 ${concentrationPercent}%，水量由全局补水需求统一计算）。`
}
