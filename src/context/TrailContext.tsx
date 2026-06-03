import React, { createContext, useContext, useReducer, useEffect, useRef, useMemo, type ReactNode } from 'react'
import type { TrailState, TrailAction, TrailResult } from '../types/trail'
import { computeTrail } from '../engine/trail'
import { validateTrailIntegrity } from '../engine/validate'

const STORAGE_KEY = 'trail_config_v5'
const SUPPLEMENTS_KEY = 'khs_trail_supplements'

/** 冷启动默认种子 — GU 能量胶基准 + SaltStick 盐丸标准 */
const DEFAULT_SUPPLEMENTS = [
  { id: 'default-gel-1', type: 'gel' as const, name: '能量胶', kcal: 111, sodiumMg: 84, carbsG: 27, isActive: true },
  { id: 'default-salt-1', type: 'salt' as const, name: '盐丸', kcal: 0, sodiumMg: 280, carbsG: 0, isActive: true },
]

/**
 * 加载补给库 — 三层嗅探：
 * 1. 专用 key (khs_trail_supplements) — 优先
 * 2. 旧版 config key (trail_config_v5) — 向前兼容
 * 3. 冷启动默认种子 — 新用户兜底
 */
function loadSupplements(): typeof DEFAULT_SUPPLEMENTS {
  // 1. 专用 key
  try {
    const raw = localStorage.getItem(SUPPLEMENTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 逐项校验核心字段：杜绝脏数据引发运行时 NaN/undefined 异常
        const valid = parsed.filter((item: any) =>
          item && typeof item.id === 'string' && typeof item.type === 'string' &&
          typeof item.kcal === 'number' && typeof item.carbsG === 'number' && typeof item.sodiumMg === 'number'
        )
        if (valid.length > 0) return valid
        // 全是脏数据 → 物理切除
        console.warn('[KHS] khs_trail_supplements 数据格式不兼容，已安全隔离并清除')
        localStorage.removeItem(SUPPLEMENTS_KEY)
      }
    }
  } catch (e) {
    console.error('[KHS] 补给库缓存解析失败，已安全隔离:', e)
    localStorage.removeItem(SUPPLEMENTS_KEY)
  }

  // 2. 旧版 config key — 向前兼容迁移
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.nutritionLibrary) && parsed.nutritionLibrary.length > 0) {
        const valid = parsed.nutritionLibrary.filter((item: any) =>
          item && typeof item.id === 'string' && typeof item.kcal === 'number'
        )
        if (valid.length > 0) return valid
      }
    }
  } catch (e) {
    console.error('[KHS] 旧版缓存迁移失败，已安全隔离:', e)
  }

  // 3. 硬地板：无论如何返回默认种子，绝不允许白屏
  return DEFAULT_SUPPLEMENTS
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // 防御：不是对象直接丢弃
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('[KHS] trail_config_v5 格式异常，已安全隔离')
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    // 迁移旧版数据：确保 isActive 字段存在且同类型互斥
    if (Array.isArray(parsed.nutritionLibrary)) {
      const seen = new Set<string>()
      parsed.nutritionLibrary = parsed.nutritionLibrary.map((item: any) => {
        if (!item || typeof item !== 'object') return { id: '', type: 'gel', name: '', kcal: 0, sodiumMg: 0, carbsG: 0, isActive: false }
        const hasActive = item.isActive === true
        if (hasActive && seen.has(item.type)) return { ...item, isActive: false }
        if (hasActive) seen.add(item.type)
        return { ...item, isActive: hasActive }
      })
    }
    // 校验关键字段类型
    if (parsed.userProfile && typeof parsed.userProfile !== 'object') parsed.userProfile = undefined
    if (parsed.waypointConfig && typeof parsed.waypointConfig !== 'object') parsed.waypointConfig = undefined
    return parsed
  } catch (e) {
    console.error('[KHS] 配置缓存解析失败，已安全隔离:', e)
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function saveConfig(state: TrailState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userProfile: state.userProfile,
      waypointConfig: state.waypointConfig,
      nutritionLibrary: state.nutritionLibrary,
      safeMode: state.safeMode,
    }))
    // 专用补给库 key — 独立持久化，避免 config 迁移时被意外清空
    localStorage.setItem(SUPPLEMENTS_KEY, JSON.stringify(state.nutritionLibrary))
  } catch { /* ignore */ }
}

