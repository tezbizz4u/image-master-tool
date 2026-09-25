// Design Tools: canvas-composition tools built on lib/engine + presets.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { simpleTool, loadItem, outputName } from './shared.js'
import { imageToCanvas, canvasToBlob, newCanvas, fitCanvas, resizeCanvas, roundRectPath, drawText } from '../lib/engine.js'
import { sliderRow, colorField, toggle, radioTiles, selectField, textField, numberField, segmented } from '../components/controls.js'
import { previewBox, resultActions } from '../components/preview.js'
import { createUploadZone } from '../components/upload.js'
import { toast } from '../components/toast.js'
import { ID_SIZES } from '../lib/presets.js'
import { getWatermarks, saveWatermark, deleteWatermark } from '../services/storage.js'

export const TOOL_IMPLS = {}

// Helper: multi-image custom tool builder (2-9 images → one canvas).
// With min=0 the tool renders immediately from settings alone (no upload
// required) — used by quote maker, placeholders and other generative tools.
function multiImageTool ({ min = 1, max = 9, build, settingsUI, downloadName = 'design' }) {
  return function mount () {
    const main = el('div')
    const side = el('div', { class: 'tool-side' })
    const preview = previewBox()
    const state = {}
    let imgs = []
    let outCanvas = null
    const out = el('div')

    const settingsPanel = el('div', { class: 'panel' })
    settingsUI(settingsPanel, state, () => render())

    const zone = createUploadZone({
      multiple: max > 1,
      compact: true,
      label: max > 1 ? `Drop ${min}${max > min ? `–${max}` : ''} images` : (min > 0 ? 'Drop your image' : 'Optional: drop a background image'),
      onFiles: async (files) => {
        const loaded = await Promise.all(files.slice(0, Math.max(1, max)).map(loadItem))
        imgs = loaded.filter(i => !i.error).map(i => i.img)
        render()
        if (!imgs.length) toast('None of the files could be decoded.', 'err')
      }
    })

    async function render () {
      if (!imgs.length && min > 0) { preview.set(null); return }
      try {
        outCanvas = await build(imgs, state)
        preview.set(outCanvas.toDataURL('image/png'))
        dl.disabled = false
      } catch (e) {
        preview.set(null)
        dl.disabled = true
      }
    }

    const dl = el('button', {
      class: 'btn btn-primary btn-block mt-2', disabled: true,
      onclick: async () => {
        if (!outCanvas) return
        const fmt = state._fmt || 'png'
        const blob = await canvasToBlob(outCanvas, fmt, (state._quality ?? 92) / 100)
        const { download } = await import('../core/utils.js')
        download(blob, `${downloadName}.${fmt}`)
      }
    }, icon('download', 15), 'Download')

    const fmtPanel = el('div', { class: 'panel mt-3' },
      el('h2', { text: 'Export' }),
      radioTiles({ label: 'Format', value: 'png', options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }], onChange: v => { state._fmt = v } }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 92, onInput: v => { state._quality = v } }),
      el('div', { class: 'mt-2' }, dl)
    )

    main.append(zone, el('div', { class: 'panel mt-3' }, el('h2', { text: 'Preview' }), preview), out)
    side.append(settingsPanel, fmtPanel)
    if (min === 0) render() // generative tools render from settings right away
    return el('div', { class: 'tool-layout' }, main, side)
  }
}

// ---------- Meme Generator ----------
TOOL_IMPLS['meme-generator'] = multiImageTool({
  max: 1,
  downloadName: 'meme',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { top: 'TOP TEXT', bottom: 'BOTTOM TEXT', size: 72, stroke: 4, upper: true })
    panel.append(
      textField({ label: 'Top text', value: state.top, onInput: v => { state.top = v; refresh() } }),
      textField({ label: 'Bottom text', value: state.bottom, onInput: v => { state.bottom = v; refresh() } }),
      sliderRow({ label: 'Font size', min: 20, max: 200, value: 72, onInput: v => { state.size = v; refresh() } }),
      sliderRow({ label: 'Outline', min: 0, max: 16, value: 4, onInput: v => { state.stroke = v; refresh() } }),
      toggle({ label: 'Uppercase (classic meme style)', value: true, onChange: v => { state.upper = v; refresh() } })
    )
  },
  async build ([img], state) {
    const canvas = imageToCanvas(img)
    const ctx = canvas.getContext('2d')
    const t = state.upper ? state.top.toUpperCase() : state.top
    const b = state.upper ? state.bottom.toUpperCase() : state.bottom
    const m = Math.max(6, canvas.width * 0.012)
    drawText(ctx, { text: t, x: canvas.width / 2, y: m, size: state.size, color: '#fff', stroke: '#000', strokeWidth: state.stroke, align: 'center', baseline: 'top', font: 'Impact, sans-serif', weight: '400' }, canvas.width, canvas.height)
    drawText(ctx, { text: b, x: canvas.width / 2, y: canvas.height - m - state.size * 1.1, size: state.size, color: '#fff', stroke: '#000', strokeWidth: state.stroke, align: 'center', baseline: 'top', font: 'Impact, sans-serif', weight: '400' }, canvas.width, canvas.height)
    return canvas
  }
})

