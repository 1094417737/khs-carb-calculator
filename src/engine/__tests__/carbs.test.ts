import { describe, it, expect } from 'vitest'
import { calculateCarbs } from '../carbs'

describe('calculateCarbs', () => {
  it('returns higher carbs for higher HR zones', () => {
    const low = calculateCarbs('50-60', 'Moderate', 180)
    const mid = calculateCarbs('70-80', 'Moderate', 180)
    const high = calculateCarbs('80-90', 'Moderate', 180)

    expect(mid.gramsPerHour.recommended).toBeGreaterThan(low.gramsPerHour.recommended)
    expect(high.gramsPerHour.recommended).toBeGreaterThan(mid.gramsPerHour.recommended)
  })

  it('reduces carbs for low GI training', () => {
    const lowGI = calculateCarbs('70-80', 'Low', 180)
    const wellGI = calculateCarbs('70-80', 'Well', 180)

    expect(wellGI.gramsPerHour.recommended).toBeGreaterThan(lowGI.gramsPerHour.recommended)
  })

  it('scales total grams by duration', () => {
    const short = calculateCarbs('70-80', 'Moderate', 120)
    const long = calculateCarbs('70-80', 'Moderate', 240)

    expect(long.totalGrams).toBeGreaterThan(short.totalGrams)
  })

  it('uses custom carb target when provided', () => {
    const result = calculateCarbs('70-80', 'Moderate', 180, undefined, 80)
    expect(result.gramsPerHour.recommended).toBe(80)
  })

  it('clamps custom target to safe max', () => {
    const result = calculateCarbs('50-60', 'Low', 180, undefined, 999)
    // Max for 50-60 Low = 40 * 1.0 * 1.0 (no elevation) = 40
    expect(result.gramsPerHour.recommended).toBeLessThanOrEqual(40)
  })

  it('includes citations', () => {
    const result = calculateCarbs('70-80', 'Moderate', 180)
    expect(result.citations.length).toBeGreaterThan(0)
  })
})
