import { describe, it, expect } from 'vitest'
import { calculateCaffeinePlan } from '../caffeine'

describe('calculateCaffeinePlan', () => {
  it('returns undefined when caffeine disabled', () => {
    const result = calculateCaffeinePlan(70, 180, false)
    expect(result).toBeUndefined()
  })

  it('includes pre-event dose when enabled', () => {
    const result = calculateCaffeinePlan(70, 180, true)
    expect(result).toBeDefined()
    expect(result!.doses.length).toBeGreaterThan(0)
    expect(result!.doses[0].label).toBe('赛前30分钟')
  })

  it('adds booster doses for longer events', () => {
    const short = calculateCaffeinePlan(70, 90, true)
    const long = calculateCaffeinePlan(70, 300, true)

    expect(long!.doses.length).toBeGreaterThan(short!.doses.length)
    expect(long!.totalDoseMg).toBeGreaterThan(short!.totalDoseMg)
  })

  it('warns when total dose exceeds 400mg', () => {
    // Heavy athlete, long event = high total dose
    const result = calculateCaffeinePlan(100, 480, true)
    if (result!.totalDoseMg > 400) {
      expect(result!.warning).toBeDefined()
    }
  })
})
