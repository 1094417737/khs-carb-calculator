import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useTrail } from '../../hooks/useTrail'
import { useTheme } from '../../hooks/useTheme'
import { gradientToChartColor } from '../../utils/colorScale'
import Card from '../layout/Card'

// ---- cubic bezier helpers (Catmull-Rom → cubic, tension ≈ 0) ----

interface Pt { x: number; y: number }

/** Catmull-Rom to cubic Bezier control points */
function bezierControlPoints(pts: Pt[], i: number): { cp1: Pt; cp2: Pt } {
  const p0 = pts[i - 1] ?? pts[i]
  const p1 = pts[i]
  const p2 = pts[i + 1] ?? pts[i]
  const p3 = pts[i + 2] ?? p2
  const tension = 0.4
  const t = (1 - tension) / 6
  return {
    cp1: { x: p1.x + (p2.x - p0.x) * t, y: p1.y + (p2.y - p0.y) * t },
    cp2: { x: p2.x - (p3.x - p1.x) * t, y: p2.y - (p3.y - p1.y) * t },
  }
}

/** Downsample for mobile: keep ~target points evenly spaced */
function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr
  const step = arr.length / target
  const out: T[] = []
  for (let i = 0; i < target; i++) out.push(arr[Math.floor(i * step)])
  return out
}

