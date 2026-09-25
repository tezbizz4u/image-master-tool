// Effects & Filters tools. Pixel work runs in the worker; each tool gets a
// debounced live preview as its controls move.
import { el, debounce } from '../core/utils.js'
import { simpleTool, outputName } from './shared.js'
import { imageToCanvas } from '../lib/engine.js'
import { runWorker } from '../lib/worker-client.js'
import { sliderRow, colorField, toggle, radioTiles } from '../components/controls.js'
import { previewBox } from '../components/preview.js'

export const TOOL_IMPLS = {}

function effectTool ({ op, params, ui }) {
  return simpleTool({
    settings (panel, ctx) {
      const state = { ...params }
      let fmt = 'keep'
      let quality = 92

      const preview = previewBox()
      const previewWrap = el('div', { class: 'mt-2' },
        el('label', { style: { fontSize: '12.5px', fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }, text: 'Live preview' }),
        preview)
      let sourceCanvas = null
      let sourceItem = null

      async function schedule () {
        const items = ctx.getItems().filter(i => !i.error)
        if (!items.length) { sourceCanvas = null; return }
        if (sourceItem !== items[0]) {
          sourceItem = items[0]
          sourceCanvas = imageToCanvas(items[0].img)
        }
        if (!sourceCanvas) return
        try {
          const data = sourceCanvas.getContext('2d').getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
          const transfer = [data.data.buffer]
          const result = await runWorker(op, { ...state, imageData: data }, transfer)
          const c = document.createElement('canvas')
          c.width = result.width; c.height = result.height
          c.getContext('2d').putImageData(new ImageData(result.data, result.width, result.height), 0, 0)
          preview.set(c.toDataURL('image/png'))
        } catch { /* preview failures are non-fatal */ }
      }
      const scheduleDebounced = debounce(schedule, 180)

      ui(panel, state, scheduleDebounced)
      panel.append(
        el('div', { class: 'field' },
          el('label', { text: 'Output format' }),
          radioTiles({
            label: '',
            value: 'keep',
            options: [{ value: 'keep', label: 'Keep' }, { value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }],
            onChange: v => { fmt = v }
          })),
        sliderRow({ label: 'Quality (JPG/WebP)', min: 10, max: 100, value: 92, onInput: v => { quality = v } }),
        previewWrap
      )

      ctx.notify = scheduleDebounced

      ctx.process = async (item) => {
        let canvas = imageToCanvas(item.img)
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
        const transfer = [data.data.buffer]
        const result = await runWorker(op, { ...state, imageData: data }, transfer)
        canvas = document.createElement('canvas')
        canvas.width = result.width; canvas.height = result.height
        canvas.getContext('2d').putImageData(new ImageData(result.data, result.width, result.height), 0, 0)
        const format = fmt === 'keep' ? extOf(item) : fmt
        return { canvas, format, quality: format === 'png' ? undefined : quality / 100, name: outputName(item.file, format) }
      }
    }
  })
}