// ---------- Quote Image Maker ----------
TOOL_IMPLS['quote-image'] = multiImageTool({
  min: 0,
  max: 0,
  downloadName: 'quote',
  settingsUI (panel, state, refresh) {
    Object.assign(state, {
      quote: 'Design is intelligence made visible.',
      author: 'Alina Wheeler',
      bg1: '#1e1b4b', bg2: '#4338ca', textColor: '#ffffff', size: 44, width: 1080, height: 1080
    })
    panel.append(
      el('div', { class: 'field' }, el('label', { text: 'Quote' }),
        el('textarea', { class: 'input', rows: 4, oninput: e => { state.quote = e.target.value; refresh() } }, state.quote)),
      textField({ label: 'Author', value: state.author, onInput: v => { state.author = v; refresh() } }),
      colorField({ label: 'Background from', value: state.bg1, onInput: v => { state.bg1 = v; refresh() } }),
      colorField({ label: 'Background to', value: state.bg2, onInput: v => { state.bg2 = v; refresh() } }),
      colorField({ label: 'Text color', value: state.textColor, onInput: v => { state.textColor = v; refresh() } }),
      sliderRow({ label: 'Font size', min: 20, max: 96, value: 44, onInput: v => { state.size = v; refresh() } }),
      el('div', { class: 'grid-2' },
        numberField({ label: 'Width', value: 1080, min: 200, max: 4000, onInput: v => { state.width = v || 1080; refresh() } }),
        numberField({ label: 'Height', value: 1080, min: 200, max: 4000, onInput: v => { state.height = v || 1080; refresh() } })
      )
    )
  },
  async build (imgs, state) {
    const canvas = newCanvas(state.width, state.height)
    const ctx = canvas.getContext('2d')
    const g = ctx.createLinearGradient(0, 0, state.width, state.height)
    g.addColorStop(0, state.bg1); g.addColorStop(1, state.bg2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, state.width, state.height)
    const quoteMark = drawText(ctx, { text: '“', x: state.width / 2, y: state.height * 0.08, size: state.size * 2.4, color: 'rgba(255,255,255,.25)', align: 'center', font: 'Georgia, serif', weight: '700' }, state.width, state.height)
    drawText(ctx, {
      text: state.quote, x: state.width / 2, y: state.height * 0.28, size: state.size,
      color: state.textColor, align: 'center', maxWidth: state.width * 0.8,
      lineHeight: 1.4, font: 'Georgia, serif', weight: '400'
    }, state.width, state.height)
    drawText(ctx, {
      text: state.author ? `— ${state.author}` : '', x: state.width / 2, y: state.height * 0.78,
      size: state.size * 0.55, color: 'rgba(255,255,255,.8)', align: 'center', font: 'Arial, sans-serif'
    }, state.width, state.height)
    return canvas
  }
})

