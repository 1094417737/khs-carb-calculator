import { createContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import type { PlanInputs, StrategyOptions } from '../types'
import type { CalculationResult } from '../types/results'

// ============================================================
// Default values
// ============================================================

const DEFAULT_PLAN: PlanInputs = {
  durationMinutes: 180,
  hrZone: '70-80',
  weightKg: 70,
  tempC: 20,
  giTraining: 'Low',
  elevationGainM: 0,
  distanceKm: undefined,
}

const DEFAULT_STRATEGY: StrategyOptions = {
  useCaffeine: false,
  useHomemade: true,
  homemadeRatio: '1:1',
}

// ============================================================
// State shape
// ============================================================

interface CalculatorState {
  planInputs: PlanInputs
  strategyOptions: StrategyOptions
  results: CalculationResult | null
  isCalculating: boolean
}

type CalculatorAction =
  | { type: 'SET_PLAN_INPUT'; field: keyof PlanInputs; value: unknown }
  | { type: 'SET_STRATEGY_OPTION'; field: keyof StrategyOptions; value: unknown }
  | { type: 'SET_RESULTS'; payload: CalculationResult | null }
  | { type: 'RESET' }

// ============================================================
// Reducer
// ============================================================

function reducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case 'SET_PLAN_INPUT':
      return {
        ...state,
        planInputs: { ...state.planInputs, [action.field]: action.value },
      }
    case 'SET_STRATEGY_OPTION':
      return {
        ...state,
        strategyOptions: { ...state.strategyOptions, [action.field]: action.value },
      }
    case 'SET_RESULTS':
      return { ...state, results: action.payload, isCalculating: false }
    case 'RESET':
      return { planInputs: DEFAULT_PLAN, strategyOptions: DEFAULT_STRATEGY, results: null, isCalculating: false }
    default:
      return state
  }
}

// ============================================================
// Helper: load from localStorage
// ============================================================

function loadPlanInputs(): PlanInputs {
  try {
    const stored = localStorage.getItem('fc-plan')
    if (stored) return { ...DEFAULT_PLAN, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_PLAN
}

function loadStrategy(): StrategyOptions {
  try {
    const stored = localStorage.getItem('fc-strategy')
    if (stored) return { ...DEFAULT_STRATEGY, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return DEFAULT_STRATEGY
}

// ============================================================
// Context
// ============================================================

interface CalculatorContextValue {
  planInputs: PlanInputs
  strategyOptions: StrategyOptions
  results: CalculationResult | null
  setPlanInput: (field: keyof PlanInputs, value: unknown) => void
  setStrategyOption: (field: keyof StrategyOptions, value: unknown) => void
  reset: () => void
}

export const CalculatorContext = createContext<CalculatorContextValue>({
  planInputs: DEFAULT_PLAN,
  strategyOptions: DEFAULT_STRATEGY,
  results: null,
  setPlanInput: () => {},
  setStrategyOption: () => {},
  reset: () => {},
})

// ============================================================
// Provider
// ============================================================

import { calculate } from '../engine'

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    planInputs: loadPlanInputs(),
    strategyOptions: loadStrategy(),
    results: null,
    isCalculating: false,
  })

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('fc-plan', JSON.stringify(state.planInputs))
  }, [state.planInputs])

  useEffect(() => {
    localStorage.setItem('fc-strategy', JSON.stringify(state.strategyOptions))
  }, [state.strategyOptions])

  // Auto-calculate when inputs change
  useEffect(() => {
    try {
      const result = calculate({
        plan: state.planInputs,
        strategy: state.strategyOptions,
      })
      dispatch({ type: 'SET_RESULTS', payload: result })
    } catch {
      dispatch({ type: 'SET_RESULTS', payload: null })
    }
  }, [state.planInputs, state.strategyOptions])

  const setPlanInput = useCallback((field: keyof PlanInputs, value: unknown) => {
    dispatch({ type: 'SET_PLAN_INPUT', field, value })
  }, [])

  const setStrategyOption = useCallback((field: keyof StrategyOptions, value: unknown) => {
    dispatch({ type: 'SET_STRATEGY_OPTION', field, value })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
    // 立即用默认值重算（防止 useEffect 因依赖未变化而跳过）
    try {
      const result = calculate({ plan: DEFAULT_PLAN, strategy: DEFAULT_STRATEGY })
      dispatch({ type: 'SET_RESULTS', payload: result })
    } catch {
      dispatch({ type: 'SET_RESULTS', payload: null })
    }
  }, [])

  return (
    <CalculatorContext.Provider
      value={{
        planInputs: state.planInputs,
        strategyOptions: state.strategyOptions,
        results: state.results,
        setPlanInput,
        setStrategyOption,
        reset,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  )
}
