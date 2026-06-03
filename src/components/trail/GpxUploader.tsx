import { useState, useRef, useCallback } from 'react'
import { useTrail } from '../../hooks/useTrail'
import { parseFile } from '../../utils/parseActivity'
import { useAnalytics } from '../../hooks/useAnalytics'
import Card from '../layout/Card'
import DeviceGuideModal from '../vip/DeviceGuideModal'

const MAX_SIZE = 10 * 1024 * 1024
const MIN_POINTS = 2

export default function GpxUploader() {
  const { dispatch } = useTrail()
  const { trackUpload } = useAnalytics()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)

  const processFile = useCallback(async (file: File) => {
    setError('')
    if (file.size > MAX_SIZE) { setError('文件超过 10MB 限制'); return }

    const ext = file.name.toLowerCase().split('.').pop()
    if (!ext || !['gpx', 'fit', 'kml', 'kmz'].includes(ext)) {
      setError('仅支持 .gpx, .fit, .kml, .kmz 格式'); return
    }

    setParsing(true)
    try {
      const { points, rawText, importedMarkers } = await parseFile(file)
      if (points.length < MIN_POINTS) {
        setError(`轨迹点过少（${points.length}个），无法进行有效计算。请上传包含至少${MIN_POINTS}个轨迹点的标准越野跑 GPX/FIT 文件。`)
        return
      }
      dispatch({ type: 'SET_TRACK_POINTS', fileName: file.name, points, rawGpxText: rawText, importedMarkers })
      trackUpload(file.name, file.size)
    } catch (e: any) {
      setError(e?.message || '文件解析失败，请检查文件完整性')
    } finally {
      setParsing(false)
    }
  }, [dispatch, trackUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    Array.from(e.dataTransfer.files).forEach(f => processFile(f))
  }, [processFile])

  return (
    <>
      <Card padding="md">
        <h2 className="text-sm font-semibold text-[#1d1d1f] dark:text-white mb-3">
          Trail 轨迹智能补给规划
        </h2>

        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-accent-500/30 dark:border-accent-500/20 rounded-2xl p-8 text-center cursor-pointer hover:border-accent-500/60 transition-colors"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".gpx,.fit,.kml,.kmz"
            className="hidden"
            onChange={e => {
              Array.from(e.target.files || []).forEach(f => processFile(f))
              e.target.value = ''
            }}
          />
          <div className="text-3xl mb-2">🗺</div>
          <div className="text-sm font-medium text-[#1d1d1f] dark:text-white mb-1">
            {parsing ? '解析中...' : '上传 GPX / FIT / KML / KMZ 轨迹文件'}
          </div>
          <div className="text-xs text-[#aeaeb2] dark:text-[#636366]">
            拖拽文件到此处或点击上传 · 支持 GPX/FIT/KML/KMZ · 最大 10MB
          </div>
        </div>

        <p className="mt-2 text-[10px] text-[#aeaeb2] dark:text-[#636366] text-center">
          目前仅支持标准的 GPX、FIT、KML、KMZ 格式越野跑轨迹文件（≥ 10 个轨迹点）
        </p>

        {error && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#f5f5f7] dark:bg-[#2c2c2e] text-sm text-[#86868b] dark:text-[#8e8e93] hover:text-[#1d1d1f] dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          如何从运动手表导出 GPX/FIT 文件？
        </button>
      </Card>

      <DeviceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  )
}