import { describe, it, expect } from 'vitest'
import { buildProductComparison } from '../products'
import type { StrategyOptions } from '../../types'
import type { CarbResult, SodiumResult } from '../../types/results'

function baseStrategy(overrides?: Partial<StrategyOptions>): StrategyOptions {
  return {
    useCaffeine: false,
    useHomemade: false,
    homemadeRatio: '2:1',
    selectedCommercialGel: 'gu-original',
    selectedCommercialDrink: undefined,
    ...overrides,
  }
}

function baseCarbs(rec = 60): CarbResult {
  return {
    gramsPerHour: { low: 50, recommended: rec, high: 70, unit: 'g' },
    totalGrams: rec * 3,
    explanation: '',
    citations: [],
  }
}

function baseSodium(rec = 400): SodiumResult {
  return {
    mgPerHour: { low: 300, recommended: rec, high: 500, unit: 'mg' },
    totalMg: rec * 3,
    sweatRateEstimate: 0.8,
    explanation: '',
    citations: [],
  }
}

describe('buildProductComparison', () => {
  it('returns undefined for homemade mode', () => {
    const result = buildProductComparison(
      { ...baseStrategy(), useHomemade: true },
      baseCarbs(),
      baseSodium(),
      180
    )
    expect(result).toBeUndefined()
  })

  it('returns undefined when no products selected', () => {
    const result = buildProductComparison(
      { ...baseStrategy(), selectedCommercialGel: undefined },
      baseCarbs(),
      baseSodium(),
      180
    )
    expect(result).toBeUndefined()
  })

  it('computes gel quantity for a single gel selection', () => {
    const result = buildProductComparison(baseStrategy(), baseCarbs(60), baseSodium(), 180)
    expect(result).toBeDefined()
    // 60g/h * 3h = 180g total / 22g per GU = ~8 gels
    expect(result!.totalGelsNeeded).toBeGreaterThan(0)
    expect(result!.totalDrinkServingsNeeded).toBe(0)
    expect(result!.selectedGelLabel).toContain('GU')
  })

  it('splits carbs 50/50 when both gel and drink selected', () => {
    const result = buildProductComparison(
      { ...baseStrategy(), selectedCommercialDrink: 'sis-go-electrolyte' },
      baseCarbs(60),
      baseSodium(),
      180
    )
    expect(result).toBeDefined()
    // Both gel and drink handle ~90g each (half of 180g target)
    expect(result!.totalGelsNeeded).toBeGreaterThan(0)
    expect(result!.totalDrinkServingsNeeded).toBeGreaterThan(0)
  })

  it('computes cost when prices available', () => {
    const result = buildProductComparison(baseStrategy(), baseCarbs(60), baseSodium(), 180)
    expect(result!.totalCost).toBeDefined()
    expect(result!.totalCost).toBeGreaterThan(0)
  })

  it('computes carb and sodium shortfall', () => {
    const result = buildProductComparison(baseStrategy(), baseCarbs(60), baseSodium(), 180)
    expect(typeof result!.carbShortfall).toBe('number')
    expect(typeof result!.sodiumShortfall).toBe('number')
  })
})
