export interface AnalyticsEvent {
  category: string
  action: string
  label?: string
  value?: number
  timestamp: number
}

const STORAGE_KEY = 'trail_analytics'
const MAX_EVENTS = 500

export function trackEvent(category: string, action: string, label?: string, value?: number) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const events: AnalyticsEvent[] = raw ? JSON.parse(raw) : []
    events.push({ category, action, label, value, timestamp: Date.now() })
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch { /* ignore */ }
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function clearAnalyticsEvents() {
  localStorage.removeItem(STORAGE_KEY)
}