const saved = loadConfig()

const initialState: TrailState = {
  gpxFileName: '',
  trackPoints: [],
  rawGpxText: null,
  userProfile: saved?.userProfile ?? { targetTimeMinutes: 240, tempC: 20, weightKg: 65, gutTolerance: 'low' },
  nutritionLibrary: loadSupplements(),
  waypointConfig: saved?.waypointConfig ?? {
    searchWindowMinutes: 10,
    cooldownMinutes: 35,
    gelMaxPerStop: 2,
    saltMaxPerStop: 3,
    carbsGMaxPerStop: 45,
  },
  result: null,
  step: 'upload',
  safeMode: saved?.safeMode ?? false,
  customMarkers: [],
  distanceOverrideKm: null,
  climbOverrideM: null,
  pendingMarkerInput: null,
  activeWaypointId: null,
}

function reducer(state: TrailState, action: TrailAction): TrailState {
  switch (action.type) {
    case 'SET_TRACK_POINTS':
      return { ...state, gpxFileName: action.fileName, trackPoints: action.points, rawGpxText: action.rawGpxText, result: null, step: 'configure', customMarkers: action.importedMarkers ?? [], distanceOverrideKm: null, climbOverrideM: null, pendingMarkerInput: null }

    case 'SET_USER_PROFILE':
      return { ...state, userProfile: { ...state.userProfile, ...action.profile } }

    case 'SET_NUTRITION_LIBRARY':
      return { ...state, nutritionLibrary: action.items }

    case 'ADD_NUTRITION_ITEM': {
      const hasActiveOfType = state.nutritionLibrary.some(i => i.type === action.item.type && i.isActive)
      const item = { ...action.item, isActive: !hasActiveOfType }
      return { ...state, nutritionLibrary: [...state.nutritionLibrary, item] }
    }

    case 'UPDATE_NUTRITION_ITEM': {
      const items = state.nutritionLibrary.map(i => i.id === action.item.id ? { ...action.item, isActive: i.isActive } : i)
      return { ...state, nutritionLibrary: items }
    }

    case 'DELETE_NUTRITION_ITEM': {
      const toDelete = state.nutritionLibrary.find(i => i.id === action.id)
      const remaining = state.nutritionLibrary.filter(i => i.id !== action.id)
      if (toDelete?.isActive) {
        const firstOfType = remaining.find(i => i.type === toDelete.type)
        if (firstOfType) {
          return { ...state, nutritionLibrary: remaining.map(i => i.id === firstOfType.id ? { ...i, isActive: true } : i) }
        }
      }
      return { ...state, nutritionLibrary: remaining }
    }

    case 'SET_ITEM_ACTIVE': {
      const target = state.nutritionLibrary.find(i => i.id === action.id)
      if (!target) return state
      return {
        ...state,
        nutritionLibrary: state.nutritionLibrary.map(i => ({
          ...i,
          isActive: i.id === action.id ? true : (i.type === target.type ? false : i.isActive),
        }))
      }
    }

    case 'SET_WAYPOINT_CONFIG':
      return { ...state, waypointConfig: { ...state.waypointConfig, ...action.config } }

    case 'SET_SAFE_MODE':
      return { ...state, safeMode: action.enabled }

    case 'SET_RESULT':
      return { ...state, result: action.result, step: 'results' }

    case 'MOVE_WAYPOINT': {
      if (!state.result) return state
      return { ...state, result: { ...state.result, waypoints: state.result.waypoints.map(w => w.id === action.id ? { ...w, lat: action.lat, lon: action.lon } : w) } }
    }

    case 'DELETE_WAYPOINT': {
      if (!state.result) return state
      return { ...state, result: { ...state.result, waypoints: state.result.waypoints.filter(w => w.id !== action.id) } }
    }

    case 'UPDATE_WAYPOINT_ITEM': {
      if (!state.result) return state
      return {
        ...state,
        result: {
          ...state.result,
          waypoints: state.result.waypoints.map(wp => {
            if (wp.id !== action.wpId) return wp
            return {
              ...wp,
              items: wp.items
                .map(item =>
                  item.itemId === action.itemId
                    ? { ...item, quantity: Math.max(0, item.quantity + action.delta) }
                    : item
                )
                .filter(item => item.quantity > 0),
            }
          }),
        },
      }
    }

    case 'ADD_CUSTOM_MARKER': {
      const cm = { id: action.id, name: action.name, lat: action.lat, lon: action.lon, trackPointIndex: action.trackPointIndex, distanceKm: action.distanceKm, cpType: action.cpType }
      return { ...state, customMarkers: [...state.customMarkers, cm] }
    }

    case 'SET_DISTANCE_OVERRIDE':
      return { ...state, distanceOverrideKm: action.value }

    case 'SET_CLIMB_OVERRIDE':
      return { ...state, climbOverrideM: action.value }

    case 'DELETE_CUSTOM_MARKER':
      return { ...state, customMarkers: state.customMarkers.filter(m => m.id !== action.id) }

    case 'SHOW_MARKER_INPUT':
      return { ...state, pendingMarkerInput: { lat: action.lat, lon: action.lon, trackPointIndex: action.trackPointIndex, distanceKm: action.distanceKm } }

    case 'HIDE_MARKER_INPUT':
      return { ...state, pendingMarkerInput: null }

    case 'SET_ACTIVE_WAYPOINT':
      return { ...state, activeWaypointId: action.id }

    case 'RESET':
      return { ...initialState, userProfile: state.userProfile, waypointConfig: state.waypointConfig, nutritionLibrary: state.nutritionLibrary }

    default:
      return state
  }
}

