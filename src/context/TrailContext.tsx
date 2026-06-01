import React, { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react'
import type { TrailState, TrailAction, TrailResult } from '../types/trail'
import { computeTrail } from '../engine/trail'
import { defaultNutritionLibrary } from '../engine/trail/nutrition'

const STORAGE_KEY = 'trail_config_v5'

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 迁移旧版数据：确保 isActive 字段存在且同类型互斥
      if (Array.isArray(parsed.nutritionLibrary)) {
        const seen = new Set<string>()
        parsed.nutritionLibrary = parsed.nutritionLibrary.map((item: any) => {
          const hasActive = item.isActive === true
          if (hasActive && seen.has(item.type)) return { ...item, isActive: false }
          if (hasActive) seen.add(item.type)
          return { ...item, isActive: hasActive }
        })
      }
      return parsed
    }
  } catch { /* ignore */ }
  return null
}

function saveConfig(state: TrailState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      userProfile: state.userProfile,
      waypointConfig: state.waypointConfig,
      nutritionLibrary: state.nutritionLibrary,
      safeMode: state.safeMode,
    }))
  } catch { /* ignore */ }
}

const saved = loadConfig()

const initialState: TrailState = {
  gpxFileName: '',
  trackPoints: [],
  rawGpxText: null,
  userProfile: saved?.userProfile ?? { targetTimeMinutes: 240, tempC: 20, weightKg: 65, gutTolerance: 'low' },
  nutritionLibrary: saved?.nutritionLibrary ?? defaultNutritionLibrary(),
  waypointConfig: saved?.waypointConfig ?? {
    searchWindowMinutes: 10,
    mergeTimeMin: 5,
    mergeDistanceM: 300,
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
      } catch (e) {
        console.error('Trail 计算引擎异常:', e)
      }
    }, 300)

    return () => { if (calcTimer.current) clearTimeout(calcTimer.current) }
  }, [state.trackPoints, state.userProfile, state.waypointConfig, state.nutritionLibrary, state.distanceOverrideKm, state.climbOverrideM, state.customMarkers])

  return (
    <TrailContext.Provider value={{ state, dispatch }}>
      {children}
    </TrailContext.Provider>
  )
}

export function useTrailContext() {
  const ctx = useContext(TrailContext)
  if (!ctx) throw new Error('useTrailContext must be used within TrailProvider')
  return ctx
}