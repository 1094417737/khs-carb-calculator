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
})
