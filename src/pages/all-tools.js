// All tools + search page.
import { el } from '../core/utils.js'
import { TOOLS, searchTools, popularTools } from '../data/registry.js'
import { CATEGORIES } from '../data/categories.js'
import { toolGrid } from '../components/tool-card.js'

export default function allTools () {
  let activeCat = 'all'
  let query = ''

  const resultsWrap = el('div')
  const count = el('div', { class: 'muted' })

  const catChips = el('div', { class: 'row wrap mb-3' })
  const search = el('input', {
    class: 'input',
    type: 'search',
    placeholder: 'Search image tools… (name, format, or phrase like "remove bg")',
    style: { maxWidth: '520px' },
    'aria-label': 'Search tools',
    oninput: (e) => { query = e.target.value; render() }
  })

  function chip (cat) {
    const isActive = activeCat === cat.id
    return el('button', {
      class: `cat-chip${isActive ? ' on' : ''}`,
      style: isActive ? { borderColor: 'var(--brand)', color: 'var(--brand-600)' } : {},
      onclick: () => { activeCat = cat.id; renderChips(); render() }
    }, cat.name)
  }

  function renderChips () {
    catChips.replaceChildren(
      el('button', {
        class: 'cat-chip',
        style: activeCat === 'all' ? { borderColor: 'var(--brand)', color: 'var(--brand-600)' } : {},
        onclick: () => { activeCat = 'all'; renderChips(); render() }
      }, 'All'),
      CATEGORIES.map(c => chip(c))
    )
  }

  function render () {
    let list
    if (query.trim()) {
      list = searchTools(query, { limit: 60 })
    } else {
      list = activeCat === 'all' ? TOOLS : TOOLS.filter(t => t.category === activeCat)
    }
    count.textContent = `${list.length} tool${list.length === 1 ? '' : 's'}${query ? ` matching “${query}”` : ''}`
    resultsWrap.replaceChildren(
      list.length ? toolGrid(list) : el('div', { class: 'empty-state' },
        el('h3', { text: 'No tools found' }),
        el('p', { text: 'Try a different phrase — e.g. "compress", "crop", "webp" or "background".' })
      )
    )
  }

  renderChips()
  render()

  return el('div', { class: 'page container' },
    el('div', { class: 'page-head' },
      el('h1', { text: 'All image tools' }),
      el('p', { class: 'sub', text: 'Everything in one flat, searchable list — or filter by category.' })
    ),
    el('div', { class: 'field' }, search),
    catChips,
    count,
    el('div', { class: 'mt-2' }, resultsWrap)
  )
}
