// Lightweight reactive store. Only non-sensitive preferences are persisted
// (theme, favorite tools, recently used tools). No image data ever goes here.
const LS_KEYS = {
  theme: 'imt.theme',
  favorites: 'imt.favorites',
  recent: 'imt.recent',
  locale: 'imt.locale'
}

function readLS (key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch { return fallback }
}

function writeLS (key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
}

export const store = {
  state: {
    theme: readLS('imt.theme', null) ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    favorites: readLS('imt.favorites', []),
    recent: readLS('imt.recent', []),
    locale: readLS('imt.locale', 'en')
  },
  listeners: new Set(),

  set (key, value) {
    this.state[key] = value
    if (key === 'theme') writeLS('imt.theme', value)
    if (key === 'locale') writeLS('imt.locale', value)
    this.emit()
  },

  emit () {
    for (const fn of this.listeners) fn(this.state)
  },

  subscribe (fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) },

  toggleTheme () {
    this.set('theme', this.state.theme === 'dark' ? 'light' : 'dark')
  },

  toggleFavorite (slug) {
    const f = this.state.favorites.includes(slug)
      ? this.state.favorites.filter(s => s !== slug)
      : [...this.state.favorites, slug]
    this.set('favorites', f)
  },

  pushRecent (slug) {
    const r = [slug, ...this.state.recent.filter(s => s !== slug)].slice(0, 8)
    this.set('recent', r)
  }
}

export function applyTheme (theme) {
  document.documentElement.dataset.theme = theme
}