// ---------- Collage Maker ----------
TOOL_IMPLS['collage-maker'] = multiImageTool({
  min: 2, max: 9,
  downloadName: 'collage',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { gap: 12, radius: 12, bg: '#ffffff', pad: 24, cols: 3 })
    panel.append(
      numberField({ label: 'Columns (0 = auto)', value: 3, min: 0, max: 4, onInput: v => { state.cols = v; refresh() } }),
      sliderRow({ label: 'Gap', min: 0, max: 60, value: 12, onInput: v => { state.gap = v; refresh() } }),
      sliderRow({ label: 'Outer padding', min: 0, max: 80, value: 24, onInput: v => { state.pad = v; refresh() } }),
      sliderRow({ label: 'Corner radius', min: 0, max: 60, value: 12, onInput: v => { state.radius = v; refresh() } }),
      colorField({ label: 'Background', value: '#ffffff', onInput: v => { state.bg = v; refresh() } })
    )
  },
  async build (imgs, state) {
    const n = imgs.length
    const cols = state.cols > 0 ? state.cols : Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const cell = 640
    const W = cols * cell + state.gap * (cols - 1) + state.pad * 2
    const H = rows * cell + state.gap * (rows - 1) + state.pad * 2
    const canvas = newCanvas(W, H, state.bg)
    const ctx = canvas.getContext('2d')
    imgs.forEach((img, i) => {
      const cx = i % cols
      const cy = Math.floor(i / cols)
      const x = state.pad + cx * (cell + state.gap)
      const y = state.pad + cy * (cell + state.gap)
      ctx.save()
      roundRectPath(ctx, x, y, cell, cell, state.radius)
      ctx.clip()
      // cover-fit
      const s = Math.max(cell / img.naturalWidth, cell / img.naturalHeight)
      const dw = img.naturalWidth * s; const dh = img.naturalHeight * s
      ctx.drawImage(img, x + (cell - dw) / 2, y + (cell - dh) / 2, dw, dh)
      ctx.restore()
    })
    return canvas
  }
})

// ---------- Photo Frame ----------
TOOL_IMPLS['photo-frame'] = multiImageTool({
  max: 1,
  downloadName: 'framed',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { style: 'polaroid', caption: '', pad: 5, bg: '#ffffff' })
    panel.append(
      radioTiles({
        label: 'Frame style', value: 'polaroid',
        options: [
          { value: 'polaroid', label: 'Polaroid', sub: 'bottom band' },
          { value: 'card', label: 'Card', sub: 'even border' },
          { value: 'film', label: 'Film strip', sub: 'dark + sprockets' }
        ],
        onChange: v => { state.style = v; refresh() }
      }),
      sliderRow({ label: 'Border %', min: 1, max: 25, value: 5, onInput: v => { state.pad = v; refresh() } }),
      textField({ label: 'Caption (polaroid)', value: '', placeholder: 'Summer 2026', onInput: v => { state.caption = v; refresh() } })
    )
  },
  async build ([img], state) {
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const pad = Math.round(Math.max(iw, ih) * state.pad / 100)
    let W; let H; let drawImageAt
    if (state.style === 'polaroid') {
      const bottom = Math.round(pad * 2.6)
      W = iw + pad * 2; H = ih + pad + bottom
      drawImageAt = [pad, pad]
    } else {
      W = iw + pad * 2; H = ih + pad * 2
      drawImageAt = [pad, pad]
    }
    const canvas = newCanvas(W, H, state.style === 'film' ? '#111318' : state.bg)
    const ctx = canvas.getContext('2d')
    if (state.style === 'film') {
      ctx.fillStyle = '#e8e6df'
      const holes = Math.floor(W / 34)
      for (let i = 0; i < holes; i++) {
        ctx.fillRect(8 + i * 34, 8, 16, 10)
        ctx.fillRect(8 + i * 34, H - 18, 16, 10)
      }
    }
    ctx.drawImage(img, drawImageAt[0], drawImageAt[1])
    if (state.style === 'polaroid' && state.caption) {
      drawText(ctx, { text: state.caption, x: W / 2, y: ih + pad + (pad * 1.6) / 2, size: Math.max(16, pad * 0.9), color: '#2b2f3a', align: 'center', font: 'Georgia, serif' }, W, H)
    }
    return canvas
  }
})

