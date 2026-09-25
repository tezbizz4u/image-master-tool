// Site footer.
import { el } from '../core/utils.js'
import { CATEGORIES } from '../data/categories.js'
import { TOOLS, popularTools, toolsByCategory } from '../data/registry.js'

export function createFooter () {
  const cols = CATEGORIES.slice(0, 4).map(cat => (
    el('div', {},
      el('h4', { text: cat.name }),
      toolsByCategory(cat.id).slice(0, 6).map(t => el('a', { href: `#/t/${t.slug}`, text: t.name }))
    )
  ))

  return el('footer', { class: 'imt-footer' },
    el('div', { class: 'imt-footer-inner' },
      el('div', { class: 'footer-grid' },
        el('div', {},
          el('h4', { text: 'IMAGE MASTER TOOL' }),
          el('p', { class: 'muted', text: 'Every image tool you need — editor, converters, compression, effects and more. Free, fast, and processed entirely in your browser.' }),
          el('p', { class: 'muted mt-2' }, '🔒 No signup. No uploads. Your images never leave your device.')
        ),
        ...cols,
        el('div', {},
          el('h4', { text: 'Popular' }),
          popularTools().slice(0, 6).map(t => el('a', { href: `#/t/${t.slug}`, text: t.name }))
        )
      ),
      el('div', { class: 'footer-bottom' },
        el('span', { text: `© ${new Date().getFullYear()} IMAGE MASTER TOOL — ${TOOLS.length} tools and counting.` }),
        el('span', { text: 'All processing happens locally in your browser.' })
      )
    )
  )
}
