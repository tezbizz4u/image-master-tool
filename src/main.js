// App bootstrap.
import './styles/main.css'
import { applyTheme, store } from './core/store.js'
import { initAnalytics } from './core/analytics.js'
import { route, setNotFound, start, currentPath } from './core/router.js'
import { createHeader } from './components/header.js'
import { createFooter } from './components/footer.js'
import { openSearch } from './components/search.js'

applyTheme(store.state.theme)
store.subscribe(() => applyTheme(store.state.theme))
initAnalytics({ enabled: false }) // flip to true when wiring a provider

const app = document.getElementById('app')

const header = createHeader()
const main = document.createElement('main')
const footer = createFooter()
app.append(header, main, footer)

// ---------- Routes ----------
route('/', () => import('./pages/home.js'))
route('/tools', () => import('./pages/all-tools.js'))
route('/c/:category', (p) => import('./pages/category.js').then(m => m.categoryPage(p.category)))
route('/t/:slug', (p) => import('./pages/tool-page.js').then(m => m.toolPage(p.slug)))
route('/editor', () => import('./editor/editor.js'))
setNotFound(() => import('./pages/not-found.js'))

start(main)

// '/' key focuses search
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault()
    openSearch()
  }
})

// Update nav active state on navigation
window.addEventListener('hashchange', () => {
  const path = currentPath()
  const m = path.match(/^\/c\/([\w-]+)/)
  header.setActive(m ? m[1] : '')
})

export { store }
