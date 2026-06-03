import { useState } from 'react'
import { useTrail } from '../../hooks/useTrail'
import Card from '../layout/Card'

export default function WaypointList() {
  const { state, dispatch } = useTrail()
  const allWaypoints = state.result?.waypoints ?? []
  const trackPoints = state.result?.trackPoints ?? state.trackPoints
  const [filter, setFilter] = useState<'all' | 'gel' | 'salt'>('all')

  const waypoints = filter === 'all'
    ? allWaypoints
    : allWaypoints.filter(wp => wp.items.some(i => i.type === filter))

  function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h${m}m` : `${m}min`
  }

  return (
    <Card padding="md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📍</span>
        <span className="metric-label">补给航点 ({waypoints.length})</span>
        {state.result && (
          <span className="text-[10px] text-[#aeaeb2] dark:text-[#636366] ml-auto">
            {state.result.kcalPerHour}kcal/h · {state.result.carbsGPerHour}g/h · {state.result.sodiumMgPerHour}mg/h
          </span>
        )}
      </div>

      {/* Filter pills */}
      {allWaypoints.length > 0 && (
        <div className="flex gap-1.5 mb-2">
          {([
            ['all', '全部'],
            ['gel', '⚡ 能量胶'],
            ['salt', '💧 盐丸'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                filter === key
                  ? 'bg-accent-500 text-white'
                  : 'bg-[#e8e8ed] dark:bg-[#3a3a3c] text-[#86868b] dark:text-[#8e8e93]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {waypoints.length === 0 ? (
        <p className="text-xs text-[#aeaeb2] py-2">
          {allWaypoints.length > 0
            ? '当前筛选条件下无匹配航点'
            : state.nutritionLibrary.length === 0
            ? '请先在「自定义补给库」中添加补给品，系统将自动生成补给航点。'
            : '暂无补给点。尝试调整目标完赛时间或补给库设置。'}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {waypoints.map(wp => (
            <div
              key={wp.id}
              className={`px-3 py-2.5 rounded-xl ${
                wp.isCatchUp
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-dashed border-amber-300'
                  : 'bg-[#f5f5f7] dark:bg-[#2c2c2e]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-accent-600 dark:text-accent-400">
                      {wp.distanceKm.toFixed(1)}km
                    </span>
                    <span className="text-[10px] text-[#aeaeb2]">
                      ETA {formatTime(wp.timeMinutes)}
                    </span>
                    <span className="text-[10px] text-[#86868b] dark:text-[#8e8e93]">
                      海拔:{trackPoints[wp.trackPointIndex]?.ele?.toFixed(0) ?? '—'}m
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {wp.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-1 text-xs text-[#1d1d1f] dark:text-white">
                        <span>{item.itemName}</span>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'UPDATE_WAYPOINT_ITEM', wpId: wp.id, itemId: item.itemId, delta: -1 })}
                          className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-full bg-[#e8e8ed] dark:bg-[#3a3a3c] flex items-center justify-center text-xs text-[#86868b] hover:bg-red-100 hover:text-red-500 active:scale-90 shrink-0 transition-transform"
                        >−</button>
                        <strong className="text-accent-600 dark:text-accent-400 min-w-[16px] text-center text-sm">x{item.quantity}</strong>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'UPDATE_WAYPOINT_ITEM', wpId: wp.id, itemId: item.itemId, delta: 1 })}
                          className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-full bg-[#e8e8ed] dark:bg-[#3a3a3c] flex items-center justify-center text-xs text-[#86868b] hover:bg-green-100 hover:text-green-500 active:scale-90 shrink-0 transition-transform"
                        >+</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_WAYPOINT', id: wp.id })}
                  className="min-w-[36px] min-h-[36px] rounded-full bg-[#e8e8ed] dark:bg-[#3a3a3c] flex items-center justify-center text-sm text-[#86868b] hover:bg-red-100 hover:text-red-500 active:scale-90 transition-all shrink-0 mt-0.5"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 智能补给策略说明 v3.1 */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
        <div className="px-3 py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40">
          <p className="text-[11px] leading-relaxed text-yellow-700 dark:text-yellow-400 font-medium">
            ⚠️ 智能补给策略说明 v3.1
          </p>
          <p className="text-[10px] leading-relaxed text-yellow-600 dark:text-yellow-500 mt-1">
            🏁 <strong>CP 点智能感知扣减：</strong>算法已融合官方补给站感知逻辑。当轨迹经过标记为大站（换装点）时，系统自动将累积消耗缺口扣减至 <strong>45%</strong>（即选手在 CP 大站充分补给后仅需随身携带原缺口 45% 的物资）；经过简易水站时扣减至 <strong>80%</strong>。扣减后的缺口从 CP 点重新开始累积，确保后续航点的补给推荐量精准反映实际需求。
          </p>
        </div>
      </div>
    </Card>
  )
}