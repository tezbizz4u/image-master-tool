// Site header: brand, category nav, search trigger, theme toggle.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { store, applyTheme } from '../core/store.js'
import { CATEGORIES } from '../data/categories.js'
import { navigate } from '../core/router.js'

export function createHeader () {
  const themeBtn = el('button', {
    class: 'icon-btn',
    'aria-label': 'Toggle dark mode',
    title: 'Toggle dark mode',
    onclick: () => store.toggleTheme()
  })

  function paintTheme () {
    applyTheme(store.state.theme)
    themeBtn.replaceChildren(icon(store.state.theme === 'dark' ? 'sun' : 'moon', 17))
  }
  store.subscribe(() => paintTheme())
  paintTheme()

  const brand = el('a', { href: '#/', class: 'brand', 'aria-label': 'Image Master Tool home' },
    el('span', { class: 'brand-mark', html: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5 9.2 10l3 4.4 2.3-2.9L19 16.5z"/><circle cx="9" cy="7.5" r="1.8"/></svg>' }),
    el('span', {}, 'IMAGE MASTER', el('span', { class: 'sub', text: ' TOOL' }))
  )

  const nav = el('nav', { class: 'nav-links', 'aria-label': 'Categories' })
  const navMap = {}
  for (const cat of CATEGORIES.slice(0, 6)) {
    const a = el('a', { href: `#/c/${cat.id}`, text: cat.name.replace(' & ', ' & ') })
    navMap[cat.id] = a
    nav.append(a)
  }

  const searchBtn = el('button', { class: 'search-btn', 'aria-label': 'Search tools' },
    icon('search', 15),
    el('span', { text: 'Search image tools…' }),
    el('span', { class: 'kbd', text: '/' })
  )
  searchBtn.addEventListener('click', () => import('./search.js').then(m => m.openSearch()))

  const header = el('header', { class: 'imt-header' },
    el('div', { class: 'imt-header-inner' },
      brand,
      nav,
      el('div', { class: 'header-actions' },
        searchBtn,
        el('button', { class: 'btn btn-primary btn-sm', onclick: () => navigate('/tools') }, 'All tools'),
        themeBtn
      )
    )
  )

  header.setActive = (categoryId) => {
    Object.entries(navMap).forEach(([id, a]) => a.classList.toggle('active', id === categoryId))
  }
  return header
}