const EFFECTS = {
  'blur-image': {
    op: 'blur',
    params: { radius: 6 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Blur radius', min: 1, max: 40, value: 6, onInput: v => { state.radius = v; refresh() } }))
    }
  },
  'motion-blur': {
    op: 'motionBlur',
    params: { distance: 12, angle: 0 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Distance', min: 2, max: 60, value: 12, onInput: v => { state.distance = v; refresh() } }),
        sliderRow({ label: 'Angle', min: 0, max: 360, value: 0, unit: '°', onInput: v => { state.angle = v; refresh() } })
      )
    }
  },
  'pixelate': {
    op: 'pixelate',
    params: { blockSize: 12 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Block size', min: 2, max: 60, value: 12, onInput: v => { state.blockSize = v; refresh() } }))
    }
  },
  'sharpen-image': {
    op: 'sharpen',
    params: { amount: 60 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Sharpen amount', min: 10, max: 200, value: 60, onInput: v => { state.amount = v; refresh() } }))
    }
  },
  'add-noise': {
    op: 'noise',
    params: { amount: 30, monochrome: true },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Amount', min: 2, max: 120, value: 30, onInput: v => { state.amount = v; refresh() } }),
        toggle({ label: 'Monochrome grain', value: true, onChange: v => { state.monochrome = v; refresh() } })
      )
    }
  },
  'vignette': {
    op: 'vignette',
    params: { size: 45, softness: 55 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Size', min: 0, max: 100, value: 45, onInput: v => { state.size = v; refresh() } }),
        sliderRow({ label: 'Softness', min: 5, max: 100, value: 55, onInput: v => { state.softness = v; refresh() } })
      )
    }
  },
  'glitch-effect': {
    op: 'glitch',
    params: { shift: 12, slices: 6, intensity: 30, scanlines: 20 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'RGB shift', min: 0, max: 40, value: 12, onInput: v => { state.shift = v; refresh() } }),
        sliderRow({ label: 'Slices', min: 0, max: 20, value: 6, onInput: v => { state.slices = v; refresh() } }),
        sliderRow({ label: 'Slice intensity', min: 0, max: 100, value: 30, onInput: v => { state.intensity = v; refresh() } }),
        sliderRow({ label: 'Scanlines', min: 0, max: 60, value: 20, onInput: v => { state.scanlines = v; refresh() } })
      )
    }
  },
  'posterize': {
    op: 'posterize',
    params: { levels: 5 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Tone levels', min: 2, max: 16, value: 5, onInput: v => { state.levels = v; refresh() } }))
    }
  },
  'solarize': {
    op: 'solarize',
    params: { threshold: 128 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Threshold', min: 10, max: 250, value: 128, onInput: v => { state.threshold = v; refresh() } }))
    }
  },
  'duotone': {
    op: 'duotone',
    params: { dark: '#1e1b4b', light: '#e0e7ff' },
    ui: (panel, state, refresh) => {
      panel.append(
        colorField({ label: 'Shadow color', value: state.dark, onInput: v => { state.dark = v; refresh() } }),
        colorField({ label: 'Highlight color', value: state.light, onInput: v => { state.light = v; refresh() } })
      )
    }
  },
  'sketch-effect': {
    op: 'sketch',
    params: { blurRadius: 8 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Detail', min: 2, max: 20, value: 8, onInput: v => { state.blurRadius = v; refresh() } }))
    }
  },
  'oil-painting': {
    op: 'kuwahara',
    params: { radius: 4 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Brush size', min: 2, max: 10, value: 4, onInput: v => { state.radius = v; refresh() } }),
        el('p', { class: 'panel-note', text: 'Kuwahara filter — larger brushes take longer on big images.' })
      )
    }
  },
  'cartoon-effect': {
    op: 'cartoon',
    params: { levels: 8, edge: 60 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Color levels', min: 3, max: 16, value: 8, onInput: v => { state.levels = v; refresh() } }),
        sliderRow({ label: 'Edge strength', min: 0, max: 100, value: 60, onInput: v => { state.edge = v; refresh() } })
      )
    }
  },
  'edge-detect': {
    op: 'edge',
    params: { strength: 1 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Strength', min: 0.2, max: 3, step: 0.1, value: 1, onInput: v => { state.strength = v; refresh() } }))
    }
  },
  'emboss': {
    op: 'emboss',
    params: { depth: 1, azimuth: 135 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Depth', min: 0.2, max: 4, step: 0.1, value: 1, onInput: v => { state.depth = v; refresh() } }),
        sliderRow({ label: 'Light angle', min: 0, max: 360, value: 135, unit: '°', onInput: v => { state.azimuth = v; refresh() } })
      )
    }
  },
  'grayscale': { op: 'grayscale', params: {}, ui: (panel, state, refresh) => {} },
  'sepia': {
    op: 'sepia',
    params: { strength: 85 },
    ui: (panel, state, refresh) => {
      panel.append(sliderRow({ label: 'Strength', min: 10, max: 100, value: 85, unit: '%', onInput: v => { state.strength = v; refresh() } }))
    }
  },
  'color-overlay': {
    op: 'overlay',
    params: { color: '#4338ca', opacity: 40 },
    ui: (panel, state, refresh) => {
      panel.append(
        colorField({ label: 'Overlay color', value: state.color, onInput: v => { state.color = v; refresh() } }),
        sliderRow({ label: 'Opacity', min: 5, max: 100, value: 40, unit: '%', onInput: v => { state.opacity = v; refresh() } })
      )
    }
  },
  'adjust-colors': {
    op: 'adjust',
    params: { brightness: 0, contrast: 0, saturation: 0, exposure: 0, gamma: 1, temperature: 0, tint: 0, vibrance: 0, highlights: 0, shadows: 0 },
    ui: (panel, state, refresh) => {
      panel.append(
        sliderRow({ label: 'Brightness', min: -100, max: 100, value: 0, onInput: v => { state.brightness = v; refresh() } }),
        sliderRow({ label: 'Contrast', min: -100, max: 100, value: 0, onInput: v => { state.contrast = v; refresh() } }),
        sliderRow({ label: 'Saturation', min: -100, max: 100, value: 0, onInput: v => { state.saturation = v; refresh() } }),
        sliderRow({ label: 'Exposure', min: -2, max: 2, step: 0.05, value: 0, onInput: v => { state.exposure = v; refresh() } }),
        sliderRow({ label: 'Highlights', min: -100, max: 100, value: 0, onInput: v => { state.highlights = v; refresh() } }),
        sliderRow({ label: 'Shadows', min: -100, max: 100, value: 0, onInput: v => { state.shadows = v; refresh() } }),
        sliderRow({ label: 'Temperature', min: -100, max: 100, value: 0, onInput: v => { state.temperature = v; refresh() } }),
        sliderRow({ label: 'Tint', min: -100, max: 100, value: 0, onInput: v => { state.tint = v; refresh() } }),
        sliderRow({ label: 'Vibrance', min: -100, max: 100, value: 0, onInput: v => { state.vibrance = v; refresh() } }),
        sliderRow({ label: 'Gamma', min: 0.2, max: 2.5, step: 0.05, value: 1, onInput: v => { state.gamma = v; refresh() } })
      )
    }
  }
}

for (const [slug, def] of Object.entries(EFFECTS)) {
  TOOL_IMPLS[slug] = effectTool(def)
}

function extOf (item) {
  const m = /\.([a-z0-9]+)$/i.exec(item.file.name)
  const e = (m ? m[1] : 'png').toLowerCase()
  return e === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp', 'gif', 'bmp'].includes(e) ? e : 'png'
}
