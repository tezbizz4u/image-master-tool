// Hash-based router. Each route lazily imports its page module (code
// splitting), so heavy tools never load until needed.

const routes = []
let notFoundHandler = () => {}

export function route (pattern, loader) {
  // pattern like '/t/:slug'
  const keys = []
  const regex = new RegExp('^' + pattern.replace(/\/:([^/]+)/g, (_, k) => { keys.push(k); return '/([^/]+)' }) + '/?$')
  routes.push({ regex, keys, loader })
}

export function setNotFound (loader) {
  notFoundHandler = loader
}

export function navigate (path) {
  location.hash = '#' + path
}

export function currentPath () {
  const h = location.hash.replace(/^#/, '')
  return h === '' ? '/' : h
}

let renderToken = 0
let cleanup = null

export async function render (container) {
  const path = currentPath()
  const token = ++renderToken

  if (cleanup) { try { cleanup() } catch { /* noop */ } cleanup = null }

  let match = null
  let params = {}
  for (const r of routes) {
    const m = path.match(r.regex)
    if (m) {
      match = r
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]) })
      break
    }
  }

  const pageResult = match ? await match.loader(params) : await notFoundHandler(params)
  if (token !== renderToken) return // superseded while loading

  container.replaceChildren()

  // Loaders may return: a module namespace with default/named exports, or a
  // resolved { root, cleanup } object (async page builders).
  let node = null
  let cleanupFn = null
  if (pageResult && pageResult.root instanceof Node) {
    node = pageResult.root
    cleanupFn = pageResult.cleanup || node.cleanup || null
  } else {
    const view = pageResult?.default ?? pageResult
    node = typeof view === 'function' ? view(params, container) : view
    cleanupFn = pageResult?.cleanup || node?.cleanup || null
  }

  if (node instanceof Node) container.append(node)
  else if (import.meta.env.DEV) console.error('Route returned a non-DOM value', node)

  cleanup = cleanupFn
  window.scrollTo(0, 0)
}

export function start (container) {
  window.addEventListener('hashchange', () => render(container))
  render(container)
}
