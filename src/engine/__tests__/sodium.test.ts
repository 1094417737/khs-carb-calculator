import { describe, it, expect } from 'vitest'
import { calculateSodium } from '../sodium'

describe('calculateSodium', () => {
  it('returns a reasonable range for moderate conditions', () => {
    const result = calculateSodium('70-80', 70, 20, 180)
    expect(result.mgPerHour.recommended).toBeGreaterThan(150)
    expect(result.mgPerHour.recommended).toBeLessThan(1500)
    expect(result.totalMg).toBeGreaterThan(0)
  })

  it('increases sodium in hot conditions', () => {
    const cool = calculateSodium('70-80', 70, 15, 180)
    const hot = calculateSodium('70-80', 70, 35, 180)
    expect(hot.mgPerHour.recommended).toBeGreaterThan(cool.mgPerHour.recommended)
    expect(hot.sweatRateEstimate).toBeGreaterThan(cool.sweatRateEstimate)
  })

  it('estimates higher sweat rate for heavier athletes', () => {
    const light = calculateSodium('70-80', 50, 25, 180)
    const heavy = calculateSodium('70-80', 110, 25, 180)
    expect(heavy.sweatRateEstimate).toBeGreaterThan(light.sweatRateEstimate)
  })

  it('clamps to safe range (200-1500 mg/h)', () => {
    const result = calculateSodium('50-60', 30, 0, 180)
    expect(result.mgPerHour.recommended).toBeGreaterThanOrEqual(200)
    expect(result.mgPerHour.recommended).toBeLessThanOrEqual(1500)
  })

  it('scales total by duration', () => {
    const short = calculateSodium('70-80', 70, 20, 120)
    const long = calculateSodium('70-80', 70, 20, 240)
    expect(long.totalMg).toBeGreaterThan(short.totalMg)
  })

  it('applies sweat profile multiplier', () => {
    const base = calculateSodium('70-80', 70, 25, 180)
    const low = calculateSodium('70-80', 70, 25, 180, 'Low')
    const high = calculateSodium('70-80', 70, 25, 180, 'High')
    // Low should have lower sodium than base
    expect(low.mgPerHour.recommended).toBeLessThan(base.mgPerHour.recommended)
    // High should have higher sodium
    expect(high.mgPerHour.recommended).toBeGreaterThan(base.mgPerHour.recommended)
    // Sweat rate should differ
    expect(low.sweatRateEstimate).toBeLessThan(base.sweatRateEstimate)
    expect(high.sweatRateEstimate).toBeGreaterThan(base.sweatRateEstimate)
  })

  it('includes citations and explanation', () => {
    const result = calculateSodium('70-80', 70, 20, 180)
    expect(result.citations.length).toBeGreaterThan(0)
    expect(result.explanation.length).toBeGreaterThan(0)
  })

  it('mentions sweat profile in explanation when provided', () => {
    const result = calculateSodium('70-80', 70, 20, 180, 'High')
    expect(result.explanation).toContain('较多出汗')
  })
})
