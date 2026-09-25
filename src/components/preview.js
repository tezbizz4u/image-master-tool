// Preview, comparison and result components shared by all tools.

import { el, fmtBytes, fmtPct, download, downloadZip } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { toast, toastErr } from './toast.js'

export function previewBox (img) {
  const box = el('div', { class: 'preview-box checker-bg' })
  box.set = (src) => {
    if (!src) {
      box.replaceChildren(el('div', { class: 'empty-note', text: 'Preview appears here' }))
    } else {
      const image = el('img', { src, alt: 'Preview' })
      box.replaceChildren(image)
    }
  }
  box.set(img)
  return box
}

// Interactive before/after comparison (slider | side-by-side | toggle).
export function comparison ({ before, after, beforeLabel = 'Original', afterLabel = 'Result' }) {
  let mode = 'slider'
  const root = el('div', { class: 'mt-2' })

  const controls = el('div', { class: 'row mb-2' }, el('div', {
    class: 'seg',
    role: 'tablist'
  }))

  const segButtons = {}
  const modes = [['slider', 'Slider'], ['side', 'Side by side'], ['toggle', 'Toggle']]
  const container = el('div')

  function renderMode () {
    container.replaceChildren()
    if (mode === 'slider') {
      const wrap = el('div', { class: 'cmp-wrap' })
      const beforeImg = el('img', { src: before, alt: beforeLabel })
      const afterDiv = el('div', { class: 'cmp-after' }, el('img', { src: after, alt: afterLabel }))
      const handle = el('div', { class: 'cmp-handle' })
      const tagL = el('span', { class: 'cmp-tag l', text: beforeLabel })
      const tagR = el('span', { class: 'cmp-tag r', text: afterLabel })
      wrap.append(beforeImg, afterDiv, handle, tagL, tagR)

      // size the wrap to the natural aspect of the images
      const probe = new Image()
      probe.onload = () => {
        wrap.style.maxWidth = `${probe.naturalWidth}px`
      }
      probe.src = before

      let dragging = false
      const setPos = (clientX) => {
        const rect = wrap.getBoundingClientRect()
        const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
        afterDiv.style.clipPath = `inset(0 0 0 ${pct}%)`
        handle.style.left = `${pct}%`
      }
      wrap.addEventListener('pointerdown', (e) => { dragging = true; wrap.setPointerCapture(e.pointerId); setPos(e.clientX) })
      wrap.addEventListener('pointermove', (e) => dragging && setPos(e.clientX))
      wrap.addEventListener('pointerup', () => { dragging = false })
      setPos(null || wrap.getBoundingClientRect().width / 2 + (wrap.getBoundingClientRect().left || 0))
      container.append(wrap)
    } else if (mode === 'side') {
      container.append(el('div', { class: 'grid-2' },
        el('div', {}, el('img', { src: before, alt: beforeLabel, style: { borderRadius: '10px', border: '1px solid var(--border)' } }), el('div', { class: 'muted mt-1', text: beforeLabel })),
        el('div', {}, el('img', { src: after, alt: afterLabel, style: { borderRadius: '10px', border: '1px solid var(--border)' } }), el('div', { class: 'muted mt-1', text: afterLabel }))
      ))
    } else {
      let showAfter = true
      const img = el('img', { src: after, alt: afterLabel, style: { borderRadius: '10px', border: '1px solid var(--border)', maxHeight: '420px', margin: '0 auto' } })
      const btn = el('button', { class: 'btn btn-sm mt-2', onclick: () => { showAfter = !showAfter; img.src = showAfter ? after : before } }, 'Switch original / result')
      container.append(el('div', { class: 'preview-box checker-bg' }, img), el('div', { class: 'row mt-2' }, btn))
    }
  }

  for (const [m, label] of modes) {
    const b = el('button', { type: 'button', role: 'tab', text: label })
    b.addEventListener('click', () => {
      mode = m
      Object.values(segButtons).forEach(x => x.classList.remove('on'))
      b.classList.add('on')
      renderMode()
    })
    segButtons[m] = b
    controls.firstChild.append(b)
  }
  segButtons.slider.classList.add('on')

  root.append(controls, container)
  renderMode()
  return root
}

