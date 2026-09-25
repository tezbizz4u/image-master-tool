// Compress & Optimize tools.
import { el } from '../core/utils.js'
import { simpleTool, outputName } from './shared.js'
import { imageToCanvas, canvasToBlob, resizeCanvas } from '../lib/engine.js'
import { sliderRow, numberField, radioTiles, toggle } from '../components/controls.js'

export const TOOL_IMPLS = {}

function fmtCompressor (formats, defaultQ = 80) {
  return simpleTool({
    multiple: true,
    settings (panel, ctx) {
      let quality = defaultQ
      let progressive = true
      let stripMeta = true
      panel.append(
        sliderRow({ label: 'Quality', min: 5, max: 100, value: defaultQ, onInput: v => { quality = v; ctx.refresh() } }),
        formats.includes('jpg') && toggle({ label: 'Progressive JPEG (loads top-down on slow links)', value: progressive, onChange: v => { progressive = v } }),
        toggle({ label: 'Remove metadata', value: true, onChange: v => { stripMeta = v } })
      )
      ctx.process = async (item) => {
        const ext = extOf(item)
        if (!formats.includes(ext)) {
          throw new Error(`This tool optimizes ${formats.map(f => f.toUpperCase()).join('/')} files. Your file is ${ext.toUpperCase()} — use Convert Image first, or the general Compress tool.`)
        }
        let canvas = imageToCanvas(item.img)
        // Canvas re-encode always strips metadata.
        const format = formats.includes(ext) ? ext : 'jpg'
        return { canvas, format, quality: quality / 100, name: outputName(item.file, format) }
      }
    }
  })
}

TOOL_IMPLS['compress-jpg'] = fmtCompressor(['jpg'])
TOOL_IMPLS['compress-webp'] = fmtCompressor(['webp'], 75)

TOOL_IMPLS['compress-png'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let mode = 'lossy'; let colors = 256; let quality = 85
    panel.append(
      radioTiles({
        label: 'Strategy',
        value: 'lossy',
        options: [
          { value: 'lossless', label: 'Lossless', sub: 're-encode only' },
          { value: 'lossy', label: 'Quantize', sub: '256 colors, big savings' }
        ],
        onChange: v => { mode = v; colorsRow.classList.toggle('hidden', v !== 'lossy'); ctx.refresh() }
      }),
      el('p', { class: 'panel-note', text: 'Lossless mode re-encodes the pixels as-is (metadata is still dropped). Quantize mode reduces the palette for dramatic savings on graphics.' })
    )
    const colorsRow = sliderRow({ label: 'Colors', min: 8, max: 256, step: 8, value: 256, onInput: v => { colors = v; ctx.refresh() } })
    panel.insertBefore(colorsRow, panel.lastChild)
    ctx.process = async (item) => {
      const ext = extOf(item)
      if (ext !== 'png') throw new Error('This tool compresses PNG files. Use Convert Image for other formats.')
      const canvas = imageToCanvas(item.img)
      if (mode === 'lossy') {
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
        const { quantize } = await import('../lib/quantize.js')
        const reduced = quantize(data, colors)
        canvas.getContext('2d').putImageData(reduced, 0, 0)
      }
      return { canvas, format: 'png', name: outputName(item.file, 'png') }
    }
  }
})