const TrailContext = createContext<{ state: TrailState; dispatch: React.Dispatch<TrailAction> } | null>(null)

export function TrailProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const calcTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { saveConfig(state) }, [state.userProfile, state.waypointConfig, state.nutritionLibrary, state.safeMode])

  // 自动计算 — 防抖 300ms，避免快速连续输入引发密集重算
  useEffect(() => {
    if (state.trackPoints.length < 2) return

    if (calcTimer.current) clearTimeout(calcTimer.current)
    calcTimer.current = setTimeout(() => {
      try {
        const result: TrailResult = computeTrail({
          points: state.trackPoints,
          profile: state.userProfile,
          waypointConfig: state.waypointConfig,
          nutritionLibrary: state.nutritionLibrary,
          distanceOverrideKm: state.distanceOverrideKm,
          climbOverrideM: state.climbOverrideM,
          customMarkers: state.customMarkers,
        })
        dispatch({ type: 'SET_RESULT', result })
        // 🔐 v3.1 天网自检
        validateTrailIntegrity(state.userProfile.weightKg, state.userProfile.tempC, result)
      } catch (e) {
        console.error('Trail 计算引擎异常:', e)
      }
    }, 300)

    return () => { if (calcTimer.current) clearTimeout(calcTimer.current) }
  }, [state.trackPoints, state.userProfile, state.waypointConfig, state.nutritionLibrary, state.distanceOverrideKm, state.climbOverrideM, state.customMarkers])

  // 🔒 useMemo 锁定 context value 引用 — 仅在 state/dispatch 实质变更时重建，防止全树连锁重渲染
  const ctxValue = useMemo(() => ({ state, dispatch }), [state, dispatch])

  return (
    <TrailContext.Provider value={ctxValue}>
      {children}
    </TrailContext.Provider>
  )
}

export function useTrailContext() {
  const ctx = useContext(TrailContext)
  if (!ctx) throw new Error('useTrailContext must be used within TrailProvider')
  return ctx
}