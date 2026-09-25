// Shared tool scaffolding. Provides the standard Upload → Settings → Process
// → Result pipeline so every tool stays consistent and DRY.

import { el, fmtBytes, friendlyError, readFileAsDataURL } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { createUploadZone, createFileList, validateImageFile } from '../components/upload.js'
import { resultStats, resultActions, resultGallery, comparison } from '../components/preview.js'
import { toastErr, toast } from '../components/toast.js'
import { loadImageFromBlob, canvasToBlob, mimeFor } from '../lib/engine.js'
import { selectField } from '../components/controls.js'
import { track, EVENTS } from '../core/analytics.js'

export async function loadItem (file) {
  const item = { file, width: 0, height: 0, error: null, img: null }
  const validationError = await validateImageFile(file)
  if (validationError) { item.error = validationError; return item }
  try {
    const img = await loadImageFromBlob(file)
    item.img = img
    item.width = img.naturalWidth
    item.height = img.naturalHeight
  } catch {
    item.error = 'Could not decode this image in your browser.'
  }
  return item
}

export function outputName (file, fmt) {
  const base = file.name.replace(/\.[^.]+$/, '')
  return `${base}.${fmt === 'jpeg' ? 'jpg' : fmt}`
}

export function formatSelect ({ value = 'keep', onChange, include = ['keep', 'jpg', 'png', 'webp'], label = 'Output format' }) {
  const labels = { keep: 'Keep original', jpg: 'JPG', png: 'PNG', webp: 'WebP', avif: 'AVIF' }
  return selectField({
    label,
    value,
    options: include.map(f => ({ value: f, label: labels[f] || f.toUpperCase() })),
    onChange
  })
}

