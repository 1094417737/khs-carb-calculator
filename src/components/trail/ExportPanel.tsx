import { useCallback } from 'react'
import { useTrail } from '../../hooks/useTrail'
import { generateGpx } from '../../engine/trail/export-gpx'
import { useAnalytics } from '../../hooks/useAnalytics'
import Card from '../layout/Card'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ExportPanel() {
  const { state, dispatch } = useTrail()
  const { trackDownload } = useAnalytics()
  const result = state.result
  const waypoints = result?.waypoints ?? []
  const rawPoints = state.trackPoints
  const safeMode = state.safeMode
  const customMarkers = state.customMarkers

  const handleGpx = useCallback(() => {
    if (rawPoints.length === 0) return
    const xml = generateGpx(rawPoints, waypoints, safeMode, customMarkers, state.rawGpxText)
    download('trail_nutrition.gpx', xml, 'application/gpx+xml')
    trackDownload('gpx', waypoints.length)
  }, [rawPoints, waypoints, safeMode, customMarkers, state.rawGpxText, trackDownload])

  if (!result || rawPoints.length === 0) return null

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📥</span>
        <span className="metric-label">导出到手表</span>
      </div>

      {/* Safe mode toggle — 手机端加大触摸区 */}
      <label className="flex items-center gap-3 mb-3 px-3 py-3 sm:py-2.5 rounded-lg bg-[#f5f5f7] dark:bg-[#2c2c2e] cursor-pointer active:bg-[#e8e8ed] dark:active:bg-[#3a3a3c] transition-colors">
        <input
          type="checkbox"
          checked={state.safeMode}
          onChange={e => dispatch({ type: 'SET_SAFE_MODE', enabled: e.target.checked })}
          className="w-4 h-4 accent-accent-500 shrink-0"
        />
        <div>
          <span className="text-sm text-[#1d1d1f] dark:text-white">英文安全航点名</span>
          <span className="text-[11px] text-[#aeaeb2] ml-2">防乱码</span>
        </div>
      </label>

      {/* Waypoint counter */}
      {(() => {
        const total = waypoints.length + customMarkers.length
        const isWarn = total > 100
        const isCaution = total > 50
        return (
          <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
            isWarn ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400' :
            isCaution ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 text-yellow-600 dark:text-yellow-500' :
            'bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] dark:text-[#8e8e93]'
          }`}>
            <span className="font-semibold">
              {isWarn ? '🔴' : isCaution ? '🟡' : '📍'} 航点总数：{total}
              <span className="font-normal ml-1">({waypoints.length} 补给 + {customMarkers.length} 自定义)</span>
            </span>
            {isWarn && <p className="mt-0.5 font-medium">航点已超百，请注意设备兼容上限！</p>}
            {isCaution && !isWarn && <p className="mt-0.5">航点较多，部分旧款设备可能截断提示</p>}
          </div>
        )
      })()}

      <div className="space-y-2">
        <button
          type="button" onClick={handleGpx} disabled={rawPoints.length === 0}
          className="w-full h-12 rounded-xl bg-accent-500 text-white text-sm sm:text-base font-medium hover:bg-accent-600 transition-colors disabled:opacity-40 active:scale-[0.98]"
        >导出 GPX</button>
        <p className="text-[11px] sm:text-xs text-[#aeaeb2] -mt-1">支持佳明 (Garmin)、高驰 (Coros)、颂拓 (Suunto) 及各类带导航功能的手表通用</p>
      </div>
    </Card>
  )
}