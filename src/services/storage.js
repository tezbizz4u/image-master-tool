// Local storage service. Stores only user preferences and small design
// presets (e.g. saved watermarks). Never image content.

const PREFIX = 'imt.'

export function getItem (key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch { return fallback }
}

export function setItem (key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* quota/private */ }
}

export function removeItem (key) {
  try { localStorage.removeItem(PREFIX + key) } catch { /* noop */ }
}

export function getWatermarks () {
  return getItem('watermarks', [])
}

export function saveWatermark (design) {
  const list = getWatermarks()
  const withId = { ...design, id: Math.random().toString(36).slice(2, 9) }
  setItem('watermarks', [withId, ...list].slice(0, 20))
  return withId
}

export function deleteWatermark (id) {
  setItem('watermarks', getWatermarks().filter(w => w.id !== id))
}
