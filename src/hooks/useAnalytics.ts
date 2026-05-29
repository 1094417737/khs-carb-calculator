import { useCallback } from 'react'
import { trackEvent } from '../utils/analytics'

export function useAnalytics() {
  const trackPageView = useCallback((page: string) => {
    trackEvent('pageview', page)
  }, [])

  const trackUpload = useCallback((fileName: string, fileSize: number) => {
    trackEvent('upload', 'gpx', fileName, fileSize)
  }, [])

  const trackDownload = useCallback((format: 'gpx' | 'tcx', waypointCount: number) => {
    trackEvent('download', format, undefined, waypointCount)
  }, [])

  const trackConfig = useCallback((key: string, value: string) => {
    trackEvent('config', key, value)
  }, [])

  return { trackPageView, trackUpload, trackDownload, trackConfig }
}