// The standard tool scaffold.
export function simpleTool ({
  multiple = false,
  settings, // (panel, ctx) => void — build controls into panel
  process, // async (item, ctx) => { canvas?, blob?, url?, name?, format?, note? }
  beforeProcess,
  showComparison = true,
  cta = 'Process',
  autoProcess = false
} = {}) {
  return function mount ({ tool }) {
    let items = []
    let outputs = []
    let processing = false

    const uploadZone = createUploadZone({
      multiple,
      compact: true,
      label: multiple ? 'Drop images (you can add several)' : 'Drop your image here',
      onFiles: async (files) => {
        const loaded = await Promise.all(files.map(loadItem))
        items = multiple ? [...items, ...loaded] : loaded.slice(0, 1)
        fileList.set(items)
        syncState()
        updateInfo()
        ctx.notify?.()
        if (ctx.hookAfterLoad) { try { await ctx.hookAfterLoad(loaded[0], ctx) } catch { /* tool-specific probe is best-effort */ } }
        if (autoProcess && items.length && items.every(i => !i.error)) run()
      }
    })

    const fileList = createFileList({
      onRemove: (item) => { items = items.filter(i => i !== item); fileList.set(items); syncState(); updateInfo(); ctx.notify?.() },
      onReorder: multiple ? (item, dir) => {
        const idx = items.indexOf(item)
        const to = idx + dir
        if (to < 0 || to >= items.length) return
        items.splice(to, 0, items.splice(idx, 1)[0])
        fileList.set(items)
      } : undefined
    })

    const infoLine = el('div', { class: 'muted mt-1' })
    function updateInfo () {
      const ok = items.filter(i => !i.error)
      const px = ok.reduce((s, i) => s + i.width * i.height, 0)
      const bytes = ok.reduce((s, i) => s + i.file.size, 0)
      infoLine.textContent = ok.length
        ? `${ok.length} image${ok.length > 1 ? 's' : ''} · ${fmtBytes(bytes)}${px ? ` · ${ok[0].width}×${ok[0].height}` : ''}${items.some(i => i.error) ? ' · some files failed to decode' : ''}`
        : ''
    }

    const settingsPanel = el('div')
    const resultsRoot = el('div')

    const processBtn = el('button', { class: 'btn btn-primary btn-block btn-lg', onclick: () => run() }, icon('zap', 16), cta)
    const resetBtn = el('button', { class: 'btn btn-block mt-2', onclick: () => { items = []; outputs = []; fileList.set([]); resultsRoot.replaceChildren(); syncState(); updateInfo() } }, 'Start over')

    const ctx = {
      getItems: () => items,
      setItems: (list) => { items = list; fileList.set(items); syncState() },
      settings: settingsPanel,
      results: resultsRoot,
      refresh: () => autoProcess && run(true),
      processBtn,
      setMultiOutput: (list) => { extraOutputs = list }
    }

    if (settings) settings(settingsPanel, ctx)

    function syncState () {
      const ready = items.length > 0 && items.some(i => !i.error)
      processBtn.disabled = !ready || processing
      if (ready) uploadZone.classList.add('compact')
    }

    let extraOutputs = null

    async function run (isAuto = false) {
      const valid = items.filter(i => !i.error)
      if (!valid.length || processing) return
      processing = true
      processBtn.disabled = true
      outputs = []
      resultsRoot.replaceChildren(el('div', { class: 'row mt-3' }, el('div', { class: 'spinner' }), el('span', { class: 'muted', text: 'Processing…' })))

      track(EVENTS.PROCESS_STARTED, { slug: tool.slug, count: valid.length })
      const marked = items.map(i => ({ ...i, status: i.error ? 'error' : 'working' }))
      fileList.set(marked)

      try {
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx]
          if (item.error) { item.status = 'error'; fileList.set([...items]); continue }
          try {
            const out = await (ctx.process || process)(item, ctx)
            const toPush = async (o) => {
              const blob = o.blob || await canvasToBlob(o.canvas, o.format || 'png', o.quality ?? 0.92)
              const url = URL.createObjectURL(blob)
              if (!item._srcUrl) item._srcUrl = await readFileAsDataURL(item.file)
              outputs.push({
                name: o.name || outputName(item.file, o.format || extOfItem(item)),
                blob, url,
                width: o.width ?? o.canvas?.width ?? 0,
                height: o.height ?? o.canvas?.height ?? 0,
                format: o.format || extOfItem(item),
                originalSize: item.file.size,
                sourceUrl: item._srcUrl,
                note: o.note || null
              })
            }
            // Multi-output tools (split/thumbnails) return null but push via
            // ctx.setMultiOutput — flush those here too.
            if (out) await toPush(out)
            if (extraOutputs) {
              for (const o of extraOutputs) await toPush(o)
              extraOutputs = null
            }
            if (out || outputs.length) item.status = 'done'
          } catch (err) {
            item.status = 'error'
            item.error = friendlyError(err)
            track(EVENTS.PROCESS_FAILED, { slug: tool.slug })
          }
          fileList.set([...items])
        }

        renderResults(isAuto)
        track(EVENTS.PROCESS_COMPLETED, { slug: tool.slug, outputs: outputs.length })
      } finally {
        processing = false
        processBtn.disabled = !items.some(i => !i.error)
      }
    }

    function renderResults (isAuto) {
      resultsRoot.replaceChildren()
      if (!outputs.length) {
        resultsRoot.append(el('div', { class: 'error-box mt-3', text: 'We couldn\'t process this image. The file may be corrupted or in a format your browser can\'t handle.' }))
        return
      }
      const totalIn = outputs.reduce((s, o) => s + o.originalSize, 0)
      const totalOut = outputs.reduce((s, o) => s + o.blob.size, 0)

      resultsRoot.append(el('h2', { class: 'mt-4', text: 'Result' }))
      resultsRoot.append(resultStats({
        originalSize: totalIn,
        resultSize: totalOut,
        resultDims: outputs.length === 1 && outputs[0].width ? `${outputs[0].width}×${outputs[0].height}` : null,
        format: outputs.length === 1 ? outputs[0].format : null
      }))

      const notes = outputs.filter(o => o.note)
      if (notes.length) {
        resultsRoot.append(el('div', { class: 'panel mt-3' },
          el('h2', { text: 'Details' }),
          notes.map(o => el('p', { class: 'panel-note', text: `${o.name} — ${o.note}` }))
        ))
      }

      if (outputs.length === 1 && showComparison && outputs[0].sourceUrl) {
        resultsRoot.append(comparison({ before: outputs[0].sourceUrl, after: outputs[0].url }))
      } else if (outputs.length > 1) {
        resultsRoot.append(resultGallery(outputs))
      }

      resultsRoot.append(resultActions(outputs, {
        onStartOver: () => resetBtn.click()
      }))
    }

    const main = el('div', {},
      uploadZone,
      fileList.root,
      infoLine,
      resultsRoot
    )

    const side = el('div', { class: 'tool-side' },
      el('div', { class: 'panel' },
        el('h2', { text: 'Settings' }),
        settingsPanel,
        el('div', { class: 'mt-3' }, processBtn, resetBtn)
      ),
      el('div', { class: 'panel' },
        el('h2', {}, icon('shield', 15), ' Privacy'),
        el('p', { class: 'muted', text: 'Processed locally in your browser. Nothing is uploaded.' })
      )
    )

    return el('div', { class: 'tool-layout' }, main, side)
  }
}

function extOfItem (item) {
  const m = /\.([a-z0-9]+)$/i.exec(item.file.name)
  const ext = (m ? m[1] : 'png').toLowerCase()
  if (ext === 'jpeg') return 'jpg'
  return ['jpg', 'png', 'webp', 'gif', 'bmp'].includes(ext) ? ext : 'png'
}

// Simple table renderer for info-type tools.
export function infoTable (rows) {
  return el('div', { class: 'panel mt-2', style: { padding: 0 } },
    el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' } },
      el('tbody', {}, rows.map(([k, v]) =>
        el('tr', {},
          el('td', { style: { padding: '9px 14px', color: 'var(--text-3)', width: '38%', borderBottom: '1px solid var(--border)' }, text: k }),
          el('td', { style: { padding: '9px 14px', borderBottom: '1px solid var(--border)', wordBreak: 'break-all' }, text: String(v) })
        ))
      ))
    )
}

export { toastErr, toast }
