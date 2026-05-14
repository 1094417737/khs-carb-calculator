import type { CaffeinePlan, CaffeineDose } from '../types/results'

export function calculateCaffeinePlan(
  weightKg: number,
  durationMinutes: number,
  useCaffeine: boolean
): CaffeinePlan | undefined {
  if (!useCaffeine) return undefined

  const dosePerKg = 3
  const preEventDose = Math.min(Math.round(weightKg * dosePerKg), 300)
  const boosterDose = Math.round(weightKg * 1.5)

  const doses: CaffeineDose[] = [
    {
      timeMinutes: -30,
      label: '赛前30分钟',
      doseMg: preEventDose,
      notes: '与少量食物同服，减少胃部不适',
    },
  ]

  for (let t = 120; t <= durationMinutes; t += 120) {
    const h = t / 60
    doses.push({
      timeMinutes: t,
      label: `第${h}小时`,
      doseMg: Math.round(boosterDose),
      notes: t > 300 ? '注意：可能影响赛后睡眠' : '',
    })
  }

  const totalDoseMg = doses.reduce((sum, d) => sum + d.doseMg, 0)
  const warning =
    totalDoseMg > 400
      ? `总剂量 ${totalDoseMg}mg 超过每日推荐安全上限 400mg（EFSA），建议减少剂量。`
      : undefined

  return {
    totalDoseMg,
    doses,
    warning,
    explanation: `基于 ${weightKg}kg 体重，按 3mg/kg 赛前 + 1.5mg/kg 每2小时补充策略。`,
    citations: [
      'Guest NS et al. (2021) ISSN Position Stand. J Int Soc Sports Nutr. 18(1):1.',
    ],
  }
}
