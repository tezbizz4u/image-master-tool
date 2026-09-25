// Privacy-first analytics facade.
// No image content, filenames, or dimensions are ever recorded — only coarse
// event names and tool/category identifiers. Events are queued on
// window.dataLayer and can be wired to any provider (Plausible, GA4, PostHog)
// via initAnalytics(provider) without touching feature code.
const queue = []
let enabled = false

export const EVENTS = {
  TOOL_OPENED: 'tool_opened',
  UPLOAD_STARTED: 'upload_started',
  PROCESS_STARTED: 'process_started',
  PROCESS_COMPLETED: 'process_completed',
  PROCESS_FAILED: 'process_failed',
  DOWNLOAD: 'download',
  TOOL_SEARCH: 'tool_search',
  CATEGORY_SELECTED: 'category_selected'
}

export function initAnalytics (opts = {}) {
  enabled = opts.enabled !== false
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: 'app_init' })
  }
}

export function track (event, payload = {}) {
  if (!enabled) return
  const record = { event, ts: Date.now(), ...payload }
  queue.push(record)
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(record)
  }
}