TOOL_IMPLS['batch-compress'] = simpleTool({
  multiple: true,
  cta: 'Compress all',
  settings (panel, ctx) {
    let quality = 75
    panel.append(
      el('p', { class: 'panel-note mb-2', text: 'Each image re-encodes at the chosen quality in its current format (JPG/PNG/WebP). Results table shows per-file savings.' }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 75, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const format = extOf(item)
      const canvas = imageToCanvas(item.img)
      return { canvas, format, quality: format === 'png' ? undefined : quality / 100, name: outputName(item.file, format) }
    }
  }
})

TOOL_IMPLS['target-file-size'] = simpleTool({
  multiple: true,
  cta: 'Fit to size',
  settings (panel, ctx) {
    let targetKB = 100
    let fmt = 'jpg'
    panel.append(
      numberField({ label: 'Target size (KB)', value: 100, min: 5, max: 20000, onInput: v => { targetKB = v || 100 } }),
      radioTiles({ label: 'Format', value: 'jpg', options: [{ value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP (smaller)' }], onChange: v => { fmt = v } }),
      el('p', { class: 'panel-note', text: 'We binary-search the highest quality that fits under your limit — usually 8 attempts.' })
    )
    ctx.process = async (item) => {
      const canvas = imageToCanvas(item.img)
      const target = targetKB * 1024
      let lo = 0.05; let hi = 0.95; let best = null
      for (let i = 0; i < 9; i++) {
        const q = (lo + hi) / 2
        const blob = await canvasToBlob(canvas, fmt, q)
        if (blob.size <= target) { best = { q, blob }; lo = q } else { hi = q }
        if (hi - lo < 0.02) break
      }
      if (!best) {
        // Even lowest quality is too big — downscale and retry once.
        const scale = Math.sqrt(target / (await canvasToBlob(canvas, fmt, 0.05)).size)
        const smaller = resizeCanvas(canvas, canvas.width * scale, canvas.height * scale)
        const blob = await canvasToBlob(smaller, fmt, 0.7)
        return { blob, canvas: smaller, format: fmt, name: outputName(item.file, fmt), note: 'Resized to fit' }
      }
      return { blob: best.blob, canvas, format: fmt, quality: best.q, name: outputName(item.file, fmt) }
    }
  }
})

TOOL_IMPLS['image-optimizer'] = simpleTool({
  multiple: true,
  cta: 'Optimize',
  settings (panel, ctx) {
    let maxDim = 0; let quality = 80; let toWebP = true
    panel.append(
      numberField({ label: 'Max dimension (0 = keep)', value: 0, min: 0, max: 20000, onInput: v => { maxDim = v || 0 } }),
      sliderRow({ label: 'Quality', min: 30, max: 100, value: 80, onInput: v => { quality = v } }),
      toggle({ label: 'Prefer WebP when smaller (recommended)', value: true, onChange: v => { toWebP = v } }),
      el('p', { class: 'panel-note', text: 'Each image is re-encoded and metadata dropped. If WebP is on, we try both formats and keep the smaller file.' })
    )
    ctx.process = async (item) => {
      let canvas = imageToCanvas(item.img)
      if (maxDim) {
        const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height))
        if (scale < 1) canvas = resizeCanvas(canvas, canvas.width * scale, canvas.height * scale)
      }
      // Detect real transparency so JPG is only offered when it's lossless-safe.
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      let opaque = true
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 255) { opaque = false; break } }
      // Try every format the pixel data allows and keep the genuinely smallest.
      const candidates = [{ blob: await canvasToBlob(canvas, 'png'), format: 'png' }]
      if (toWebP) candidates.push({ blob: await canvasToBlob(canvas, 'webp', quality / 100), format: 'webp' })
      if (opaque) candidates.push({ blob: await canvasToBlob(canvas, 'jpg', quality / 100), format: 'jpg' })
      candidates.sort((a, b) => a.blob.size - b.blob.size)
      const best = candidates[0]
      return { blob: best.blob, canvas, format: best.format, name: outputName(item.file, best.format) }
    }
  }
})

TOOL_IMPLS['resize-compress'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let maxDim = 1600; let quality = 78; let fmt = 'keep'
    panel.append(
      numberField({ label: 'Max dimension (px)', value: 1600, min: 16, max: 20000, onInput: v => { maxDim = v || 1600 } }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 78, onInput: v => { quality = v } }),
      el('p', { class: 'panel-note', text: 'One pass: downscale to the max dimension, then re-encode at the chosen quality.' })
    )
    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      const scale = Math.min(1, maxDim / Math.max(src.width, src.height))
      const canvas = scale < 1 ? resizeCanvas(src, src.width * scale, src.height * scale) : src
      const format = fmt === 'keep' ? extOf(item) : fmt
      return { canvas, format, quality: format === 'png' ? undefined : quality / 100, name: outputName(item.file, format) }
    }
  }
})

function extOf (item) {
  const m = /\.([a-z0-9]+)$/i.exec(item.file.name)
  const e = (m ? m[1] : 'png').toLowerCase()
  return e === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp', 'gif', 'bmp'].includes(e) ? e : 'png'
}
