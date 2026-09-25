// Homepage — hero, discovery, category overview, highlights, FAQ.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { TOOLS, popularTools, toolsByCategory, searchTools } from '../data/registry.js'
import { CATEGORIES } from '../data/categories.js'
import { toolGrid } from '../components/tool-card.js'
import { createUploadZone } from '../components/upload.js'
import { comparison } from '../components/preview.js'
import { store } from '../core/store.js'

// A generated sample pair for the homepage demo comparison (canvas-drawn so no
// binary assets are needed).
function samplePair () {
  const mk = (draw) => {
    const c = document.createElement('canvas')
    c.width = 560; c.height = 340
    draw(c.getContext('2d'))
    return c.toDataURL('image/png')
  }
  const base = (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 560, 340)
    g.addColorStop(0, '#6366f1'); g.addColorStop(1, '#a855f7')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 560, 340)
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.beginPath(); ctx.arc(130, 110, 42, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(0, 340); ctx.lineTo(170, 170); ctx.lineTo(300, 300); ctx.lineTo(400, 220); ctx.lineTo(560, 340)
    ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(220, 340); ctx.lineTo(360, 230); ctx.lineTo(470, 300); ctx.lineTo(560, 260); ctx.lineTo(560, 340)
    ctx.closePath(); ctx.fill()
  }
  const before = mk(base)
  const after = mk((ctx) => {
    base(ctx)
    ctx.fillStyle = 'rgba(23, 28, 38, .35)'
    ctx.fillRect(0, 0, 560, 340)
    ctx.globalCompositeOperation = 'overlay'
    ctx.fillStyle = '#4338ca'
    ctx.fillRect(0, 0, 560, 340)
  })
  return { before, after }
}

export default function home () {
  const page = el('div', { class: 'page' })

  // ---------- Hero + upload ----------
  const drop = createUploadZone({
    compact: true,
    label: 'Drop an image to get started',
    sub: 'we\'ll suggest the right tools',
    onFiles: (files) => {
      const file = files[0]
      // Lightweight suggestion: route to compress for big files, else tools page.
      import('../components/toast.js').then(({ toast }) => {
        toast(`Loaded ${file.name}. Pick a tool to work with it.`, 'ok')
      })
      import('../core/router.js').then(({ navigate }) => navigate('/tools'))
    }
  })

  page.append(
    el('section', { class: 'hero container' },
      el('h1', {}, 'Every image tool. ', el('span', { class: 'accent' }, 'One place.')),
      el('p', { class: 'lede', text: `Edit, convert, compress, enhance and transform your images — ${TOOLS.length} professional tools that run entirely in your browser. No uploads, no signup, no waiting.` }),
      el('div', { class: 'hero-cta' },
        el('button', { class: 'btn btn-primary btn-lg', onclick: () => drop.querySelector('input, .dropzone')?.click() || drop.click() }, icon('upload', 17), 'Upload Image'),
        el('a', { class: 'btn btn-lg', href: '#/tools' }, icon('search', 17), 'Browse Tools')
      ),
      el('div', { class: 'hero-stats' },
        el('div', { class: 'stat' }, el('b', { text: `${TOOLS.length}` }), el('span', { text: 'tools' })),
        el('div', { class: 'stat' }, el('b', { text: '100%' }), el('span', { text: 'in-browser' })),
        el('div', { class: 'stat' }, el('b', { text: '0' }), el('span', { text: 'uploads' })),
        el('div', { class: 'stat' }, el('b', { text: '∞' }), el('span', { text: 'free usage' }))
      ),
      el('div', { class: 'container mt-4', style: { maxWidth: '760px' } }, drop)
    )
  )

  // ---------- Popular tools ----------
  page.append(el('section', { class: 'section container' },
    el('div', { class: 'section-head' },
      el('h2', { text: 'Popular tools' }),
      el('a', { href: '#/tools', text: 'See all →' })
    ),
    toolGrid(popularTools().slice(0, 8))
  ))

  // ---------- Categories ----------
  page.append(el('section', { class: 'section container' },
    el('div', { class: 'section-head' }, el('h2', { text: 'Browse by category' })),
    el('div', { class: 'feature-list' },
      CATEGORIES.map(cat => el('a', { class: 'feature-item', href: `#/c/${cat.id}`, style: { textDecoration: 'none', color: 'inherit' } },
        el('span', { class: 'fi-icon' }, icon(cat.icon, 20)),
        el('div', {},
          el('b', { text: cat.name }),
          el('p', { text: `${toolsByCategory(cat.id).length} tools — ${cat.blurb.split('.')[0]}.` })
        )
      ))
    )
  ))

  // ---------- Editor highlight ----------
  page.append(el('section', { class: 'section container' },
    el('div', { class: 'panel', style: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '22px', alignItems: 'center' } },
      el('div', {},
        el('h2', { text: 'A real editor, not a toy' }),
        el('p', { class: 'muted mt-2', text: 'Layers, drawing tools, text, shapes, precise adjustments, filters, undo history and pro export — a lightweight image editor that runs entirely on your machine.' }),
        el('div', { class: 'row wrap mt-3' },
          ['Layers', 'Brush & shapes', 'Curved text', 'Filters', 'Undo history', 'PNG / JPG / WebP'].map(f =>
            el('span', { class: 'cat-chip', text: f }))
        ),
        el('div', { class: 'mt-3' },
          el('a', { class: 'btn btn-primary', href: '#/editor' }, icon('sliders', 16), 'Open the Editor')
        )
      ),
      (() => {
        const { before, after } = samplePair()
        return comparison({ before, after, beforeLabel: 'Before', afterLabel: 'After' })
      })()
    )
  ))

  // ---------- Recent / favorites ----------
  const recFav = []
  if (store.state.recent.length) {
    recFav.push(el('section', { class: 'section container' },
      el('div', { class: 'section-head' }, el('h2', { text: 'Recently used' })),
      toolGrid(store.state.recent.map(slug => TOOLS.find(t => t.slug === slug)).filter(Boolean).slice(0, 4))
    ))
  }
  if (store.state.favorites.length) {
    recFav.push(el('section', { class: 'section container' },
      el('div', { class: 'section-head' }, el('h2', { text: 'Your favorites' })),
      toolGrid(store.state.favorites.map(slug => TOOLS.find(t => t.slug === slug)).filter(Boolean).slice(0, 4))
    ))
  }
  page.append(...recFav)

  // ---------- Privacy + FAQ ----------
  page.append(el('section', { class: 'section container' },
    el('div', { class: 'privacy-strip' }, icon('shield', 18), 'Your images are processed locally in your browser — they are never uploaded to any server.')
  ))

  page.append(el('section', { class: 'section container', id: 'faq' },
    el('div', { class: 'section-head' }, el('h2', { text: 'Frequently asked questions' })),
    faq()
  ))

  page.append(... seoBlock())

  return page
}

