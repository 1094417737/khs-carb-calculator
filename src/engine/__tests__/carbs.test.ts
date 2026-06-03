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
    // FAT_EXEMPTION 焊死在 base 值: safeMax = 58*0.65 * 1.15 = 43
    expect(result.gramsPerHour.recommended).toBe(43)
  })

  it('clamps custom target to safe max', () => {
    const result = calculateCarbs('50-60', 'Low', 180, undefined, 999)
    // FAT_EXEMPTION 焊死在 base 值: 28*0.65 * 1.0 = 18
    expect(result.gramsPerHour.recommended).toBeLessThanOrEqual(18)
  })

  it('includes citations', () => {
    const result = calculateCarbs('70-80', 'Moderate', 180)
    expect(result.citations.length).toBeGreaterThan(0)
  })

  it('heat stress >28°C increases carbs by ~10%', () => {
    const cool = calculateCarbs('70-80', 'Low', 180, undefined, undefined, 20)
    const hot  = calculateCarbs('70-80', 'Low', 180, undefined, undefined, 30)
    // Hot should be ~10% higher than cool
    expect(hot.gramsPerHour.recommended).toBeGreaterThan(cool.gramsPerHour.recommended)
  })

  it('no heat stress at 23°C (exactly at threshold)', () => {
    const at20 = calculateCarbs('70-80', 'Low', 180, undefined, undefined, 20)
    const at23 = calculateCarbs('70-80', 'Low', 180, undefined, undefined, 23)
    // At 23°C — threshold itself, no multiplier triggered (tempC > 23 is false)
    expect(at23.gramsPerHour.recommended).toBe(at20.gramsPerHour.recommended)
  })

  it('24°C triggers +2% continuous heat carb increase (above 23°C threshold)', () => {
    const at23 = calculateCarbs('70-80', 'Low', 180, undefined, undefined, 23)
    const at24 = calculateCarbs('70-80', 'Low', 180, undefined, undefined, 24)
    // 24°C: multiplier = 1 + (24-23)*0.02 = 1.02 → +2%
    expect(at24.gramsPerHour.recommended).toBeGreaterThan(at23.gramsPerHour.recommended)
  })

  it('each ~2°C step above 23°C produces visible carb delta (fine-grained tracking)', () => {
    // +2%/°C on base ~33g means each degree adds ~0.7g — Math.round granularity ~2°C
    // Use 80-90 zone for higher base to demonstrate continuous tracking
    const at24 = calculateCarbs('80-90', 'Moderate', 180, undefined, undefined, 24)
    const at26 = calculateCarbs('80-90', 'Moderate', 180, undefined, undefined, 26)
    const at28 = calculateCarbs('80-90', 'Moderate', 180, undefined, undefined, 28)
    // 24→26 (+4%) and 26→28 (+4%) should both show visible increase
    expect(at26.gramsPerHour.recommended).toBeGreaterThan(at24.gramsPerHour.recommended)
    expect(at28.gramsPerHour.recommended).toBeGreaterThan(at26.gramsPerHour.recommended)
  })
})
