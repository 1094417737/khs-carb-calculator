import { describe, it, expect } from 'vitest'
import { calculateHomemadeMix } from '../homemade'

describe('calculateHomemadeMix', () => {
  it('splits 2:1 ratio correctly', () => {
    const result = calculateHomemadeMix('2:1', 60, 180, 'Moderate')
    // 60g/h split 2:1 = 40g glucose, 20g fructose
    expect(result.glucosePerHour).toBe(40)
    expect(result.fructosePerHour).toBe(20)
    expect(result.totalSugarPerHour).toBe(60)
  })

  it('splits 1:1 ratio equally', () => {
    const result = calculateHomemadeMix('1:1', 60, 180, 'Moderate')
    expect(result.glucosePerHour).toBe(30)
    expect(result.fructosePerHour).toBe(30)
  })

  it('splits 1:0.8 ratio correctly', () => {
    const result = calculateHomemadeMix('1:0.8', 54, 180, 'Moderate')
    // 54 / 1.8 = 30g per part. glucose = 30, fructose = 24
    expect(result.glucosePerHour).toBe(30)
    expect(result.fructosePerHour).toBe(24)
    expect(result.totalSugarPerHour).toBe(54)
  })

  it('computes water based on concentration', () => {
    const low = calculateHomemadeMix('2:1', 60, 180, 'Low')
    const mod = calculateHomemadeMix('2:1', 60, 180, 'Moderate')
    const well = calculateHomemadeMix('2:1', 60, 180, 'Well')
    // Lower concentration → more water
    expect(low.waterMlPerHour).toBeGreaterThan(mod.waterMlPerHour)
    expect(mod.waterMlPerHour).toBeGreaterThan(well.waterMlPerHour)
  })

  it('scales totals by duration', () => {
    const short = calculateHomemadeMix('2:1', 60, 120, 'Moderate')
    const long = calculateHomemadeMix('2:1', 60, 240, 'Moderate')
    expect(long.glucoseTotal).toBeGreaterThan(short.glucoseTotal)
    expect(long.waterMlTotal).toBeGreaterThan(short.waterMlTotal)
    // 2h vs 4h: totals should be ~2x
    expect(long.glucoseTotal).toBe(short.glucoseTotal * 2)
  })

  it('includes explanation with concentration info', () => {
    const result = calculateHomemadeMix('2:1', 60, 180, 'Moderate')
    expect(result.explanation).toContain('8')
    expect(result.concentration).toBe(8)
  })
})
