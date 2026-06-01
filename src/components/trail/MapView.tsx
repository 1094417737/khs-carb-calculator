import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useTrail } from '../../hooks/useTrail'
import { useTheme } from '../../hooks/useTheme'
import { gradientToHex } from '../../utils/colorScale'
import { tileKeysForBounds, downloadTiles, getCacheStats } from '../../utils/tileCache'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>'

// ---- start / end marker icons ----
const startIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50%;
    background:#34c759;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 10px rgba(52,199,89,0.6);border:3px solid white;
    font-size:14px;font-weight:900;line-height:1;color:white;
  ">S</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const endIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50%;
    background:#ff3b30;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 10px rgba(255,59,48,0.6);border:3px solid white;
    font-size:14px;font-weight:900;line-height:1;color:white;
  ">E</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// ---- bearing calc (degrees from north) ----
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const rLat1 = lat1 * Math.PI / 180
  const rLat2 = lat2 * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(rLat2)
  const x = Math.cos(rLat1) * Math.sin(rLat2) -
            Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon)
  return Math.atan2(y, x) * 180 / Math.PI
}

// ---- arrow icon — "^" chevron pointing north at rest ----
function arrowIcon(deg: number) {
  return L.divIcon({
    className: '',
    html: `<svg width="16" height="16" viewBox="0 0 16 16" style="transform:rotate(${deg}deg);filter:drop-shadow(0 0 2px rgba(0,0,0,0.6))">
      <polyline points="4,11 8,5 12,11" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// ---- gradient track polyline ----
function GradientTrack() {
  const { state } = useTrail()
  const points = state.result?.trackPoints ?? state.trackPoints

  const segments = useMemo(() => {
    if (points.length < 2) return []
    const batchSize = 12
    const segs: { positions: [number, number][]; color: string; key: string }[] = []
    for (let i = 0; i < points.length - 1; i += batchSize) {
      const batch = points.slice(i, i + batchSize + 1)
      const positions: [number, number][] = batch.map(p => [p.lat, p.lon])
      const avgGrad = batch.reduce((s, p) => s + p.gradient, 0) / batch.length
      segs.push({ positions, color: gradientToHex(avgGrad), key: `s_${i}` })
    }
    return segs
  }, [points])

  return <>{segments.map(s => <Polyline key={s.key} positions={s.positions} pathOptions={{ color: s.color, weight: 4, opacity: 0.85 }} />)}</>
}

// ---- direction arrows ----
const MIN_SPAN_M = 50
const MIN_IDX_SKIP = 5
const ARROW_SPACING_KM = 0.8

function DirectionArrows() {
  const { state } = useTrail()
  const points = state.result?.trackPoints ?? state.trackPoints

  const arrows = useMemo(() => {
    if (points.length < MIN_IDX_SKIP * 2) return []
    const totalDist = points[points.length - 1].cumulativeDistanceKm
    if (totalDist <= 0) return []

    const result: { lat: number; lon: number; deg: number; key: string }[] = []
    let nextTargetKm = ARROW_SPACING_KM * 0.5

    for (let i = MIN_IDX_SKIP; i < points.length - MIN_IDX_SKIP; i++) {
      const distKm = points[i].cumulativeDistanceKm
      if (distKm < nextTargetKm) continue

      const lookAheadKm = distKm + MIN_SPAN_M / 1000
      let j = Math.min(i + MIN_IDX_SKIP, points.length - 1)
      while (j < points.length - 1 && points[j].cumulativeDistanceKm < lookAheadKm) j++

      const a = points[i]
      const b = points[j]
      const spanM = (b.cumulativeDistanceKm - a.cumulativeDistanceKm) * 1000
      if (spanM < MIN_SPAN_M) { nextTargetKm += ARROW_SPACING_KM; continue }

      const deg = bearing(a.lat, a.lon, b.lat, b.lon)
      result.push({ lat: a.lat, lon: a.lon, deg, key: `arw_${i}` })
      nextTargetKm += ARROW_SPACING_KM
    }

    return result
  }, [points])

  return <>
    {arrows.map(a => (
      <Marker key={a.key} position={[a.lat, a.lon]} icon={arrowIcon(a.deg)} interactive={false} />
    ))}
  </>
}

// ---- auto-fit map bounds ----
function FitBounds() {
  const { state } = useTrail()
  const map = useMap()
  const points = state.result?.trackPoints ?? state.trackPoints

  useEffect(() => {
    if (points.length > 0) {
      const lats = points.map(p => p.lat), lons = points.map(p => p.lon)
      map.fitBounds(
        L.latLngBounds([Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]),
        { padding: [30, 30] }
      )
    }
  }, [points, map])
  return null
}

// ---- start & end markers ----
function StartEndMarkers() {
  const { state } = useTrail()
  const points = state.result?.trackPoints ?? state.trackPoints
  if (points.length < 2) return null

  const start = points[0]
  const end = points[points.length - 1]

  return (
    <>
      <Marker position={[start.lat, start.lon]} icon={startIcon} interactive={false}>
        <Popup><div className="text-xs font-semibold">起点 · 0.0 km</div></Popup>
      </Marker>
      <Marker position={[end.lat, end.lon]} icon={endIcon} interactive={false}>
        <Popup><div className="text-xs font-semibold">终点 · {end.cumulativeDistanceKm.toFixed(1)} km</div></Popup>
      </Marker>
    </>
  )
}

// ---- nutrition waypoint markers ----
function createIcon(items: { type?: string; itemName: string; quantity: number }[], isActive?: boolean) {
  const hasGel = items.some(i => i.type === 'gel')
  const hasSalt = items.some(i => i.type === 'salt')
  const hasSolid = items.some(i => i.type === 'solid')
  const emoji = (hasGel && hasSalt) ? '⚡💧' : hasGel ? '⚡' : hasSalt ? '💧' : hasSolid ? '🍫' : '📌'
  const bg = (hasGel && hasSalt) ? '#af52de' : hasGel ? '#ff9500' : hasSalt ? '#007aff' : hasSolid ? '#34c759' : '#8e8e93'
  const size = isActive ? 36 : 28
  const shadow = isActive ? '0 4px 20px rgba(255,204,0,0.8)' : '0 2px 8px rgba(0,0,0,0.5)'
  const border = isActive ? '3px solid #ffcc00' : '2px solid white'
  const transform = isActive ? 'transform:scale(1.25);' : ''
  return L.divIcon({
    className: isActive ? 'waypoint-marker waypoint-marker--active' : 'waypoint-marker',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;box-shadow:${shadow};border:${border};font-size:12px;line-height:1;${transform}">${emoji}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -(size / 2)],
  })
}

function WaypointMarkers() {
  const { state, dispatch } = useTrail()
  const waypoints = state.result?.waypoints ?? []
  const pts = state.result?.trackPoints ?? state.trackPoints
  const activeId = state.activeWaypointId
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())

  // 当 activeWaypointId 变化时，自动打开对应 marker 的 Popup
  useEffect(() => {
    if (activeId && markerRefs.current.has(activeId)) {
      const marker = markerRefs.current.get(activeId)!
      setTimeout(() => marker.openPopup(), 50)
    }
  }, [activeId])

  return <>{waypoints.map(wp => {
    const wpEle = pts[wp.trackPointIndex]?.ele
    const isActive = wp.id === activeId
    return (
    <Marker
      key={wp.id} position={[wp.lat, wp.lon]}
      icon={createIcon(wp.items, isActive)}
      draggable={false}
      ref={(ref) => {
        if (ref) markerRefs.current.set(wp.id, ref)
        else markerRefs.current.delete(wp.id)
      }}
      eventHandlers={{
        click: () => dispatch({ type: 'SET_ACTIVE_WAYPOINT', id: wp.id }),
      }}
    >
      <Popup>
        <div className="text-xs" style={{ minWidth: '120px' }}>
          <div className="font-semibold text-[#1d1d1f] mb-1">{wp.distanceKm.toFixed(1)}km · {wp.timeMinutes}min</div>
          {wpEle != null && <div className="text-[11px] text-[#86868b] mb-0.5">海拔: {Math.round(wpEle)}m</div>}
          {wp.items.map((item, j) => (
            <div key={j} className="text-[#86868b]">{item.itemName} <strong>x{item.quantity}</strong></div>
          ))}
        </div>
      </Popup>
    </Marker>
    )
  })}</>
}

// ---- custom marker flag icon ----
const flagIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));font-size:20px;">🚩</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const fullCpIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));font-size:22px;">🏁</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const lightCpIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));font-size:20px;">💧</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
})

const SNAP_TOLERANCE_METERS = 100

// ---- Haversine distance in meters ----
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---- snap click to nearest track point ----
function MapClickHandler() {
  const { state, dispatch } = useTrail()
  const points = state.result?.trackPoints ?? state.trackPoints

  useMapEvents({
    click(e) {
      if (points.length === 0) return
      const { lat, lng } = e.latlng

      let best = points[0]
      let bestDist = Infinity
      for (const p of points) {
        const d = (p.lat - lat) ** 2 + (p.lon - lng) ** 2
        if (d < bestDist) { bestDist = d; best = p }
      }

      if (haversineM(lat, lng, best.lat, best.lon) > SNAP_TOLERANCE_METERS) return

      dispatch({
        type: 'SHOW_MARKER_INPUT',
        lat: best.lat,
        lon: best.lon,
        trackPointIndex: points.indexOf(best),
        distanceKm: best.cumulativeDistanceKm,
      })
    },
  })

  return null
}

// ---- custom marker name input overlay ----
function MarkerInputOverlay() {
  const { state, dispatch } = useTrail()
  const pending = state.pendingMarkerInput
  const [name, setName] = useState('')
  const [cpType, setCpType] = useState<'none' | 'light' | 'full'>('none')

  if (!pending) return null
  const p = pending // captured non-null for TS narrowing

  function confirm() {
    const trimmed = name.trim()
    if (!trimmed) return
    dispatch({
      type: 'ADD_CUSTOM_MARKER',
      id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      lat: p.lat,
      lon: p.lon,
      trackPointIndex: p.trackPointIndex,
      distanceKm: p.distanceKm,
      cpType: cpType === 'none' ? undefined : cpType,
    })
    dispatch({ type: 'HIDE_MARKER_INPUT' })
    setName('')
    setCpType('none')
  }

  function cancel() {
    dispatch({ type: 'HIDE_MARKER_INPUT' })
    setName('')
    setCpType('none')
  }

  return (
    <div className="absolute inset-0 z-[1002] flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/20" onClick={cancel} />
      <div className="relative bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-xl px-5 py-4 w-[280px] mx-4">
        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">
          添加自定义标记
        </p>
        <p className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-2">
          位置: {p.distanceKm.toFixed(2)}km
        </p>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel() }}
          placeholder="如：危险下坡、取水点"
          autoFocus
          className="w-full bg-[#f5f5f7] dark:bg-[#3a3a3c] rounded-lg px-3 h-10 text-sm text-[#1d1d1f] dark:text-white border border-transparent focus:border-accent-400 outline-none placeholder:text-[#aeaeb2] mb-2"
        />
        <div className="mb-3">
          <p className="text-[10px] text-[#86868b] dark:text-[#8e8e93] mb-1.5">标记类型</p>
          <div className="flex rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] p-0.5">
            {([
              ['none', '📍', '普通标记'],
              ['light', '💧', '简易水站'],
              ['full', '🏁', '大站换装点'],
            ] as const).map(([key, emoji, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCpType(key)}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  cpType === key
                    ? 'bg-white dark:bg-[#3a3a3c] text-accent-600 dark:text-accent-400 shadow-sm'
                    : 'text-[#aeaeb2] dark:text-[#636366]'
                }`}
              >
                <span className="block text-[11px] font-medium">{emoji} {label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button" onClick={cancel}
            className="flex-1 h-9 rounded-lg bg-[#e8e8ed] dark:bg-[#3a3a3c] text-sm text-[#86868b] dark:text-[#8e8e93] font-medium hover:bg-[#dcdce2] dark:hover:bg-[#4a4a4c] transition-colors"
          >取消</button>
          <button
            type="button" onClick={confirm}
            disabled={!name.trim()}
            className="flex-1 h-9 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-40 transition-colors"
          >确认添加</button>
        </div>
      </div>
    </div>
  )
}

// ---- custom user markers ----
function CustomMarkers() {
  const { state, dispatch } = useTrail()
  const markers = state.customMarkers ?? []
  const pts = state.result?.trackPoints ?? state.trackPoints

  return <>{markers.map(m => {
    const cmEle = pts[m.trackPointIndex]?.ele
    const cpIconRender = m.cpType === 'full' ? fullCpIcon : m.cpType === 'light' ? lightCpIcon : flagIcon
    const cpLabel = m.cpType === 'full' ? '🏁 大站' : m.cpType === 'light' ? '💧 水站' : null
    return (
    <Marker key={m.id} position={[m.lat, m.lon]} icon={cpIconRender}>
      <Popup>
        <div className="text-xs">
          <div className="font-semibold mb-1">
            {cpLabel && <span className="text-[10px] text-accent-500 mr-1">{cpLabel}</span>}
            {m.name}
          </div>
          <div className="text-[#86868b]">距起点: {m.distanceKm.toFixed(1)}km</div>
          {cmEle != null && <div className="text-[11px] text-[#86868b]">海拔: {Math.round(cmEle)}m</div>}
          <button
            type="button"
            onClick={() => dispatch({ type: 'DELETE_CUSTOM_MARKER', id: m.id })}
            className="mt-1 text-[10px] text-red-500 hover:underline"
          >删除此标记</button>
        </div>
      </Popup>
    </Marker>
    )
  })}</>
}

// ---- main map component ----
export default function MapView() {
  const { state } = useTrail()
  const { theme } = useTheme()
  const points = state.result?.trackPoints ?? state.trackPoints
  const isDark = theme === 'dark'

  // ---- offline tile download ----
  const [caching, setCaching] = useState(false)
  const [cacheProgress, setCacheProgress] = useState<{ done: number; total: number } | null>(null)
  const [cacheDone, setCacheDone] = useState(false)
  const [showCacheHint, setShowCacheHint] = useState(true)
  const [cacheStats, setCacheStats] = useState<{ count: number; sizeMB: number } | null>(null)

  useEffect(() => {
    getCacheStats().then(setCacheStats)
  }, [])

  const handleDownloadTiles = useCallback(async () => {
    if (caching || points.length < 2) return
    const lats = points.map(p => p.lat)
    const lons = points.map(p => p.lon)
    const minLat = Math.min(...lats) - 0.02
    const maxLat = Math.max(...lats) + 0.02
    const minLon = Math.min(...lons) - 0.02
    const maxLon = Math.max(...lons) + 0.02

    const keys = tileKeysForBounds(minLat, maxLat, minLon, maxLon, 12, 16)
    setCaching(true)
    setCacheProgress({ done: 0, total: keys.length })

    const { cached } = await downloadTiles(keys, TILE_URL,
      (done, total) => setCacheProgress({ done, total }),
    )

    setCacheProgress(null)
    setCaching(false)
    setCacheDone(true)
    getCacheStats().then(setCacheStats)
    setTimeout(() => setCacheDone(false), 3000)
  }, [caching, points])

  if (points.length === 0) return null

  return (
    <div className={`relative w-full h-full ${isDark ? '' : 'bg-gray-200'}`}>
      <MapContainer
        center={[points[0].lat, points[0].lon]} zoom={13}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        dragging={true}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxNativeZoom={18} maxZoom={22} />
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution={'&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'}
          opacity={0.35}
          maxNativeZoom={17}
          maxZoom={22}
        />
        <GradientTrack />
        <DirectionArrows />
        <StartEndMarkers />
        <WaypointMarkers />
        <CustomMarkers />
        <MapClickHandler />
        <FitBounds />
      </MapContainer>

      {/* Offline tile download button — bottom-right, touch-friendly */}
      <div className="absolute bottom-4 right-2 z-[1000] flex flex-col items-end gap-1 pointer-events-auto">
        {showCacheHint && !caching && !cacheDone && (
          <button
            type="button"
            onClick={() => setShowCacheHint(false)}
            className="text-[10px] px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white/60 hover:text-white"
          >
            {cacheStats ? `${cacheStats.count} tiles (${cacheStats.sizeMB}MB)` : '无离线缓存'} ✕
          </button>
        )}

        {caching && cacheProgress && (
          <div className="text-[10px] px-2.5 py-1 rounded-full bg-black/70 backdrop-blur text-white">
            缓存地图: {Math.round(cacheProgress.done / cacheProgress.total * 100)}%
          </div>
        )}

        {cacheDone && (
          <div className="text-[10px] px-2.5 py-1 rounded-full bg-green-600/80 backdrop-blur text-white">
            ✓ 离线就绪
          </div>
        )}

        <button
          type="button"
          onClick={handleDownloadTiles}
          disabled={caching}
          className="w-11 h-11 rounded-xl bg-accent-500 text-white flex items-center justify-center shadow-lg hover:bg-accent-600 disabled:opacity-50 transition-colors active:scale-95"
          title="下载离线地图"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>

      {/* Custom marker name input overlay */}
      <MarkerInputOverlay />
    </div>
  )
}