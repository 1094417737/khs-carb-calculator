import { describe, it, expect } from 'vitest'
import { generateSchedule } from '../schedule'
import type { CarbResult, FluidResult, SodiumResult } from '../../types/results'

function makeCarbs(rec: number): CarbResult {
  return {
    gramsPerHour: { low: rec - 10, recommended: rec, high: rec + 10, unit: 'g' },
    totalGrams: rec * 3,
    explanation: '',
    citations: [],
  }
}

function makeFluid(rec: number): FluidResult {
  return {
    mlPerHour: { low: rec - 100, recommended: rec, high: rec + 100, unit: 'ml' },
    totalMl: rec * 3,
    explanation: '',
    citations: [],
  }
}

function makeSodium(rec: number): SodiumResult {
  return {
    mgPerHour: { low: rec - 100, recommended: rec, high: rec + 100, unit: 'mg' },
    totalMg: rec * 3,
    sweatRateEstimate: 0.8,
    explanation: '',
    citations: [],
  }
}

describe('generateSchedule', () => {
  it('generates correct number of items for given duration', () => {
    const result = generateSchedule(180, makeCarbs(60), makeFluid(500), makeSodium(400))
    // 0, 30, 60, 90, 120, 150, 180 = 7 items
    expect(result.items.length).toBe(7)
    expect(result.intervalMinutes).toBe(30)
  })

  it('first item is at time 0', () => {
    const result = generateSchedule(60, makeCarbs(60), makeFluid(500), makeSodium(400))
    expect(result.items[0].timeMinutes).toBe(0)
    expect(result.items[0].timeLabel).toBe('0:00')
  })

  it('includes caffeine info when caffeine plan provided', () => {
    const caffeinePlan = {
      totalDoseMg: 200,
      doses: [{ timeMinutes: 0, label: '出发', doseMg: 200, notes: '' }],
      explanation: '',
      citations: [],
    }
    const result = generateSchedule(60, makeCarbs(60), makeFluid(500), makeSodium(400), caffeinePlan)
    expect(result.items[0].caffeine).toBe(200)
    expect(result.items[0].action).toContain('200mg')
  })

  it('shows product names when product comparison provided', () => {
    const pc = {
      selectedGelLabel: 'GU Energy Gel',
      totalGelsNeeded: 6,
      totalDrinkServingsNeeded: 0,
      totalCarbsFromProducts: 120,
      totalSodiumFromProducts: 300,
      carbShortfall: 0,
      sodiumShortfall: 0,
      gelCarbsPerServing: 22,
    }
    const result = generateSchedule(60, makeCarbs(60), makeFluid(500), makeSodium(400), undefined, pc)
    expect(result.items.some((i) => i.action.includes('GU Energy Gel'))).toBe(true)
  })

  it('shows homemade mix details when provided', () => {
    const mix = {
      glucosePerHour: 40,
      fructosePerHour: 20,
      totalSugarPerHour: 60,
      waterMlPerHour: 750,
      glucoseTotal: 120,
      fructoseTotal: 60,
      totalSugarTotal: 180,
      waterMlTotal: 2250,
      concentration: 8,
      explanation: '',
    }
    const result = generateSchedule(60, makeCarbs(60), makeFluid(500), makeSodium(400), undefined, undefined, mix)
    expect(result.items.some((i) => i.action.includes('葡萄糖'))).toBe(true)
    expect(result.items.some((i) => i.action.includes('果糖'))).toBe(true)
  })

  it('handles zero duration gracefully', () => {
    const result = generateSchedule(0, makeCarbs(0), makeFluid(0), makeSodium(0))
    // Should have at least the 0:00 item
    expect(result.items.length).toBe(1)
  })
})
