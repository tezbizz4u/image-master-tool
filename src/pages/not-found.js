// 404 page.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { popularTools } from '../data/registry.js'
import { toolGrid } from '../components/tool-card.js'

export default function notFound () {
  return el('div', { class: 'page container' },
    el('div', { class: 'empty-state', style: { padding: '80px 20px' } },
      el('div', { class: 'es-icon' }, icon('search', 24)),
      el('h3', { text: 'Page not found' }),
      el('p', { text: 'That tool or page doesn\'t exist. It may have been renamed — try search or one of these popular tools.' }),
      el('div', { class: 'mt-3 row', style: { justifyContent: 'center' } },
        el('a', { class: 'btn btn-primary', href: '#/' }, 'Back to home'),
        el('a', { class: 'btn', href: '#/tools' }, 'Browse all tools')
      )
    ),
    el('section', { class: 'section container' }, toolGrid(popularTools().slice(0, 4)))
  )
}