// Result stats bar: original size → result size, reduction %, dimensions, format.
export function resultStats ({ originalSize, resultSize, originalDims, resultDims, format, extra }) {
  const reduction = originalSize ? ((originalSize - resultSize) / originalSize) * 100 : 0
  return el('div', { class: 'result-stats mt-2' },
    el('div', { class: 'rs' }, el('label', { text: 'Original' }), el('b', { text: fmtBytes(originalSize) })),
    el('div', { class: 'rs' }, el('label', { text: 'Result' }), el('b', { text: fmtBytes(resultSize) })),
    (originalSize || resultSize) && el('div', { class: 'rs' },
      el('label', { text: 'Change' }),
      el('b', { class: reduction >= 0 ? 'ok' : 'text-err', text: fmtPct(reduction) })
    ),
    resultDims && el('div', { class: 'rs' }, el('label', { text: 'Dimensions' }), el('b', { text: resultDims })),
    format && el('div', { class: 'rs' }, el('label', { text: 'Format' }), el('b', { text: String(format).toUpperCase() })),
    extra || ''
  )
}

// A processed output: { name, blob, url, width, height, originalSize, format }
export function resultActions (outputs, { onStartOver, onEditAgain } = {}) {
  const wrap = el('div', { class: 'row wrap mt-3' })

  const outputs_ = Array.isArray(outputs) ? outputs : [outputs]

  if (outputs_.length === 1) {
    wrap.append(el('button', {
      class: 'btn btn-primary btn-lg',
      onclick: () => download(outputs_[0].blob, outputs_[0].name)
    }, icon('download', 17), 'Download'))
  } else {
    wrap.append(el('button', {
      class: 'btn btn-primary btn-lg',
      onclick: () => downloadZip(outputs_.map(o => ({ name: o.name, blob: o.blob })))
    }, icon('download', 17), `Download all (${outputs_.length}) — ZIP`))
    wrap.append(el('button', {
      class: 'btn',
      onclick: () => download(outputs_[0].blob, outputs_[0].name)
    }, 'Download first'))
  }

  if (onEditAgain) {
    wrap.append(el('button', { class: 'btn', onclick: onEditAgain }, icon('pen', 15), 'Edit again'))
  }
  if (onStartOver) {
    wrap.append(el('button', { class: 'btn', onclick: onStartOver }, 'Start over'))
  }
  return wrap
}

// Gallery of multiple results with per-item download.
export function resultGallery (outputs, { onStartOver } = {}) {
  const gallery = el('div', { class: 'cmp-gallery mt-2' })
  for (const o of outputs) {
    gallery.append(el('div', { class: 'cmp-item' },
      el('img', { src: o.url, alt: o.name, loading: 'lazy' }),
      el('div', { class: 'ci-body' },
        el('b', { text: o.name, title: o.name }),
        el('span', { text: `${o.width && o.height ? `${o.width}×${o.height} · ` : ''}${fmtBytes(o.blob.size)} · ${String(o.format).toUpperCase()}` }),
        el('div', { class: 'row mt-1' },
          el('button', { class: 'btn btn-sm', onclick: () => download(o.blob, o.name) }, icon('download', 13), 'Save'),
          el('button', {
            class: 'btn btn-sm',
            onclick: async () => {
              try { await navigator.clipboard.write([new ClipboardItem({ [o.blob.type]: o.blob })]); toast('Image copied to clipboard') } catch { toastErr('Copying is not available in this browser') }
            }
          }, icon('copy', 13), 'Copy')
        )
      )
    ))
  }
  return gallery
}

// Standard result section header used by tool pages.
export function resultHeader (title) {
  return el('h2', { text: title, class: 'mt-4' })
}