// ---------- Before/After ----------
TOOL_IMPLS['before-after'] = multiImageTool({
  min: 2, max: 2,
  downloadName: 'before-after',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { mode: 'side', labels: true, gap: 20, bg: '#ffffff' })
    panel.append(
      segmented({ options: [{ value: 'side', label: 'Side by side' }, { value: 'stack', label: 'Stacked' }], value: 'side', onChange: v => { state.mode = v; refresh() } }),
      toggle({ label: 'Labels (BEFORE / AFTER)', value: true, onChange: v => { state.labels = v; refresh() } }),
      sliderRow({ label: 'Gap', min: 0, max: 80, value: 20, onInput: v => { state.gap = v; refresh() } }),
      colorField({ label: 'Background', value: '#ffffff', onInput: v => { state.bg = v; refresh() } })
    )
  },
  async build ([a, b], state) {
    const H = 900
    const aw = Math.round(H * a.naturalWidth / a.naturalHeight)
    const bw = Math.round(H * b.naturalWidth / b.naturalHeight)
    const gap = state.gap
    const labelH = state.labels ? 70 : 0
    const W = state.mode === 'side' ? aw + bw + gap * 2 : Math.max(aw, bw) + gap * 2
    const HH = (state.mode === 'side' ? H : H * 2 + gap) + labelH
    const canvas = newCanvas(W, HH, state.bg)
    const ctx = canvas.getContext('2d')
    if (state.mode === 'side') {
      ctx.drawImage(a, gap, labelH, aw, H)
      ctx.drawImage(b, gap * 2 + aw, labelH, bw, H)
      if (state.labels) {
        drawText(ctx, { text: 'BEFORE', x: gap, y: 18, size: 32, color: '#6b7280', weight: '800', font: 'Arial, sans-serif' }, W, HH)
        drawText(ctx, { text: 'AFTER', x: gap * 2 + aw, y: 18, size: 32, color: '#16a34a', weight: '800', font: 'Arial, sans-serif' }, W, HH)
      }
    } else {
      ctx.drawImage(a, (W - aw) / 2, labelH, aw, H)
      ctx.drawImage(b, (W - bw) / 2, labelH + H + gap, bw, H)
      if (state.labels) {
        drawText(ctx, { text: 'BEFORE', x: gap, y: 18, size: 32, color: '#6b7280', weight: '800' }, W, HH)
        drawText(ctx, { text: 'AFTER', x: gap, y: labelH + H + gap - 46, size: 32, color: '#16a34a', weight: '800' }, W, HH)
      }
    }
    return canvas
  }
})

// ---------- Watermark Maker (save/load designs) ----------
TOOL_IMPLS['watermark-maker'] = multiImageTool({
  max: 1,
  downloadName: 'watermarked',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { text: '© Your Brand', color: '#ffffff', opacity: 50, scale: 5, position: 'bottom-right', tile: false })
    const saved = el('div', { class: 'mt-2' })
    function renderSaved () {
      saved.replaceChildren(...getWatermarks().map(w =>
        el('div', { class: 'row between', style: { padding: '6px 0', borderBottom: '1px solid var(--border)' } },
          el('span', { class: 'muted', text: w.text }),
          el('span', { class: 'row' },
            el('button', { class: 'btn btn-sm', onclick: () => { Object.assign(state, w); refresh(); toast('Watermark applied', 'info') } }, 'Apply'),
            el('button', { class: 'btn btn-sm btn-danger', onclick: () => { deleteWatermark(w.id); renderSaved() } }, '×')
          )
        )))
      if (!getWatermarks().length) saved.append(el('span', { class: 'muted', text: 'No saved designs yet.' }))
    }
    renderSaved()
    panel.append(
      textField({ label: 'Watermark text', value: state.text, onInput: v => { state.text = v; refresh() } }),
      colorField({ label: 'Color', value: '#ffffff', onInput: v => { state.color = v; refresh() } }),
      selectField({ label: 'Position', value: 'bottom-right', options: ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(p => ({ value: p, label: p })), onChange: v => { state.position = v; refresh() } }),
      sliderRow({ label: 'Size', min: 2, max: 20, value: 5, onInput: v => { state.scale = v; refresh() } }),
      sliderRow({ label: 'Opacity', min: 5, max: 100, value: 50, unit: '%', onInput: v => { state.opacity = v; refresh() } }),
      toggle({ label: 'Tile', value: false, onChange: v => { state.tile = v; refresh() } }),
      el('button', { class: 'btn btn-sm mt-1', onclick: () => { saveWatermark({ text: state.text, color: state.color, opacity: state.opacity, scale: state.scale, position: state.position, tile: state.tile }); renderSaved(); toast('Saved locally') } }, 'Save this design')
    )
    panel.append(saved)
  },
  async build ([img], state) {
    const canvas = imageToCanvas(img)
    const ctx = canvas.getContext('2d')
    const { drawWatermark } = await import('../lib/engine.js')
    drawWatermark(ctx, canvas.width, canvas.height, { text: state.text, color: state.color, opacity: (state.opacity ?? 50) / 100, scale: state.scale ?? 5, position: state.position ?? 'bottom-right', tile: state.tile })
    return canvas
  }
})

