// Category page.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { getCategory, CATEGORIES } from '../data/categories.js'
import { toolsByCategory } from '../data/registry.js'
import { toolGrid } from '../components/tool-card.js'

export function categoryPage (categoryId) {
  const cat = getCategory(categoryId)
  if (!cat) return import('./not-found.js')

  const tools = toolsByCategory(categoryId)

  return el('div', { class: 'page container' },
    el('nav', { class: 'breadcrumbs', 'aria-label': 'Breadcrumb' },
      el('a', { href: '#/', text: 'Home' }), el('span', { class: 'sep', text: '›' }), el('span', { text: cat.name })
    ),
    el('div', { class: 'cat-hero' },
      el('div', { class: 'cat-icon-lg' }, icon(cat.icon, 26)),
      el('h1', { text: cat.name }),
      el('p', { text: cat.blurb })
    ),
    el('section', { class: 'section' },
      toolGrid(tools)
    ),
    el('section', { class: 'section' },
      el('div', { class: 'section-head' }, el('h2', { text: 'Other categories' })),
      el('div', { class: 'row wrap' },
        CATEGORIES.filter(c => c.id !== categoryId).map(c =>
          el('a', { class: 'cat-chip', href: `#/c/${c.id}` }, c.name))
      )
    )
  )
}

export default function categoryRoute (params) {
  return categoryPage(params.category)
}
