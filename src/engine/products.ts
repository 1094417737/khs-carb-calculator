import type { StrategyOptions } from '../types'
import type { ProductComparison, CarbResult, SodiumResult } from '../types/results'
import { gelProducts } from '../data/gels'
import { drinkProducts } from '../data/drinks'

export function buildProductComparison(
  strategy: StrategyOptions,
  carbs: CarbResult,
  sodium: SodiumResult,
  durationMinutes: number
): ProductComparison | undefined {
  if (strategy.useHomemade) return undefined

  const hours = durationMinutes / 60
  const gel = gelProducts.find((g) => g.id === strategy.selectedCommercialGel)
  const drink = drinkProducts.find((d) => d.id === strategy.selectedCommercialDrink)

  if (!gel && !drink) return undefined

  const carbTarget = Math.round(carbs.gramsPerHour.recommended * hours)
  const sodiumTarget = Math.round(sodium.mgPerHour.recommended * hours)

  let totalCarbsFromProducts = 0
  let totalSodiumFromProducts = 0
  let totalGelsNeeded = 0
  let totalDrinkServingsNeeded = 0

  // If both selected, split carb target 50/50; otherwise one product handles all
  const bothSelected = gel && drink
  const gelCarbShare = bothSelected ? carbTarget * 0.5 : carbTarget
  const drinkCarbShare = bothSelected ? carbTarget * 0.5 : carbTarget

  if (gel) {
    totalGelsNeeded = Math.max(1, Math.round(gelCarbShare / gel.carbsPerServing))
    totalCarbsFromProducts += totalGelsNeeded * gel.carbsPerServing
    totalSodiumFromProducts += totalGelsNeeded * gel.sodiumPerServing
  }

  if (drink) {
    totalDrinkServingsNeeded = Math.max(1, Math.round(drinkCarbShare / drink.carbsPerServing))
    totalCarbsFromProducts += totalDrinkServingsNeeded * drink.carbsPerServing
    totalSodiumFromProducts += totalDrinkServingsNeeded * drink.sodiumPerServing
  }

  let totalCost: number | undefined
  if (gel?.priceCNY || drink?.priceCNY) {
    totalCost = 0
    if (gel?.priceCNY) totalCost += totalGelsNeeded * gel.priceCNY
    if (drink?.priceCNY) totalCost += totalDrinkServingsNeeded * drink.priceCNY
  }

  return {
    selectedGelLabel: gel ? `${gel.brand} ${gel.name}` : undefined,
    selectedDrinkLabel: drink ? `${drink.brand} ${drink.name}` : undefined,
    totalGelsNeeded,
    totalDrinkServingsNeeded,
    totalCarbsFromProducts,
    totalSodiumFromProducts,
    carbShortfall: carbTarget - totalCarbsFromProducts,
    sodiumShortfall: sodiumTarget - totalSodiumFromProducts,
    totalCost,
    gelCarbsPerServing: gel?.carbsPerServing,
    drinkCarbsPerServing: drink?.carbsPerServing,
  }
}
