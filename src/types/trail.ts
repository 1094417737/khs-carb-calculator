// ============================================================
// 越野跑轨迹智能补给 — 类型定义 v3
// ============================================================

/** 轨迹点 */
export interface TrackPoint {
  lat: number
  lon: number
  ele: number
  cumulativeDistanceKm: number
  gradient: number               // %, 正=上坡, 负=下坡
  timeElapsed: number            // 秒, GAP 引擎填充
}

export type GradientCategory = 'steep_down' | 'gentle_down' | 'flat' | 'gentle_up' | 'steep_up'

/** 用户画像 */
export interface UserProfile {
  targetTimeMinutes: number
  tempC: number
  weightKg: number
  gutTolerance: 'low' | 'medium' | 'high'  // 肠胃碳水适应度
}

/** 自定义补给品 */
export interface NutritionItem {
  id: string
  type: 'gel' | 'salt' | 'solid'
  name: string
  kcal: number
  sodiumMg: number
  carbsG: number               // 碳水化合物克数
  isActive: boolean            // 同类型中仅一项激活，作为计算基准
}

/** 航点内具体补给项 */
export interface WaypointItem {
  itemId: string
  itemName: string
  quantity: number
  type: NutritionItem['type']
}

/** 补给航点 */
export interface Waypoint {
  id: string
  trackPointIndex: number
  timeMinutes: number
  distanceKm: number
  lat: number
  lon: number
  items: WaypointItem[]
  label: string
  score: number
  isCatchUp?: boolean
}

/** 补给策略配置 */
export interface WaypointConfig {
  searchWindowMinutes: number   // 搜索窗口, default 10
  mergeTimeMin: number          // 合并阈值(分钟), default 5
  mergeDistanceM: number        // 合并阈值(米), default 300
  cooldownMinutes: number       // 最小补给间隔, default 35
  gelMaxPerStop: number         // 单次胶上限, default 2
  saltMaxPerStop: number        // 单次盐丸上限, default 3
  carbsGMaxPerStop: number      // 单次碳水吸收上限(g), default 45
}

/** 计算结果 */
export interface TrailResult {
  trackPoints: TrackPoint[]
  waypoints: Waypoint[]
  totalDistanceKm: number
  equivalentFlatDistanceKm: number
  totalTimeMinutes: number
  elevationGainM: number
  elevationLossM: number
  maxElevation: number
  minElevation: number
  kcalPerHour: number
  sodiumMgPerHour: number
  carbsGPerHour: number
}

/** 用户自定义轨迹标记 */
export interface CustomMarker {
  id: string
  name: string
  trackPointIndex: number
  lat: number
  lon: number
  distanceKm: number
  cpType?: 'light' | 'full'  // CP 点类型：简易水站 / 大站换装点
}

export type TrailStep = 'upload' | 'configure' | 'results'

/** TrailContext 全局状态 */
export interface TrailState {
  gpxFileName: string
  trackPoints: TrackPoint[]
  rawGpxText: string | null        // 上传的原始 GPX 文本，用于无损导出
  userProfile: UserProfile
  nutritionLibrary: NutritionItem[]
  waypointConfig: WaypointConfig
  result: TrailResult | null
  step: TrailStep
  safeMode: boolean
  customMarkers: CustomMarker[]
  distanceOverrideKm: number | null
  climbOverrideM: number | null
  pendingMarkerInput: { lat: number; lon: number; trackPointIndex: number; distanceKm: number } | null
  activeWaypointId: string | null
}

export type TrailAction =
  | { type: 'SET_TRACK_POINTS'; fileName: string; points: TrackPoint[]; rawGpxText: string | null; importedMarkers?: CustomMarker[] }
  | { type: 'SET_USER_PROFILE'; profile: Partial<UserProfile> }
  | { type: 'SET_NUTRITION_LIBRARY'; items: NutritionItem[] }
  | { type: 'ADD_NUTRITION_ITEM'; item: NutritionItem }
  | { type: 'UPDATE_NUTRITION_ITEM'; item: NutritionItem }
  | { type: 'DELETE_NUTRITION_ITEM'; id: string }
  | { type: 'SET_WAYPOINT_CONFIG'; config: Partial<WaypointConfig> }
  | { type: 'SET_SAFE_MODE'; enabled: boolean }
  | { type: 'SET_RESULT'; result: TrailResult }
  | { type: 'MOVE_WAYPOINT'; id: string; lat: number; lon: number }
  | { type: 'DELETE_WAYPOINT'; id: string }
  | { type: 'UPDATE_WAYPOINT_ITEM'; wpId: string; itemId: string; delta: number }
  | { type: 'ADD_CUSTOM_MARKER'; id: string; name: string; lat: number; lon: number; trackPointIndex: number; distanceKm: number; cpType?: 'light' | 'full' }
  | { type: 'DELETE_CUSTOM_MARKER'; id: string }
  | { type: 'SET_DISTANCE_OVERRIDE'; value: number | null }
  | { type: 'SET_CLIMB_OVERRIDE'; value: number | null }
  | { type: 'SET_ITEM_ACTIVE'; id: string }
  | { type: 'SHOW_MARKER_INPUT'; lat: number; lon: number; trackPointIndex: number; distanceKm: number }
  | { type: 'HIDE_MARKER_INPUT' }
  | { type: 'SET_ACTIVE_WAYPOINT'; id: string | null }
  | { type: 'RESET' }