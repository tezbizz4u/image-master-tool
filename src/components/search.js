// Global tool search overlay. Synonym-aware, typo-tolerant, keyboard navigable.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { searchTools, TOOLS, getTool } from '../data/registry.js'
import { store } from '../core/store.js'
import { track, EVENTS } from '../core/analytics.js'

let overlay = null

export function openSearch (initialQuery = '') {
  if (overlay) { overlay.querySelector('input').focus(); return }
  const input = el('input', {
    type: 'text',
    placeholder: 'Search image tools…  (try "compress", "remove bg", "make image smaller")',
    'aria-label': 'Search image tools',
    value: initialQuery
  })
  const results = el('div', { class: 'search-results', role: 'listbox' })
  const panel = el('div', { class: 'search-panel', role: 'dialog', 'aria-label': 'Tool search' }, input, results)
  overlay = el('div', { class: 'search-overlay' }, panel)
  document.getElementById('modal-root').append(overlay)

  let sel = -1
  let current = []

  function renderResults () {
    const q = input.value.trim()
    sel = -1
    current = q ? searchTools(q, { limit: 10 }) : defaultSuggestions()
    results.replaceChildren()

    const groups = new Map()
    for (const t of current) {
      const g = q ? 'Results' : (store.state.favorites.includes(t.slug) ? 'Favorites' : 'Popular')
      if (!groups.has(g)) groups.set(g, [])
      groups.get(g).push(t)
    }
    for (const [g, tools] of groups) {
      results.append(el('div', { class: 'sr-group', text: g }))
      for (const t of tools) {
        results.append(el('a', { class: 'sr-item', href: `#/t/${t.slug}` },
          el('span', { class: 'tool-icon', html: '' }, icon(t.icon, 16)),
          el('div', {}, el('b', { text: t.name }), el('span', { text: t.desc }))
        ))
      }
    }
    if (!current.length) {
      results.append(el('div', { class: 'sr-empty', text: `No tools match “${q}”. Try "resize", "convert" or "compress".` }))
    }
  }

  function defaultSuggestions () {
    const favs = store.state.favorites.map(getTool).filter(Boolean)
    const recents = store.state.recent.map(getTool).filter(Boolean)
    const pop = TOOLS.filter(t => t.popular).slice(0, 8)
    const seen = new Set()
    return [...favs, ...recents, ...pop].filter(t => !seen.has(t.slug) && seen.add(t.slug)).slice(0, 9)
  }

  input.addEventListener('input', () => {
    renderResults()
    if (input.value.trim().length > 1) track(EVENTS.TOOL_SEARCH, { q: input.value.trim().slice(0, 32) })
  })
  input.addEventListener('keydown', (e) => {
    const items = [...results.querySelectorAll('.sr-item')]
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      sel = e.key === 'ArrowDown' ? Math.min(items.length - 1, sel + 1) : Math.max(0, sel - 1)
      items.forEach((it, i) => it.classList.toggle('sel', i === sel))
      items[sel]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      const target = items[Math.max(0, sel)]
      if (target) { target.click(); close() }
    }
  })

  function close () {
    overlay?.remove()
    overlay = null
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  document.addEventListener('keydown', function esc (e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc) }
  })

  renderResults()
  input.focus()
  // Close when a result is clicked (navigation happens via hash)
  results.addEventListener('click', () => setTimeout(close, 60))
}
