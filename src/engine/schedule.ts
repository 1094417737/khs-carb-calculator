import type { FeedingSchedule, ScheduleItem, CarbResult, FluidResult, SodiumResult, CaffeinePlan, ProductComparison, HomemadeMix } from '../types/results'

export function generateSchedule(
  durationMinutes: number,
  carbs: CarbResult,
  fluid: FluidResult,
  sodium: SodiumResult,
  caffeinePlan?: CaffeinePlan,
  productComparison?: ProductComparison,
  homemadeMix?: HomemadeMix
): FeedingSchedule {
  const interval = 30
  const items: ScheduleItem[] = []

  // Product info for action text (per-serving values from product database)
  const gelLabel = productComparison?.selectedGelLabel
  const drinkLabel = productComparison?.selectedDrinkLabel
  const gelCarbs = productComparison?.gelCarbsPerServing ?? 0
  const drinkCarbs = productComparison?.drinkCarbsPerServing ?? 0

  const isHomemade = !!homemadeMix

  for (let t = 0; t <= durationMinutes; t += interval) {
    const h = Math.floor(t / 60)
    const m = t % 60
    const timeLabel = `${h}:${m.toString().padStart(2, '0')}`

    const carbPerInterval = Math.round(carbs.gramsPerHour.recommended / 2)
    const fluidPerInterval = Math.round(fluid.mlPerHour.recommended / 2)
    const sodiumPerInterval = Math.round(sodium.mgPerHour.recommended / 2)

    let action = ''

    if (gelLabel && drinkLabel) {
      // Both selected: split carbs between gel and drink
      const halfCarb = Math.round(carbPerInterval / 2)
      const gelCount = gelCarbs > 0 ? Math.max(0, Math.round(halfCarb / gelCarbs)) : 0
      const drinkCount = drinkCarbs > 0 ? Math.max(0, Math.round(halfCarb / drinkCarbs)) : 0
      const parts2: string[] = []
      if (gelCount > 0) parts2.push(`${gelCount}支${gelLabel}`)
      if (drinkCount > 0) parts2.push(`${drinkCount}份${drinkLabel}`)
      if (fluidPerInterval > 0) parts2.push(`补水${fluidPerInterval}ml`)
      action = parts2.join(' + ')
    } else if (gelLabel) {
      const count = gelCarbs > 0 ? Math.round(carbPerInterval / gelCarbs) : 0
      action = count > 0 ? `${count}支${gelLabel}` : ''
      if (fluidPerInterval > 0) action += (action ? ' + ' : '') + `补水${fluidPerInterval}ml`
    } else if (drinkLabel) {
      const count = drinkCarbs > 0 ? Math.round(carbPerInterval / drinkCarbs) : 0
      action = count > 0 ? `${count}份${drinkLabel}` : ''
      if (fluidPerInterval > 0) action += (action ? ' + ' : '') + `补水${fluidPerInterval}ml`
    } else if (isHomemade) {
      // 自制模式：显示具体葡萄糖/果糖/水量
      const gPerInterval = Math.round(homemadeMix!.glucosePerHour / 2)
      const fPerInterval = Math.round(homemadeMix!.fructosePerHour / 2)
      const wPerInterval = Math.round(homemadeMix!.waterMlPerHour / 2)
      action = `${gPerInterval}g葡萄糖 + ${fPerInterval}g果糖 + ${wPerInterval}ml水`
      if (sodiumPerInterval > 0) action += ` + 钠${sodiumPerInterval}mg`
    } else {
      // 无产品、无自制：通用碳水量
      const parts: string[] = []
      if (fluidPerInterval > 0) parts.push(`补水 ${fluidPerInterval}ml`)
      if (carbPerInterval > 0) {
        parts.push(`碳水 ${carbPerInterval}g`)
        if (sodiumPerInterval > 0) parts.push(`钠 ${sodiumPerInterval}mg`)
      }
      action = parts.join(' + ')
    }

    const caff = caffeinePlan?.doses.find(
      (d) => Math.abs(d.timeMinutes - t) <= 15
    )

    if (caff && action) {
      action += ` | ☕ ${caff.doseMg}mg`
    }

    items.push({
      timeMinutes: t,
      timeLabel,
      action: action || '休息',
      carbs: carbPerInterval,
      fluid: fluidPerInterval,
      sodium: sodiumPerInterval,
      caffeine: caff?.doseMg,
    })
  }

  return { intervalMinutes: interval, items }
}
