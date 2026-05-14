import type { PlanInputs, StrategyOptions } from '../types'
import type { CalculationResult, CaffeineDose, ScheduleItem } from '../types/results'
import { SALT_PER_SODIUM } from '../data/constants'

/** 生成可分享的方案纯文本 */
export function generateShareText(
  plan: PlanInputs,
  strategy: StrategyOptions,
  result: CalculationResult
): string {
  const lines: string[] = []
  const h = Math.floor(plan.durationMinutes / 60)
  const m = plan.durationMinutes % 60

  lines.push('══════════════════════')
  lines.push('  KHS耐力补碳计算器 — 补给方案')
  lines.push('══════════════════════')
  lines.push('')
  lines.push('【基本信息】')
  lines.push(`  时长: ${h}h${m > 0 ? `${m}m` : ''}${plan.distanceKm ? ` · ${plan.distanceKm}km` : ''}`)
  lines.push(`  心率区间: ${plan.hrZone}%`)
  lines.push(`  体重: ${plan.weightKg}kg · 温度: ${plan.tempC}°C`)
  if (plan.elevationGainM && plan.elevationGainM > 0) {
    const rate = Math.round(plan.elevationGainM / (plan.durationMinutes / 60))
    lines.push(`  累计爬升: ${plan.elevationGainM}m (${rate}m/h)`)
  }
  lines.push(`  GI训练: ${plan.giTraining === 'Low' ? '初学者' : plan.giTraining === 'Moderate' ? '有经验' : '适应性强'}`)
  if (plan.sweatRateProfile) {
    const swMap = { Low: '较少', Normal: '正常', High: '较多' }
    lines.push(`  出汗率: ${swMap[plan.sweatRateProfile]}`)
  }
  lines.push('')
  lines.push('【补给目标 / 小时】')
  lines.push(`  碳水: ${result.carbs.gramsPerHour.recommended}g/h (范围 ${result.carbs.gramsPerHour.low}-${result.carbs.gramsPerHour.high}g/h)`)
  lines.push(`  补水: ${result.fluid.mlPerHour.recommended}ml/h`)
  lines.push(`  钠:   ${result.sodium.mgPerHour.recommended}mg/h (出汗率 ~${result.sodium.sweatRateEstimate}L/h)`)
  lines.push('')
  lines.push(`【全程总计 (${h}h${m > 0 ? `${m}m` : ''})】`)
  lines.push(`  碳水: ${result.carbs.totalGrams}g (≈${result.carbs.totalGrams * 4}kcal)`)
  lines.push(`  补水: ${result.fluid.totalMl}ml (${(result.fluid.totalMl / 1000).toFixed(1)}L)`)
  lines.push(`  钠:   ${result.sodium.totalMg}mg`)

  if (strategy.useHomemade && result.homemadeMix) {
    const mix = result.homemadeMix
    const saltTotal = Math.round(result.sodium.totalMg * SALT_PER_SODIUM / 1000 * 10) / 10
    const ratioLabel: Record<string, string> = { '2:1': '2:1', '1:1': '1:1 (白砂糖)', '1:0.8': '1:0.8' }
    lines.push('')
    lines.push(`【自制配方 (${ratioLabel[strategy.homemadeRatio]})】`)
    if (strategy.homemadeRatio === '1:1') {
      lines.push(`  白砂糖: ${mix.totalSugarTotal}g · 海盐: ${saltTotal}g`)
      lines.push(`  水: ${mix.waterMlTotal}ml (${mix.concentration}%浓度)`)
    } else {
      lines.push(`  葡萄糖: ${mix.glucoseTotal}g · 果糖: ${mix.fructoseTotal}g`)
      lines.push(`  海盐: ${saltTotal}g · 水: ${mix.waterMlTotal}ml`)
    }
  }

  if (strategy.useCaffeine && result.caffeine) {
    lines.push('')
    lines.push('【咖啡因方案】')
    result.caffeine.doses.forEach((d: CaffeineDose) => {
      lines.push(`  ${d.label}: ${d.doseMg}mg${d.notes ? ` (${d.notes})` : ''}`)
    })
    if (result.caffeine.warning) lines.push(`  ⚠ ${result.caffeine.warning}`)
  }

  if (result.schedule.items.length > 0) {
    lines.push('')
    lines.push(`【补给时间表 (每${result.schedule.intervalMinutes}分钟)】`)
    result.schedule.items.forEach((item: ScheduleItem) => {
      lines.push(`  ${item.timeLabel}  ${item.action}`)
    })
  }

  if (result.warnings.length > 0) {
    lines.push('')
    lines.push('【提醒】')
    result.warnings.forEach((w: string) => lines.push(`  ⚠ ${w}`))
  }

  lines.push('')
  lines.push('计算依据: ACSM / ISSN / IOC 运动营养共识')
  lines.push('仅供参考，不构成医疗建议')

  return lines.join('\n')
}

/** 复制文本到剪贴板 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  }
}