function faq () {
  const items = [
    ['Are my images uploaded anywhere?', 'No. Every tool on this site processes your images directly in your browser using JavaScript and Canvas. Your files never leave your device. AI-marked tools require a connected backend and are clearly labeled before any upload would happen — and by default none is configured.'],
    ['Is it really free?', 'Yes — all tools are free with no usage limits and no account required. Your preferences (favorites, theme) are stored only in your browser.'],
    ['Which formats are supported?', 'JPG, PNG, WebP, GIF, BMP and SVG everywhere. AVIF depends on your browser (Chrome/Edge/Firefox). HEIC and TIFF depend on browser decoders — if your browser can\'t decode them, the tool tells you honestly instead of failing silently.'],
    ['What happened to my image after processing?', 'Nothing — it stays in your device\'s memory until you close or refresh the tab. Downloads are created from local memory.'],
    ['How do I find a specific tool?', 'Press "/" anywhere to open search, or browse the 11 categories. Search understands phrases like "remove bg" or "make image smaller".']
  ]
  return el('div', {}, items.map(([q, a]) =>
    el('details', { class: 'faq-item' }, el('summary', { text: q }), el('div', { class: 'faq-a', text: a }))
  ))
}

function seoBlock () {
  const extras = [
    ['Image editor', '#/editor', 'Layered editing, drawing, text and filters'],
    ['Compress images', '#/t/compress-image', 'Shrink files with quality control'],
    ['Remove background', '#/t/transparent-background', 'Local color-key background removal'],
    ['Convert images', '#/t/convert-image', 'JPG, PNG, WebP, AVIF and more']
  ]
  const icons = ['sliders', 'package', 'scissors', 'repeat']
  return [el('section', { class: 'section container' },
    el('div', { class: 'section-head' }, el('h2', { text: 'Start with a favorite' })),
    el('div', { class: 'feature-list' }, extras.map(([name, href, sub], i) =>
      el('a', { class: 'feature-item', href, style: { textDecoration: 'none', color: 'inherit' } },
        el('span', { class: 'fi-icon' }, icon(icons[i], 18)),
        el('div', {}, el('b', { text: name }), el('p', { text: sub }))
      ))
  ))]
}
