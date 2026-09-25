// Universal tool page. Renders the shared chrome (title, privacy note,
// related tools, SEO copy) and mounts the specific tool implementation.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { getTool, relatedTools } from '../data/registry.js'
import { getCategory } from '../data/categories.js'
import { toolCard } from '../components/tool-card.js'
import { store } from '../core/store.js'
import { track, EVENTS } from '../core/analytics.js'

export async function toolPage (slug) {
  const tool = getTool(slug)
  if (!tool) return import('./not-found.js')

  track(EVENTS.TOOL_OPENED, { slug })
  store.pushRecent(slug)

  const cat = getCategory(tool.category)
  const related = relatedTools(tool, 4)

  // AI tools get a dedicated honest panel.
  if (tool.status === 'ai') {
    const mod = await import('../tools/ai-tools.js')
    const root = el('div', { class: 'page container' })
    root.append(aiHeader(tool, cat), mod.aiToolPanel(tool), seoSection(tool), relatedSection(related), faq(tool))
    return { root, cleanup: mod.cleanup }
  }

  // Load the tool implementation for its category (or a per-tool override).
  const mod = await loadToolModule(tool.category, slug)
  const impl = mod.TOOL_IMPLS?.[slug]

  const root = el('div', { class: 'page container' })
  const mount = el('div', { class: 'tool-mount' })
  const favBtn = el('button', { class: 'btn btn-sm', title: 'Save to favorites' }, icon('star', 15), 'Favorite')
  const paintFav = () => {
    const on = store.state.favorites.includes(slug)
    favBtn.classList.toggle('btn-soft', on)
    favBtn.childNodes[1].textContent = on ? 'Favorited' : 'Favorite'
  }
  favBtn.addEventListener('click', () => { store.toggleFavorite(slug); paintFav() })

  root.append(
    el('nav', { class: 'breadcrumbs', 'aria-label': 'Breadcrumb' },
      el('a', { href: '#/', text: 'Home' }),
      el('span', { class: 'sep', text: '›' }),
      el('a', { href: `#/c/${tool.category}`, text: cat?.name || '' }),
      el('span', { class: 'sep', text: '›' }),
      el('span', { text: tool.name })
    ),
    el('div', { class: 'page-head' },
      el('div', { class: 'row between' },
        el('div', {},
          el('h1', { text: tool.name }),
          el('p', { class: 'sub', text: tool.long?.split('. ')[0] || tool.desc })
        ),
        favBtn
      )
    ),
    mount
  )

  const mounted = impl ? impl({ tool, root }) : null
  if (mounted) mount.append(mounted)
  else if (impl) mount.append(el('div', { class: 'error-box', text: `This tool failed to load its interface. Reload the page — if it persists, the tool is temporarily unavailable.` }))
  else mount.append(el('div', { class: 'error-box', text: `The "${tool.name}" implementation is not available yet. Pick a related tool below meanwhile.` }))

  root.append(
    seoSection(tool),
    howItWorks(tool),
    relatedSection(related),
    faq(tool)
  )

  return { root }
}

function aiHeader (tool, cat) {
  return el('div', { class: 'page-head' },
    el('h1', { text: tool.name }),
    el('p', { class: 'sub', text: tool.long })
  )
}

function seoSection (tool) {
  return el('section', { class: 'section', style: { maxWidth: '780px' } },
    el('h2', { text: `About ${tool.name}` }),
    el('p', { class: 'muted mt-2', text: tool.long || tool.desc }),
    el('div', { class: 'privacy-strip mt-3' }, icon('shield', 16), tool.status === 'ai'
      ? 'This AI tool requires a connected model backend. Without one it stays clearly disabled — we never simulate results.'
      : 'This tool runs entirely in your browser. Your image is never uploaded.')
  )
}

function howItWorks (tool) {
  const steps = genericSteps(tool)
  return el('section', { class: 'section', style: { maxWidth: '780px' } },
    el('h2', { text: 'How it works' }),
    el('div', { class: 'steps mt-2' }, steps.map(([t, d]) =>
      el('div', { class: 'step' }, el('div', {}, el('b', { text: t }), el('p', { text: d })))
    ))
  )
}

function genericSteps (tool) {
  const base = [
    ['Upload your image', 'Drag & drop, click to browse, or paste from the clipboard. Files stay on your device.'],
    ['Adjust the settings', tool.batch ? 'Every option updates the preview immediately — apply it to one file or the whole batch.' : 'Every option updates the live preview instantly.'],
    ['Download the result', 'Save the processed file — or download all outputs as a ZIP when working in batch.']
  ]
  return base
}

function relatedSection (related) {
  return el('section', { class: 'section' },
    el('div', { class: 'section-head' }, el('h2', { text: 'Related tools' })),
    el('div', { class: 'tool-grid' }, related.map(t => toolCard(t, { showCategory: false })))
  )
}

function faq (tool) {
  const items = [
    [`Is ${tool.name} free to use?`, 'Yes. There are no limits, watermarks on outputs, or accounts — and your files never leave your browser.'],
    [tool.batch ? 'Can I process multiple files at once?' : 'Which formats can I use?', tool.batch ? 'Yes — drop as many images as you like, apply the same settings to all, then download individually or as a single ZIP.' : `${tool.name} works with ${tool.formats.map(f => f.toUpperCase()).join(', ')} and more — whatever your browser can decode.`],
    ['Where are my images processed?', 'Entirely on your device, in browser memory. Nothing is uploaded to a server.']
  ]
  return el('section', { class: 'section', style: { maxWidth: '780px' } },
    el('h2', { text: 'FAQ' }),
    items.map(([q, a]) => el('details', { class: 'faq-item' }, el('summary', { text: q }), el('div', { class: 'faq-a', text: a })))
  )
}

// Category → implementation module (lazy loaded per category).
// crop-image gets its own module (standalone visual tool).
const CATEGORY_MODULES = {
  'quick-tools': () => import('../tools/quick-tools.js'),
  converters: () => import('../tools/converters.js'),
  compress: () => import('../tools/compress-tools.js'),
  effects: () => import('../tools/effects-tools.js'),
  background: () => import('../tools/background-tools.js'),
  design: () => import('../tools/design-tools.js'),
  'social-media': () => import('../tools/social-tools.js'),
  ecommerce: () => import('../tools/ecommerce-tools.js'),
  'developer-tools': () => import('../tools/devtools.js')
}

const TOOL_MODULE_OVERRIDES = {
  'crop-image': () => import('../tools/crop-tool.js').then(m => ({ TOOL_IMPLS: { 'crop-image': m.cropTool } }))
}

export function loadToolModule (category, slug) {
  if (TOOL_MODULE_OVERRIDES[slug]) return TOOL_MODULE_OVERRIDES[slug]()
  const loader = CATEGORY_MODULES[category]
  if (!loader) return Promise.resolve({})
  return loader()
}


