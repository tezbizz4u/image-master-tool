// Social Media tools: preset-driven resizers. Presets are editable data
// (lib/presets.js) because platform specs change.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { simpleTool, loadItem, outputName } from './shared.js'
import { imageToCanvas, canvasToBlob, fitCanvas, newCanvas } from '../lib/engine.js'
import { sliderRow, colorField, radioTiles, selectField, numberField } from '../components/controls.js'
import { previewBox } from '../components/preview.js'
import { createUploadZone } from '../components/upload.js'
import { toast } from '../components/toast.js'
import { SOCIAL_PRESETS } from '../lib/presets.js'

export const TOOL_IMPLS = {}

function socialResizer (platformKey, platformLabel) {
  return function mount () {
    const main = el('div')
    const side = el('div', { class: 'tool-side' })
    const preview = previewBox()
    const presets = SOCIAL_PRESETS[platformKey] || []
    const state = {
      preset: presets[0],
      fit: 'cover',
      zoom: 1,
      bg: '#ffffff',
      quality: 90,
      fmt: 'jpg'
    }
    let img = null
    let outCanvas = null

    const presetTiles = el('div', { class: 'radio-tiles' })
    function renderPresets () {
      presetTiles.replaceChildren(...presets.map(p =>
        el('label', { class: p.id === state.preset.id ? 'on' : '' },
          Object.assign(el('input', { type: 'radio', name: 'spreset', value: p.id, checked: p.id === state.preset.id }), {}),
          el('b', { text: p.label }),
          el('span', { text: `${p.width}×${p.height}` })
        )
      ))
      ;[...presetTiles.querySelectorAll('input')].forEach(input => {
        input.addEventListener('change', () => {
          state.preset = presets.find(p => p.id === input.value)
          presetTiles.querySelectorAll('label').forEach(l => l.classList.remove('on'))
          input.closest('label').classList.add('on')
          render()
        })
      })
    }

    async function render () {
      if (!img) { preview.set(null); return }
      const { width: W, height: H } = state.preset
      let canvas = fitCanvas(imageToCanvas(img), W, H, state.fit, state.fit === 'contain' ? state.bg : null)
      if (state.fit === 'cover' && state.zoom > 1) {
        const zoomed = newCanvas(W, H, null)
        const ctx = zoomed.getContext('2d')
        const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * state.zoom
        const dw = img.naturalWidth * s; const dh = img.naturalHeight * s
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
        canvas = zoomed
      }
      outCanvas = canvas
      preview.set(canvas.toDataURL('image/png'))
      dl.disabled = false
    }

    const dl = el('button', {
      class: 'btn btn-primary btn-block mt-2', disabled: true,
      onclick: async () => {
        if (!outCanvas) return
        const blob = await canvasToBlob(outCanvas, state.fmt, state.fmt === 'png' ? undefined : state.quality / 100)
        const { download } = await import('../core/utils.js')
        download(blob, `${platformKey}-${state.preset.id}.${state.fmt === 'jpeg' ? 'jpg' : state.fmt}`)
      }
    }, icon('download', 15), 'Download')

    const settingsPanel = el('div', { class: 'panel' },
      el('h2', { text: `${platformLabel} presets` }),
      el('p', { class: 'panel-note mb-2', text: 'Presets are editable data — if a platform changes specs, adjust the custom size below.' }),
      presetTiles,
      el('h2', { class: 'mt-3', text: 'Fit' }),
      radioTiles({
        label: '', value: 'cover',
        options: [{ value: 'cover', label: 'Cover', sub: 'fill & crop' }, { value: 'contain', label: 'Contain', sub: 'fit with padding' }],
        onChange: v => { state.fit = v; render() }
      }),
      colorField({ label: 'Padding color', value: '#ffffff', onInput: v => { state.bg = v; render() } })
    )

    const fmtPanel = el('div', { class: 'panel mt-3' },
      el('h2', { text: 'Export' }),
      radioTiles({ label: 'Format', value: 'jpg', options: [{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }], onChange: v => { state.fmt = v } }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { state.quality = v } }),
      el('div', { class: 'mt-2' }, dl)
    )
    const zoomRow = sliderRow({ label: 'Zoom (cover mode)', min: 1, max: 3, step: 0.05, value: 1, onInput: v => { state.zoom = v; render() } })
    settingsPanel.insertBefore(zoomRow, colorFieldAnchor(settingsPanel))

    import('../components/upload.js').then(({ createUploadZone }) => {
      main.append(createUploadZone({
        compact: true,
        label: `Drop an image for ${platformLabel}`,
        onFiles: async (files) => {
          const item = await loadItem(files[0])
          if (item.error) { toast(item.error, 'err'); return }
          img = item.img
          render()
        }
      }), el('div', { class: 'panel mt-3' }, el('h2', { text: 'Preview' }), preview))
    })

    renderPresets()
    side.append(settingsPanel, fmtPanel)
    return el('div', { class: 'tool-layout' }, main, side)
  }
}

let zoomRow
TOOL_IMPLS['instagram-resizer'] = socialResizer('instagram', 'Instagram')
TOOL_IMPLS['youtube-resizer'] = socialResizer('youtube', 'YouTube')
TOOL_IMPLS['facebook-resizer'] = socialResizer('facebook', 'Facebook')
TOOL_IMPLS['linkedin-resizer'] = socialResizer('linkedin', 'LinkedIn')
TOOL_IMPLS['twitter-resizer'] = socialResizer('x', 'X / Twitter')
TOOL_IMPLS['pinterest-resizer'] = socialResizer('pinterest', 'Pinterest')
TOOL_IMPLS['whatsapp-resizer'] = socialResizer('whatsapp', 'WhatsApp')

// Custom social resize: exact WxH with strategies, batch-capable via scaffold.
function colorFieldAnchor (panel) { return panel.lastChild }

TOOL_IMPLS['custom-social-resize'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let W = 1200; let H = 630; let mode = 'cover'; let bg = '#ffffff'; let fmt = 'jpg'; let quality = 90
    panel.append(
      el('div', { class: 'grid-2' },
        numberField({ label: 'Width (px)', value: W, min: 16, max: 8192, onInput: v => { W = v || 1200 } }),
        numberField({ label: 'Height (px)', value: H, min: 16, max: 8192, onInput: v => { H = v || 630 } })
      ),
      radioTiles({
        label: 'Fit', value: 'cover',
        options: [{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }, { value: 'stretch', label: 'Stretch' }],
        onChange: v => { mode = v }
      }),
      colorField({ label: 'Background (contain)', value: bg, onInput: v => { bg = v } }),
      radioTiles({ label: 'Format', value: 'jpg', options: [{ value: 'jpg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }], onChange: v => { fmt = v } }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const canvas = fitCanvas(imageToCanvas(item.img), W, H, mode, mode === 'contain' ? bg : null)
      return { canvas, format: fmt, quality: fmt === 'png' ? undefined : quality / 100, name: `${W}x${H}-${outputName(item.file, fmt)}` }
    }
  }
})