// ---------- ID Photo Maker ----------
TOOL_IMPLS['id-photo-maker'] = multiImageTool({
  max: 1,
  downloadName: 'id-photo',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { size: ID_SIZES[0], bg: '#ffffff', sheet: false })
    panel.append(
      selectField({
        label: 'Size', value: ID_SIZES[0].id,
        options: ID_SIZES.map(s => ({ value: s.id, label: s.label })),
        onChange: v => { state.size = ID_SIZES.find(s => s.id === v); refresh() }
      }),
      colorField({ label: 'Background', value: '#ffffff', onInput: v => { state.bg = v; refresh() } }),
      toggle({ label: 'Also build a 10-up 10×15 cm print sheet', value: false, onChange: v => { state.sheet = v; refresh() } }),
      el('p', { class: 'panel-note mt-2', text: 'Position the face with the guides: eyes on the upper line, chin near the lower line. Print at 100% scale.' })
    )
  },
  async build ([img], state) {
    const { w, h } = state.size.px
    const crop = fitCanvas(img, w, h, 'cover')
    // white bg behind
    const canvas = newCanvas(w, h, state.bg)
    canvas.getContext('2d').drawImage(crop, 0, 0)
    // guides overlay (visual only on preview; export keeps them off)
    const previewOnly = state._previewGuides !== false
    if (previewOnly) {
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = 'rgba(59,130,246,.85)'
      ctx.setLineDash([6, 5])
      ctx.beginPath(); ctx.moveTo(0, h * 0.42); ctx.lineTo(w, h * 0.42); ctx.stroke() // eyes
      ctx.beginPath(); ctx.moveTo(w * 0.5, h * 0.42 - 10); ctx.lineTo(w * 0.5, h * 0.42 + 10); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, h * 0.78); ctx.lineTo(w, h * 0.78); ctx.stroke() // chin
    }
    state._export = state._export || {}
    if (state.sheet) {
      const cols = 4; const rowsN = 3
      const cellW = Math.round(300); const cellH = Math.round(300 * h / w)
      const sheet = newCanvas(cols * cellW + 60, rowsN * cellH + 60, '#ffffff')
      const sctx = sheet.getContext('2d')
      const clean = newCanvas(w, h, state.bg)
      clean.getContext('2d').drawImage(crop, 0, 0)
      for (let r = 0; r < rowsN; r++) {
        for (let c = 0; c < cols; c++) {
          sctx.drawImage(clean, 30 + c * cellW, 30 + r * cellH, cellW, cellH)
        }
      }
      state._exportSheet = sheet
    }
    return canvas
  }
})

// ---------- Profile Picture Maker ----------
TOOL_IMPLS['profile-picture-maker'] = multiImageTool({
  max: 1,
  downloadName: 'profile-picture',
  settingsUI (panel, state, refresh) {
    Object.assign(state, { zoom: 1, size: 512, bg: '#6366f1', circle: true })
    panel.append(
      sliderRow({ label: 'Zoom', min: 1, max: 3, step: 0.05, value: 1, onInput: v => { state.zoom = v; refresh() } }),
      numberField({ label: 'Output size', value: 512, min: 64, max: 2048, onInput: v => { state.size = v || 512; refresh() } }),
      toggle({ label: 'Circular mask', value: true, onChange: v => { state.circle = v; refresh() } }),
      colorField({ label: 'Ring background', value: '#6366f1', onInput: v => { state.bg = v; refresh() } })
    )
  },
  async build ([img], state) {
    const S = state.size
    const canvas = newCanvas(S, S, state.bg)
    const ctx = canvas.getContext('2d')
    ctx.save()
    if (state.circle) {
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
      ctx.clip()
    }
    // cover-fit with zoom
    const s = Math.max(S / img.naturalWidth, S / img.naturalHeight) * (state.zoom ?? 1)
    const dw = img.naturalWidth * s; const dh = img.naturalHeight * s
    ctx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh)
    ctx.restore()
    return canvas
  }
})
