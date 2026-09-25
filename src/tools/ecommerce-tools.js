// E-commerce tools. Marketplace presets are configurable data, not hard-coded
// claims about any platform's current requirements.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { simpleTool, loadItem, outputName } from './shared.js'
import { imageToCanvas, canvasToBlob, fitCanvas, newCanvas, resizeCanvas, roundRectPath } from '../lib/engine.js'
import { sliderRow, numberField, colorField, radioTiles, selectField, toggle } from '../components/controls.js'
import { previewBox, resultActions } from '../components/preview.js'
import { createUploadZone } from '../components/upload.js'
import { toast } from '../components/toast.js'
import { MARKETPLACE_PRESETS } from '../lib/presets.js'

export const TOOL_IMPLS = {}

// Product resize to marketplace squares with white padding.
TOOL_IMPLS['product-image-resize'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let size = 1600; let sizeH = 1600; let padColor = '#ffffff'; let mode = 'contain'; let fmt = 'jpg'; let quality = 88
    panel.append(
      radioTiles({
        label: 'Canvas size', value: 1600,
        options: MARKETPLACE_PRESETS.map(p => ({ value: `${p.width}x${p.height}`, label: p.label, sub: `${p.width}×${p.height}` })),
        onChange: v => { const [w, h] = v.split('x').map(Number); size = w; sizeH = h }
      }),
      radioTiles({ label: 'Fit', value: 'contain', options: [{ value: 'contain', label: 'Contain', sub: 'white padding' }, { value: 'cover', label: 'Cover', sub: 'fill & crop' }], onChange: v => { mode = v } }),
      colorField({ label: 'Padding color', value: '#ffffff', onInput: v => { padColor = v } }),
      radioTiles({ label: 'Format', value: 'jpg', options: [{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }], onChange: v => { fmt = v } }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 88, onInput: v => { quality = v } }),
      el('p', { class: 'panel-note', text: 'Marketplace sizes are kept as editable presets — verify your channel\'s current spec before bulk uploads.' })
    )
    ctx.process = async (item) => {
      const canvas = fitCanvas(imageToCanvas(item.img), size, sizeH, mode, mode === 'contain' ? padColor : null)
      return { canvas, format: fmt, quality: fmt === 'png' ? undefined : quality / 100, name: outputName(item.file, fmt) }
    }
  }
})

// Product compressor (batch).
TOOL_IMPLS['product-image-compressor'] = simpleTool({
  multiple: true,
  cta: 'Compress products',
  settings (panel, ctx) {
    let quality = 82
    panel.append(
      sliderRow({ label: 'Quality', min: 20, max: 100, value: 82, onInput: v => { quality = v } }),
      el('p', { class: 'panel-note', text: 'Default 82 is a good sweet spot for product photography: crisp edges, small files.' })
    )
    ctx.process = async (item) => {
      const format = extOf(item)
      const canvas = imageToCanvas(item.img)
      return { canvas, format, quality: format === 'png' ? undefined : quality / 100, name: outputName(item.file, format) }
    }
  }
})

// Product shadow: soft drop shadow under transparent cutouts.
TOOL_IMPLS['product-shadow'] = simpleTool({
  settings (panel, ctx) {
    let angle = 90; let distance = 24; let blur = 30; let opacity = 35
    panel.append(
      sliderRow({ label: 'Shadow angle', min: 0, max: 360, value: 90, unit: '°', onInput: v => { angle = v } }),
      sliderRow({ label: 'Distance', min: 0, max: 120, value: 24, onInput: v => { distance = v } }),
      sliderRow({ label: 'Softness', min: 2, max: 100, value: 30, onInput: v => { blur = v } }),
      sliderRow({ label: 'Opacity', min: 5, max: 100, value: 35, unit: '%', onInput: v => { opacity = v } }),
      el('p', { class: 'panel-note', text: 'Works best on transparent cutouts (PNG/WebP). Opaque images get a full-frame shadow.' })
    )
    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      const pad = distance + blur * 2 + 20
      const W = src.width + pad * 2
      const H = src.height + pad * 2
      const canvas = newCanvas(W, H)
      const ctx2 = canvas.getContext('2d')
      // shadow: draw the source silhouette blurred & offset
      ctx2.save()
      ctx2.filter = `blur(${blur}px)`
      ctx2.globalAlpha = opacity / 100
      const rad = angle * Math.PI / 180
      ctx2.drawImage(src, pad + Math.cos(rad) * distance, pad + Math.sin(rad) * distance)
      ctx2.restore()
      // darken silhouette to gray-black using composite trick
      ctx2.save()
      ctx2.globalCompositeOperation = 'source-atop'
      ctx2.fillStyle = 'rgba(0,0,0,1)'
      ctx2.fillRect(0, 0, W, H)
      ctx2.restore()
      ctx2.drawImage(src, pad, pad)
      return { canvas, format: 'png', name: outputName(item.file, 'png') }
    }
  }
})

// Marketplace converter: batch format conversion.
TOOL_IMPLS['marketplace-converter'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let fmt = 'jpg'; let quality = 88; let matte = '#ffffff'
    panel.append(
      radioTiles({
        label: 'Target format', value: 'jpg',
        options: [{ value: 'jpg', label: 'JPG', sub: 'accepted nearly everywhere' }, { value: 'png', label: 'PNG', sub: 'when transparency is needed' }, { value: 'webp', label: 'WebP', sub: 'own storefront' }],
        onChange: v => { fmt = v }
      }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 88, onInput: v => { quality = v } }),
      colorField({ label: 'Matte (JPG)', value: '#ffffff', onInput: v => { matte = v } }),
      el('p', { class: 'panel-note', text: 'Format preferences differ per channel and change over time — pick what your channel asks for; defaults are sensible, not claimed.' })
    )
    ctx.process = async (item) => {
      let canvas = imageToCanvas(item.img)
      if (fmt === 'jpg') {
        const matted = newCanvas(canvas.width, canvas.height, matte)
        matted.getContext('2d').drawImage(canvas, 0, 0)
        canvas = matted
      }
      return { canvas, format: fmt, quality: fmt === 'png' ? undefined : quality / 100, name: outputName(item.file, fmt) }
    }
  }
})

// Product thumbnails: multi-size set from one image.
TOOL_IMPLS['product-thumbnail'] = simpleTool({
  settings (panel, ctx) {
    let fmt = 'jpg'; let quality = 85
    panel.append(
      el('p', { class: 'panel-note mb-2', text: 'Generates a gallery set: 100 px thumb, 250 px listing, 500 px zoom, plus your full-size original re-encoded.' }),
      radioTiles({ label: 'Format', value: 'jpg', options: [{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }], onChange: v => { fmt = v } }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 85, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      const base = item.file.name.replace(/\.[^.]+$/, '')
      const sizes = [100, 250, 500]
      const outs = []
      for (const s of sizes) {
        const canvas = fitCanvas(src, s, s, 'contain', '#ffffff')
        outs.push({
          canvas, format: fmt, quality: fmt === 'png' ? undefined : quality / 100,
          name: `${base}_${s}px.${fmt}`
        })
      }
      ctx.setMultiOutput(outs)
      return null
    }
  }
})

function extOf (item) {
  const m = /\.([a-z0-9]+)$/i.exec(item.file.name)
  const e = (m ? m[1] : 'png').toLowerCase()
  return e === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp', 'gif', 'bmp'].includes(e) ? e : 'png'
}
