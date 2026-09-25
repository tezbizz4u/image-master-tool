// Tool card — consistent across every listing.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { getCategory } from '../data/categories.js'

export function toolCard (tool, { showCategory = true } = {}) {
  const cat = getCategory(tool.category)
  const badges = []
  if (tool.status === 'ai') badges.push(el('span', { class: 'badge ai', text: 'AI' }))
  if (tool.popular) badges.push(el('span', { class: 'badge pop', text: 'POPULAR' }))
  if (tool.batch) badges.push(el('span', { class: 'badge batch', text: 'BATCH' }))
  const head = el('div', { class: 'card-head' }, el('h3', { text: tool.name }))
  if (badges.length) head.append(el('div', { class: 'tool-badges' }, badges))
  return el('a', { class: 'tool-card', href: `#/t/${tool.slug}`, 'aria-label': tool.name },
    el('span', { class: 'tool-icon' }, icon(tool.icon, 19)),
    el('div', { class: 'grow' },
      head,
      el('p', { text: tool.desc }),
      showCategory && el('div', { class: 'card-ctx', text: cat ? cat.name : '' })
    )
  )
}

export function toolGrid (tools, opts) {
  return el('div', { class: 'tool-grid' }, tools.map(t => toolCard(t, opts)))
}