export default function ElevationProfile() {
  const { state, dispatch } = useTrail()
  const { theme } = useTheme()
  const points = state.result?.trackPoints
  const waypoints = state.result?.waypoints
  const customMarkers = state.customMarkers
  const activeWaypointId = state.activeWaypointId
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastMatchedWpId = useRef<string | null>(null)
  const isDark = theme === 'dark'

  const chartData = useMemo(() => {
    if (!points || points.length < 2) return null
    const maxPoints = window.innerWidth < 768 ? 100 : 300
    const src = points.length > maxPoints ? downsample(points, maxPoints) : points
    const distances = src.map(p => p.cumulativeDistanceKm)
    const elevations = src.map(p => p.ele)
    const colors = src.map(p => gradientToChartColor(p.gradient))
    return { distances, elevations, colors }
  }, [points])

  // 抽取绘制逻辑，供 ResizeObserver 和初始渲染共用
  function draw() {
    if (!chartData || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    // 跳过零尺寸画布（组件未挂载完毕时）
    if (rect.width < 1 || rect.height < 1) return
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = rect.width
    const h = rect.height
    const pad = { top: 12, right: 12, bottom: 24, left: 40 }
    const pw = w - pad.left - pad.right
    const ph = h - pad.top - pad.bottom

    const { distances, elevations, colors } = chartData
    const maxDist = distances[distances.length - 1]
    if (maxDist <= 0) return
    const minEle = Math.min(...elevations)
    const maxEle = Math.max(...elevations)
    const eleRange = maxEle - minEle || 1

    const x = (d: number) => pad.left + (d / maxDist) * pw
    const y = (e: number) => pad.top + ((maxEle - e) / eleRange) * ph

    const pts: Pt[] = distances.map((d, i) => ({ x: x(d), y: y(elevations[i]) }))

    ctx.fillStyle = isDark ? '#1c1c1e' : '#ffffff'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 0.5
    const labelColor = isDark ? '#8e8e93' : '#666666'
    for (let i = 0; i < 5; i++) {
      const gy = pad.top + (ph / 4) * i
      ctx.beginPath()
      ctx.moveTo(pad.left, gy)
      ctx.lineTo(w - pad.right, gy)
      ctx.stroke()
      ctx.fillStyle = labelColor
      ctx.font = '10px monospace'
      const ele = maxEle - (eleRange / 4) * i
      ctx.fillText(`${Math.round(ele)}m`, 2, gy + 3)
    }

    ctx.fillStyle = labelColor
    ctx.font = '10px monospace'
    for (let i = 0; i <= 4; i++) {
      const d = (maxDist / 4) * i
      const lx = x(d)
      ctx.fillText(`${d.toFixed(0)}km`, lx - 12, h - 4)
    }

    ctx.lineWidth = 2
    for (let i = 1; i < pts.length; i++) {
      const { cp1, cp2 } = bezierControlPoints(pts, i - 1)
      ctx.beginPath()
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, pts[i].x, pts[i].y)
      ctx.strokeStyle = colors[i]
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.moveTo(pts[0].x, y(minEle))
    for (let i = 0; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.lineTo(pts[pts.length - 1].x, y(minEle))
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom)
    grad.addColorStop(0, 'rgba(255,0,255,0.15)')
    grad.addColorStop(0.5, 'rgba(0,255,255,0.08)')
    grad.addColorStop(1, 'rgba(0,255,255,0.02)')
    ctx.fillStyle = grad
    ctx.fill()

    if (waypoints && waypoints.length > 0) {
      // 先找活跃航点
      const activeWp = activeWaypointId
        ? waypoints.find(wp => wp.id === activeWaypointId)
        : null

      for (const wp of waypoints) {
        const wx = x(wp.distanceKm)
        let wpEle = elevations[0]
        for (let i = 0; i < distances.length; i++) {
          if (distances[i] >= wp.distanceKm) { wpEle = elevations[i]; break }
          wpEle = elevations[i]
        }
        const wy = y(wpEle)

        const isActive = wp.id === activeWaypointId
        const size = isActive ? 7.5 : 5
        ctx.beginPath()
        ctx.moveTo(wx, wy - size)
        ctx.lineTo(wx - size * 0.7, wy - size * 2.2)
        ctx.lineTo(wx + size * 0.7, wy - size * 2.2)
        ctx.closePath()

        const hasGel = wp.items.some(i => i.type === 'gel')
        const hasSalt = wp.items.some(i => i.type === 'salt')
        ctx.fillStyle = isActive ? '#ffcc00'
          : (hasSalt && !hasGel ? '#007aff' : '#ff00ff')
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = isActive ? 1.5 : 1
        ctx.fill()
        ctx.stroke()
      }

      // 活跃航点的垂直高亮参考线
      if (activeWp && waypoints.includes(activeWp)) {
        const awx = x(activeWp.distanceKm)
        ctx.beginPath()
        ctx.setLineDash([3, 4])
        ctx.moveTo(awx, pad.top)
        ctx.lineTo(awx, h - pad.bottom)
        ctx.strokeStyle = 'rgba(255,204,0,0.45)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.setLineDash([]) // 重置为实线
      }
    }

    // ---- 自定义标记 (customMarkers) ----
    if (customMarkers && customMarkers.length > 0) {
      for (const cm of customMarkers) {
        const cmX = x(cm.distanceKm)
        // 跳过超出绘制区域的标记
        if (cmX < pad.left || cmX > w - pad.right) continue

        // 插值查找该距离对应的海拔
        let cmEle = elevations[0]
        for (let i = 0; i < distances.length; i++) {
          if (distances[i] >= cm.distanceKm) { cmEle = elevations[i]; break }
          cmEle = elevations[i]
        }
        const cmY = y(cmEle)

        const isActive = activeWaypointId === cm.id

        // 垂直虚线贯穿剖面区域
        ctx.beginPath()
        ctx.setLineDash(isActive ? [4, 3] : [2, 5])
        ctx.moveTo(cmX, pad.top)
        ctx.lineTo(cmX, h - pad.bottom)
        ctx.strokeStyle = isActive
          ? 'rgba(255,204,0,0.55)'
          : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
        ctx.lineWidth = isActive ? 1.5 : 0.5
        ctx.stroke()
        ctx.setLineDash([])

        // 置顶标志牌
        const emoji = cm.cpType === 'full' ? '🏁' : cm.cpType === 'light' ? '💧' : '🚩'
        const label = cm.name.length > 6 ? cm.name.slice(0, 5) + '…' : cm.name
        const fontSize = isActive ? 11 : 10
        const text = `${emoji} ${label}`

        ctx.font = `${fontSize}px -apple-system, "Segoe UI", sans-serif`
        const textW = ctx.measureText(text).width

        // 半透明背景胶囊
        const bgH = fontSize + 6
        const bgW = textW + 8
        const bgX = cmX - bgW / 2
        const bgY = pad.top + 1
        ctx.fillStyle = isActive
          ? 'rgba(255,204,0,0.25)'
          : isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)'
        ctx.beginPath()
        ctx.roundRect(bgX, bgY, bgW, bgH, 4)
        ctx.fill()

        // 文字
        ctx.fillStyle = isActive
          ? '#ffcc00'
          : isDark ? 'rgba(255,255,255,0.85)' : '#1d1d1f'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, cmX, bgY + bgH / 2)
      }
    }
  }

  // 初始渲染
  useEffect(() => { draw() }, [chartData, waypoints, customMarkers, isDark, activeWaypointId])

  // 屏幕旋转 / 窗口大小变化 → 重绘
  useEffect(() => {
    if (!canvasRef.current) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [chartData, waypoints, customMarkers, isDark, activeWaypointId])

  // ---- interactive tooltip ----
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; dist: number; ele: number; grad: number; eta: string
  } | null>(null)
  const touchedRef = useRef(false)  // 防止 touch→mouse 双重触发导致闪烁

  const handlePointer = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!chartData || !canvasRef.current) return
    // 触屏后短时间内忽略合成 mousemove
    if ('touches' in e) {
      touchedRef.current = true
    } else if (touchedRef.current) {
      return
    }
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX
    if (clientX == null) return

    const pad = { left: 40, right: 12 }
    const relX = clientX - rect.left - pad.left
    const pw = rect.width - pad.left - pad.right
    const ratio = Math.max(0, Math.min(1, relX / pw))

    const { distances, elevations } = chartData
    const idx = Math.round(ratio * (distances.length - 1))
    if (idx < 0 || idx >= distances.length) { setTooltip(null); return }

    const dist = distances[idx]
    const ele = elevations[idx]
    const gradient = points?.[idx]?.gradient ?? 0
    const etaMin = points?.[idx] ? Math.round(points[idx].timeElapsed / 60) : 0
    const h = Math.floor(etaMin / 60); const m = etaMin % 60
    const eta = h > 0 ? `${h}h${m}m` : `${m}min`

    setTooltip({
      x: clientX - rect.left,
      y: 12,
      dist: Math.round(dist * 100) / 100,
      ele: Math.round(ele),
      grad: Math.round(gradient * 10) / 10,
      eta,
    })

    // ---- 航点悬停检测 ----
    const WP_HIT_PX = 20
    let matchedId: string | null = null
    if (waypoints && waypoints.length > 0) {
      const maxDist = distances[distances.length - 1]
      if (maxDist > 0) {
        const xFn = (d: number) => pad.left + (d / maxDist) * pw
        let bestWpDist = Infinity
        for (const wp of waypoints) {
          const wpx = xFn(wp.distanceKm)
          const d = Math.abs(clientX - rect.left - wpx)
          if (d < WP_HIT_PX && d < bestWpDist) {
            bestWpDist = d
            matchedId = wp.id
          }
        }
      }
    }
    if (matchedId !== lastMatchedWpId.current) {
      lastMatchedWpId.current = matchedId
      dispatch({ type: 'SET_ACTIVE_WAYPOINT', id: matchedId })
    }
  }, [chartData, points, waypoints, dispatch])

  const hideTooltip = useCallback(() => {
    setTooltip(null)
    setTimeout(() => { touchedRef.current = false }, 200)
  }, [])

  if (!chartData) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📈</span>
        <span className="metric-label">海拔剖面图</span>
        {tooltip && (
          <span className="text-[10px] text-[#86868b] dark:text-[#8e8e93] ml-auto font-mono">
            {tooltip.dist}km · {tooltip.ele}m · {tooltip.grad}% · ETA {tooltip.eta}
          </span>
        )}
        {!tooltip && waypoints && waypoints.length > 0 && (
          <span className="text-[10px] text-[#aeaeb2] ml-auto">
            <span className="text-[#ff00ff]">▲补给×{waypoints.length}</span>
          </span>
        )}
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: 'clamp(180px, 30vh, 240px)', touchAction: 'none' }}
          onMouseMove={handlePointer}
          onMouseLeave={hideTooltip}
          onTouchMove={handlePointer}
          onTouchEnd={hideTooltip}
        />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-black/80 backdrop-blur text-white text-[10px] px-2 py-1 rounded shadow-lg font-mono whitespace-nowrap"
            style={{ left: Math.min(tooltip.x, canvasRef.current!.getBoundingClientRect().width - 140), top: tooltip.y }}
          >
            {tooltip.dist}km · {tooltip.ele}m · {tooltip.grad}% · {tooltip.eta}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#aeaeb2]">
        <span>上坡<strong className="text-[#ff00ff]"> 紫红</strong></span>
        <span>下坡<strong className="text-[#00ffff]"> 青蓝</strong></span>
        <span>平路<strong style={{color:'#e6bf9a'}}> 暖沙</strong></span>
        <span className="ml-auto">👆 滑动查看详情</span>
      </div>
    </Card>
  )
}