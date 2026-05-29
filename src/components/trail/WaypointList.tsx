import { useTrail } from '../../hooks/useTrail'
import Card from '../layout/Card'

export default function WaypointList() {
  const { state, dispatch } = useTrail()
  const waypoints = state.result?.waypoints ?? []

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

      {waypoints.length === 0 ? (
        <p className="text-xs text-[#aeaeb2] py-2">
          {state.nutritionLibrary.length === 0
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
                  </div>
                  <div className="space-y-0.5">
                    {wp.items.map((item, j) => (
                      <div key={j} className="text-xs text-[#1d1d1f] dark:text-white">
                        {item.itemName} <strong className="text-accent-600 dark:text-accent-400">x{item.quantity}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_WAYPOINT', id: wp.id })}
                  className="min-w-[32px] min-h-[32px] rounded-full bg-[#e8e8ed] dark:bg-[#3a3a3c] flex items-center justify-center text-sm text-[#86868b] hover:bg-red-100 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 实战补给提示 */}
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/10">
        <div className="px-3 py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40">
          <p className="text-[11px] leading-relaxed text-yellow-700 dark:text-yellow-400 font-medium">
            ⚠️ 实战补给提示
          </p>
          <p className="text-[10px] leading-relaxed text-yellow-600 dark:text-yellow-500 mt-1">
            本计算器输出的为完赛所需的理论总补给量，算法并未将赛道官方 CP 点的补给计算在内。
            实际比赛中，请务必提前查阅官方路书，结合自己在各 CP 点的进食计划（如热食、水果、饮料等提供的大量卡路里），自行灵活扣减需要随身携带的能量胶与盐丸数量，做好强制装备与负重的平衡。
          </p>
        </div>
      </div>
    </Card>
  )
}