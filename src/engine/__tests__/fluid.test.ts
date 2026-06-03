import { describe, it, expect } from 'vitest'
import { calculateFluid } from '../fluid'

describe('calculateFluid', () => {
  it('increases fluid with temperature', () => {
    const cool = calculateFluid('70-80', 70, 15, 'Moderate', 180)
    const hot = calculateFluid('70-80', 70, 35, 'Moderate', 180)

    expect(hot.mlPerHour.recommended).toBeGreaterThan(cool.mlPerHour.recommended)
  })

  it('increases fluid for heavier athletes', () => {
    const light = calculateFluid('70-80', 50, 20, 'Moderate', 180)
    const heavy = calculateFluid('70-80', 110, 20, 'Moderate', 180)

    expect(heavy.mlPerHour.recommended).toBeGreaterThan(light.mlPerHour.recommended)
  })

  it('respects GI training fluid max', () => {
    const lowGI = calculateFluid('80-90', 100, 40, 'Low', 180)
    expect(lowGI.mlPerHour.recommended).toBeLessThanOrEqual(800)
  })

  it('scales total ml by duration', () => {
    const short = calculateFluid('70-80', 70, 20, 'Moderate', 120)
    const long = calculateFluid('70-80', 70, 20, 'Moderate', 240)

    expect(long.totalMl).toBeGreaterThan(short.totalMl)
  })

  it('adjusts fluid based on sweat rate profile', () => {
    const low = calculateFluid('70-80', 70, 25, 'Moderate', 180, undefined, undefined, 'Low')
    const normal = calculateFluid('70-80', 70, 25, 'Moderate', 180, undefined, undefined, 'Normal')
    const high = calculateFluid('70-80', 70, 25, 'Moderate', 180, undefined, undefined, 'High')

    expect(normal.mlPerHour.recommended).toBeGreaterThan(low.mlPerHour.recommended)
    expect(high.mlPerHour.recommended).toBeGreaterThan(normal.mlPerHour.recommended)
  })

  it('without sweat profile, fluid is the same as Normal (×1.0)', () => {
    const noProfile = calculateFluid('70-80', 70, 25, 'Moderate', 180)
    const normalProfile = calculateFluid('70-80', 70, 25, 'Moderate', 180, undefined, undefined, 'Normal')

    expect(noProfile.mlPerHour.recommended).toBe(normalProfile.mlPerHour.recommended)
  })

  it('cold temperature reduces fluid (14°C < 20°C)', () => {
    const cold = calculateFluid('70-80', 70, 14, 'Moderate', 180)
    const mild = calculateFluid('70-80', 70, 20, 'Moderate', 180)

    expect(mild.mlPerHour.recommended).toBeGreaterThan(cold.mlPerHour.recommended)
  })

  it('every 1°C change produces a fluid delta (no dead zones)', () => {
    // Old step-function had dead zones between thresholds.
    // New continuous formula: 14→15°C must produce a measurable change.
    const at14 = calculateFluid('70-80', 70, 14, 'Moderate', 180)
    const at15 = calculateFluid('70-80', 70, 15, 'Moderate', 180)
    const at20 = calculateFluid('70-80', 70, 20, 'Moderate', 180)
    const at21 = calculateFluid('70-80', 70, 21, 'Moderate', 180)

    expect(at15.mlPerHour.recommended).toBeGreaterThan(at14.mlPerHour.recommended)
    expect(at21.mlPerHour.recommended).toBeGreaterThan(at20.mlPerHour.recommended)
  })
})
