import { useEffect } from 'react'
import { useTrail } from '../../hooks/useTrail'
import { useAnalytics } from '../../hooks/useAnalytics'
import GpxUploader from './GpxUploader'
import UserProfilePanel from './UserProfilePanel'
import NutritionLibraryPanel from './NutritionLibraryPanel'
import MapView from './MapView'
import ElevationProfile from './ElevationProfile'
import PaceStrategy from './PaceStrategy'
import GradientBreakdown from './GradientBreakdown'
import WaypointList from './WaypointList'
import ExportPanel from './ExportPanel'

export default function TrailModule() {
  const { state } = useTrail()
  const { trackPageView } = useAnalytics()

  useEffect(() => { trackPageView('trail-planner') }, [])

  // Step 1: Upload
  if (!state.trackPoints || state.trackPoints.length < 2) {
    return (
      <div className="max-w-md mx-auto px-4 pt-4">
        <GpxUploader />
      </div>
    )
  }

  // Step 2: Results
  return (
    <div className="space-y-4 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#1d1d1f] dark:text-white truncate max-w-[200px]">{state.gpxFileName}</span>
          <span className="text-[11px] text-[#aeaeb2] dark:text-[#636366] shrink-0">
            {state.result?.totalDistanceKm.toFixed(1)}km · {state.trackPoints.length} 点
          </span>
        </div>
      </div>

      {/* User Profile + Nutrition Library — stack on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1"><UserProfilePanel /></div>
        <div className="flex-1"><NutritionLibraryPanel /></div>
      </div>

      {/* Map — 手机端硬核高度 280-320px，桌面端自适应 420px */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 'clamp(280px, 55vw, 420px)' }}>
        <MapView />
      </div>

      <ElevationProfile />
      {/* PaceStrategy + GradientBreakdown — side-by-side desktop, stacked mobile */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1"><PaceStrategy /></div>
        <div className="lg:w-56 shrink-0"><GradientBreakdown /></div>
      </div>

      {/* WaypointList + ExportPanel — stack on mobile, ExportPanel 吸底 */}
      <div className="flex flex-col lg:flex-row gap-4 pb-6 sm:pb-0">
        <div className="flex-1"><WaypointList /></div>
        <div className="lg:w-64 shrink-0 sm:sticky sm:bottom-4 sm:self-end"><ExportPanel /></div>
      </div>
    </div>
  )
}