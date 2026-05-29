import { useRef, useEffect, useMemo } from 'react'
import { useTrail } from '../../hooks/useTrail'
import { useTheme } from '../../hooks/useTheme'
import { gradientToChartColor } from '../../utils/colorScale'
import Card from '../layout/Card'

export default function ElevationProfile() {
  const { state } = useTrail()
  const { theme } = useTheme()
  const points = state.result?.trackPoints
  const waypoints = state.result?.waypoints
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDark = theme === 'dark'

  const chartData = useMemo(() => {
    if (!points || points.length < 2) return null
    const distances = points.map(p => p.cumulativeDistanceKm)
    const elevations = points.map(p => p.ele)
    const colors = points.map(p => gradientToChartColor(p.gradient))
    return { distances, elevations, colors }
  }, [points])

  useEffect(() => {
    if (!chartData || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

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

    // Background
    ctx.fillStyle = isDark ? '#1c1c1e' : '#ffffff'
    ctx.fillRect(0, 0, w, h)

    // Grid lines
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

    // Distance labels
    ctx.fillStyle = labelColor
    ctx.font = '10px monospace'
    for (let i = 0; i <= 4; i++) {
      const d = (maxDist / 4) * i
      const lx = x(d)
      ctx.fillText(`${d.toFixed(0)}km`, lx - 12, h - 4)
    }

    // Elevation line (segment-colored)
    ctx.lineWidth = 2
    for (let i = 1; i < distances.length; i++) {
      ctx.beginPath()
      ctx.moveTo(x(distances[i - 1]), y(elevations[i - 1]))
      ctx.lineTo(x(distances[i]), y(elevations[i]))
      ctx.strokeStyle = colors[i]
      ctx.stroke()
    }

    // Area fill
    ctx.beginPath()
    ctx.moveTo(x(distances[0]), y(minEle))
    for (let i = 0; i < distances.length; i++) {
      ctx.lineTo(x(distances[i]), y(elevations[i]))
    }
    ctx.lineTo(x(distances[distances.length - 1]), y(minEle))
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom)
    grad.addColorStop(0, 'rgba(255,0,255,0.15)')
    grad.addColorStop(0.5, 'rgba(0,255,255,0.08)')
    grad.addColorStop(1, 'rgba(0,255,255,0.02)')
    ctx.fillStyle = grad
    ctx.fill()

    // Waypoint markers on profile
    if (waypoints && waypoints.length > 0) {
      for (const wp of waypoints) {
        const wx = x(wp.distanceKm)
        let wpEle = elevations[0]
        for (let i = 0; i < distances.length; i++) {
          if (distances[i] >= wp.distanceKm) { wpEle = elevations[i]; break }
          wpEle = elevations[i]
        }
        const wy = y(wpEle)

        // Downward-pointing triangle marker
        const size = 5
        ctx.beginPath()
        ctx.moveTo(wx, wy - size)
        ctx.lineTo(wx - size * 0.7, wy - size * 2.2)
        ctx.lineTo(wx + size * 0.7, wy - size * 2.2)
        ctx.closePath()

        const hasGel = wp.items.some(i => i.type === 'gel')
        const hasSalt = wp.items.some(i => i.type === 'salt')
        ctx.fillStyle = hasSalt && !hasGel ? '#007aff' : '#ff00ff'
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.fill()
        ctx.stroke()
      }
    }

  }, [chartData, waypoints, isDark])

  if (!chartData) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📈</span>
        <span className="metric-label">海拔剖面图</span>
        {waypoints && waypoints.length > 0 && (
          <span className="text-[10px] text-[#aeaeb2] ml-auto">
            <span className="text-[#ff00ff]">▲补给×{waypoints.length}</span>
          </span>
        )}
      </div>
      <canvas ref={canvasRef} className="w-full" style={{ height: '150px' }} />
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#aeaeb2]">
        <span>上坡<strong className="text-[#ff00ff]"> 紫红</strong></span>
        <span>下坡<strong className="text-[#00ffff]"> 青蓝</strong></span>
        <span>平路<strong className="text-[#cccccc]"> 灰白</strong></span>
        <span className="ml-auto">▲ 补给航点</span>
      </div>
    </Card>
  )
}