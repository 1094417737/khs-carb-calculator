import { describe, it, expect } from 'vitest'
import { calculateHomemadeMix } from '../homemade'

describe('calculateHomemadeMix', () => {
  it('splits 2:1 ratio correctly', () => {
    const result = calculateHomemadeMix('2:1', 60, 180, 'Moderate', 750, 2250)
    // 60g/h split 2:1 = 40g glucose, 20g fructose
    expect(result.glucosePerHour).toBe(40)
    expect(result.fructosePerHour).toBe(20)
    expect(result.totalSugarPerHour).toBe(60)
  })

  it('splits 1:1 ratio equally', () => {
    const result = calculateHomemadeMix('1:1', 60, 180, 'Moderate', 750, 2250)
    expect(result.glucosePerHour).toBe(30)
    expect(result.fructosePerHour).toBe(30)
  })

  it('splits 1:0.8 ratio correctly', () => {
    const result = calculateHomemadeMix('1:0.8', 54, 180, 'Moderate', 750, 2250)
    // 54 / 1.8 = 30g per part. glucose = 30, fructose = 24
    expect(result.glucosePerHour).toBe(30)
    expect(result.fructosePerHour).toBe(24)
    expect(result.totalSugarPerHour).toBe(54)
  })

  it('water equals fluid input (not derived from sugar concentration)', () => {
    const result = calculateHomemadeMix('2:1', 60, 180, 'Moderate', 500, 1500)
    // 水量直接取自全局 fluid 计算，不再从糖÷浓度推导
    expect(result.waterMlPerHour).toBe(500)
    expect(result.waterMlTotal).toBe(1500)
  })

  it('scales totals by duration', () => {
    const short = calculateHomemadeMix('2:1', 60, 120, 'Moderate', 750, 1500)
    const long = calculateHomemadeMix('2:1', 60, 240, 'Moderate', 750, 3000)
    expect(long.glucoseTotal).toBeGreaterThan(short.glucoseTotal)
    expect(long.waterMlTotal).toBeGreaterThan(short.waterMlTotal)
    // 2h vs 4h: glucose totals should be ~2x
    expect(long.glucoseTotal).toBe(short.glucoseTotal * 2)
  })

  it('computes actual concentration from sugar ÷ fluid input', () => {
    // 60g sugar / 750ml water = 8% concentration
    const result = calculateHomemadeMix('2:1', 60, 180, 'Moderate', 750, 2250)
    expect(result.concentration).toBe(8)
    expect(result.explanation).toContain('8')
  })
})
