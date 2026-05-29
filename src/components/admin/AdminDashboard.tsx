import { useState, useEffect } from 'react'
import { getAnalyticsEvents, clearAnalyticsEvents, type AnalyticsEvent } from '../../utils/analytics'

export default function AdminDashboard() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [cleared, setCleared] = useState(false)

  useEffect(() => {
    setEvents(getAnalyticsEvents())
  }, [])

  const pageviews = events.filter(e => e.category === 'pageview').length
  const uploads = events.filter(e => e.category === 'upload').length
  const downloads = events.filter(e => e.category === 'download').length

  const gpxDownloads = events.filter(e => e.category === 'download' && e.action === 'gpx').length
  const tcxDownloads = events.filter(e => e.category === 'download' && e.action === 'tcx').length

  function handleClear() {
    clearAnalyticsEvents()
    setEvents([])
    setCleared(true)
    setTimeout(() => setCleared(false), 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1d1d1f] dark:text-white">数据监测面板</h1>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
        >
          {cleared ? '已清除' : '清除数据'}
        </button>
      </div>

      {/* 总览 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e]">
          <div className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">页面访问</div>
          <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">{pageviews}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e]">
          <div className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">GPX 上传</div>
          <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">{uploads}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e]">
          <div className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">总下载</div>
          <div className="text-2xl font-bold text-[#1d1d1f] dark:text-white">{downloads}</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e]">
          <div className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">格式比例</div>
          <div className="text-sm text-[#1d1d1f] dark:text-white">
            <span>GPX {gpxDownloads}</span>
            <span className="text-[#aeaeb2] mx-1">|</span>
            <span>TCX {tcxDownloads}</span>
          </div>
        </div>
      </div>

      {/* 事件明细 */}
      <div className="rounded-2xl bg-[#f5f5f7] dark:bg-[#2c2c2e] p-4">
        <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">
          事件记录 ({events.length})
        </h2>
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {events.length === 0 ? (
            <p className="text-xs text-[#aeaeb2] py-4 text-center">暂无事件</p>
          ) : (
            events.slice().reverse().map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-black/5 dark:border-white/5 last:border-0">
                <span className="w-16 shrink-0 text-[10px] text-[#aeaeb2] font-mono">
                  {new Date(e.timestamp).toLocaleTimeString('zh-CN')}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400">
                  {e.category}
                </span>
                <span className="text-[#86868b]">{e.action}</span>
                {e.label && <span className="text-[#aeaeb2] truncate max-w-[140px]">{e.label}</span>}
                {e.value != null && <span className="text-[#aeaeb2] font-mono">{e.value}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
