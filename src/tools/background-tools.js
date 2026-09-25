// Background tools. All local: color-key sampling + flood fill + feathering
// (lib/background.js). Honest capability notes in each UI.
import { el, debounce } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { loadItem } from './shared.js'
import { imageToCanvas } from '../lib/engine.js'
import { sampleBorderColor, floodRemove, globalKeyRemove, compositeOver, solidBackground, gradientBackground } from '../lib/background.js'
import { colorField, sliderRow, toggle, radioTiles } from '../components/controls.js'
import { previewBox } from '../components/preview.js'
import { createUploadZone } from '../components/upload.js'
import { toast } from '../components/toast.js'

export const TOOL_IMPLS = {}

// Core interactive pipeline: sample/click a key color → tolerance/feather →
// live preview → export over a chosen background. Fully local.
function keyingTool ({ withBackground = false, defaultBg = '#ffffff', bgLocked = null, title = '' } = {}) {
  return function mount () {
    const main = el('div')
    const side = el('div', { class: 'tool-side' })
    const out = el('div', { class: 'mt-3' })
    const state = {
      key: null,
      tolerance: 42,
      feather: 1,
      global: false,
      bg: defaultBg,
      bgMode: withBackground ? 'color' : 'transparent',
      gradA: '#a5b4fc',
      gradB: '#fbcfe8',
      gradAngle: 135,
      bgImage: null
    }
    let sourceCanvas = null
    let fileName = 'image'
    let outputs = []
    let blobUrl = null

    const preview = previewBox()

    async function processNow () {
      if (!sourceCanvas || !state.key) return
      const data = sourceCanvas.getContext('2d').getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
      const work = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height)
      if (state.global) globalKeyRemove(work, state.key, state.tolerance, state.feather)
      else floodRemove(work, state.key, state.tolerance, state.feather)

      let canvas = document.createElement('canvas')
      canvas.width = work.width; canvas.height = work.height
      canvas.getContext('2d').putImageData(work, 0, 0)

      const bg = bgLocked || (state.bgMode === 'color' ? state.bg : null)
      if (withBackground && bg) {
        canvas = compositeOver(canvas, solidBackground(bg))
      } else if (withBackground && state.bgMode === 'gradient') {
        canvas = compositeOver(canvas, gradientBackground(state.gradA, state.gradB, state.gradAngle))
      } else if (withBackground && state.bgMode === 'image' && state.bgImage) {
        canvas = compositeOver(canvas, (ctx, w, h) => {
          const s = Math.max(w / state.bgImage.naturalWidth, h / state.bgImage.naturalHeight)
          const dw = state.bgImage.naturalWidth * s
          const dh = state.bgImage.naturalHeight * s
          ctx.drawImage(state.bgImage, (w - dw) / 2, (h - dh) / 2, dw, dh)
        })
      }

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      blobUrl = URL.createObjectURL(blob)
      preview.set(blobUrl)
      outputs = [{ name: `${fileName}-${bgLocked ? 'white-bg' : 'nobg'}.png`, blob, url: blobUrl, width: canvas.width, height: canvas.height, format: 'png' }]
      renderActions()
    }
    const schedule = debounce(processNow, 240)

    // Click-to-pick on the preview: a real pipette.
    function pickFromPreview (clientX, clientY) {
      const img = preview.querySelector('img')
      if (!img || !sourceCanvas) { toast('Load an image first.', 'info'); return }
      const rect = img.getBoundingClientRect()
      const x = Math.floor((clientX - rect.left) * sourceCanvas.width / rect.width)
      const y = Math.floor((clientY - rect.top) * sourceCanvas.height / rect.height)
      if (x < 0 || y < 0 || x >= sourceCanvas.width || y >= sourceCanvas.height) return
      const d = sourceCanvas.getContext('2d').getImageData(x, y, 1, 1).data
      state.key = { r: d[0], g: d[1], b: d[2] }
      keyBtn.classList.add('btn-soft')
      keyBtn.lastChild.textContent = ` Key: ${hexOf(d[0], d[1], d[2])}`
      processNow()
    }

    preview.style.cursor = 'crosshair'
    preview.addEventListener('click', (e) => pickFromPreview(e.clientX, e.clientY))

    function sampleBorder () {
      if (!sourceCanvas) { toast('Load an image first.', 'info'); return }
      const data = sourceCanvas.getContext('2d').getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
      state.key = sampleBorderColor(data)
      if (state.key) {
        keyBtn.classList.add('btn-soft')
        keyBtn.lastChild.textContent = ` Key: ${hexOf(state.key.r, state.key.g, state.key.b)} (border)`
        processNow()
      }
    }

    const keyBtn = el('button', { class: 'btn btn-sm', onclick: sampleBorder }, icon('pipette', 14), ' Sample border color')
    const hint = el('p', { class: 'panel-note mt-1', text: title || 'Or click any background pixel on the preview to key that exact color.' })

    // ---- settings panel ----
    const settingsPanel = el('div', { class: 'panel' },
      el('h2', { text: '1 · Select the background' }),
      keyBtn,
      hint
    )
    settingsPanel.append(
      sliderRow({ label: 'Tolerance', min: 5, max: 120, value: state.tolerance, onInput: v => { state.tolerance = v; schedule() } }),
      sliderRow({ label: 'Edge feather', min: 0, max: 4, step: 1, value: state.feather, onInput: v => { state.feather = v; schedule() } }),
      toggle({ label: 'Remove every matching pixel (not just edge-connected)', value: false, onChange: v => { state.global = v; schedule() } })
    )

    // ---- background panel ----
    const bgControlsRoot = el('div', { class: 'mt-2' })
    function renderBgControls () {
      bgControlsRoot.replaceChildren()
      if (bgLocked) return
      if (state.bgMode === 'color') {
        bgControlsRoot.append(colorField({ label: 'Color', value: state.bg, onInput: v => { state.bg = v; schedule() } }))
      } else if (state.bgMode === 'gradient') {
        bgControlsRoot.append(
          colorField({ label: 'From', value: state.gradA, onInput: v => { state.gradA = v; schedule() } }),
          colorField({ label: 'To', value: state.gradB, onInput: v => { state.gradB = v; schedule() } }),
          sliderRow({ label: 'Angle', min: 0, max: 360, value: state.gradAngle, unit: '°', onInput: v => { state.gradAngle = v; schedule() } })
        )
      } else if (state.bgMode === 'image') {
        bgControlsRoot.append(createUploadZone({
          compact: true, label: 'Drop the background photo',
          onFiles: async (files) => {
            const item = await loadItem(files[0])
            if (!item.error) { state.bgImage = item.img; processNow() }
          }
        }))
      }
    }

    const bgPanel = el('div', { class: 'panel mt-3' })
    if (bgLocked) {
      bgPanel.append(
        el('h2', { text: '2 · Background' }),
        el('p', { class: 'panel-note', text: `Locked to ${bgLocked} (pure white) for marketplace-ready output.` })
      )
    } else if (withBackground) {
      bgPanel.append(
        el('h2', { text: '2 · New background' }),
        radioTiles({
          label: '', value: 'color',
          options: [
            { value: 'transparent', label: 'Transparent' },
            { value: 'color', label: 'Solid color' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Image' }
          ],
          onChange: v => { state.bgMode = v; renderBgControls(); schedule() }
        }),
        bgControlsRoot
      )
      renderBgControls()
    } else {
      bgPanel.append(
        el('h2', { text: '2 · Export' }),
        el('p', { class: 'panel-note', text: 'Output is PNG so the transparency is preserved.' })
      )
    }

    const dlBtn = el('button', {
      class: 'btn btn-primary btn-block mt-2', disabled: true,
      onclick: async () => {
        if (!outputs.length) return
        const { download } = await import('../core/utils.js')
        download(outputs[0].blob, outputs[0].name)
      }
    }, icon('download', 15), 'Download PNG')

    function renderActions () {
      out.replaceChildren()
      dlBtn.disabled = false
    }

    const uploadZone = createUploadZone({
      compact: true,
      label: 'Drop your image',
      onFiles: async (files) => {
        const item = await loadItem(files[0])
        if (item.error) { toast(item.error, 'err'); return }
        sourceCanvas = imageToCanvas(item.img)
        fileName = item.file.name.replace(/\.[^.]+$/, '')
        preview.set(sourceCanvas.toDataURL('image/png'))
        sampleBorder()
      }
    })

    main.append(uploadZone, el('div', { class: 'panel mt-3' }, el('h2', { text: 'Preview — click the background to key it' }), preview), out)
    side.append(settingsPanel, bgPanel, el('div', {}, dlBtn))

    return el('div', { class: 'tool-layout' }, main, side)
  }
}

function hexOf (r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

TOOL_IMPLS['transparent-background'] = keyingTool({ withBackground: false })
TOOL_IMPLS['background-color'] = keyingTool({ withBackground: true, defaultBg: '#4ade80' })
TOOL_IMPLS['gradient-background'] = keyingTool({ withBackground: true, defaultBg: '#a5b4fc' })
TOOL_IMPLS['background-image'] = keyingTool({ withBackground: true, defaultBg: '#ffffff' })
TOOL_IMPLS['product-white-background'] = keyingTool({ withBackground: true, bgLocked: '#ffffff' })

// Blur background: the keyed background region is blurred, subject stays sharp.
TOOL_IMPLS['blur-background'] = function () {
  const main = el('div')
  const side = el('div', { class: 'tool-side' })
  const preview = previewBox()
  let canvas = null
  let fileName = 'image'
  let radius = 14
  let key = null
  let outCanvas = null
  const dl = el('button', { class: 'btn btn-primary btn-block mt-2', disabled: true }, icon('download', 15), 'Download PNG')

  async function process () {
    if (!canvas || !key) return
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    const work = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height)
    floodRemove(work, key, 42, 0)
    const mask = document.createElement('canvas')
    mask.width = canvas.width; mask.height = canvas.height
    mask.getContext('2d').putImageData(work, 0, 0)

    const blurred = document.createElement('canvas')
    blurred.width = canvas.width; blurred.height = canvas.height
    const bctx = blurred.getContext('2d')
    bctx.filter = `blur(${radius}px)`
    bctx.drawImage(canvas, 0, 0)
    bctx.filter = 'none'

    const subj = document.createElement('canvas')
    subj.width = canvas.width; subj.height = canvas.height
    const sctx = subj.getContext('2d')
    sctx.drawImage(canvas, 0, 0)
    sctx.globalCompositeOperation = 'destination-in'
    sctx.drawImage(mask, 0, 0)

    const out = document.createElement('canvas')
    out.width = canvas.width; out.height = canvas.height
    const octx = out.getContext('2d')
    octx.drawImage(blurred, 0, 0)
    octx.drawImage(subj, 0, 0)

    outCanvas = out
    preview.set(out.toDataURL('image/png'))
    dl.disabled = false
  }
  const processD = debounce(process, 250)

  dl.onclick = async () => {
    if (!outCanvas) return
    const blob = await new Promise(res => outCanvas.toBlob(res, 'image/png'))
    const { download } = await import('../core/utils.js')
    download(blob, `${fileName}-blurbg.png`)
  }

  preview.style.cursor = 'crosshair'
  preview.addEventListener('click', (e) => {
    const img = preview.querySelector('img')
    if (!img || !canvas) { toast('Load an image first.', 'info'); return }
    const rect = img.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width)
    const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height)
    const d = canvas.getContext('2d').getImageData(Math.max(0, Math.min(canvas.width - 1, x)), Math.max(0, Math.min(canvas.height - 1, y)), 1, 1).data
    key = { r: d[0], g: d[1], b: d[2] }
    toast(`Background keyed to ${hexOf(d[0], d[1], d[2])} — processing`, 'info')
    process()
  })

  side.append(el('div', { class: 'panel' },
    el('h2', { text: 'Portrait blur' }),
    sliderRow({ label: 'Blur radius', min: 2, max: 40, value: radius, onInput: v => { radius = v; processD() } }),
    el('p', { class: 'panel-note mt-2', text: 'The border color is sampled as the background automatically; click the preview to key a different color. Works best on uniform backgrounds — a local algorithm, no AI claim.' })
  ), dl)

  main.append(createUploadZoneWrap())

  function createUploadZoneWrap () {
    const wrap = el('div')
    import('../components/upload.js').then(({ createUploadZone }) => {
      wrap.append(createUploadZone({
        compact: true,
        label: 'Drop a photo with a clear background',
        onFiles: async (files) => {
          const item = await loadItem(files[0])
          if (item.error) { toast(item.error, 'err'); return }
          canvas = imageToCanvas(item.img)
          fileName = item.file.name.replace(/\.[^.]+$/, '')
          preview.set(canvas.toDataURL('image/png'))
          const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
          key = sampleBorderColor(data)
          process()
        }
      }), el('div', { class: 'panel mt-3' }, el('h2', { text: 'Preview' }), preview))
    })
    return wrap
  }

  return el('div', { class: 'tool-layout' }, main, side)
}

// Magic eraser: manual brush-based erase to transparency.
TOOL_IMPLS['magic-eraser'] = function () {
  const main = el('div')
  const side = el('div', { class: 'tool-side' })
  const canvasWrap = el('div', { class: 'preview-box checker-bg', style: { padding: '0', minHeight: '320px', display: 'block' } })
  let canvas = null
  let drawing = false
  let size = 40
  let softness = 50
  let fileName = 'image'

  function setup (img) {
    canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    canvas.style.maxWidth = '100%'
    canvas.style.cursor = 'crosshair'
    canvasWrap.replaceChildren(canvas)

    const erase = (e) => {
      if (!drawing) return
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * canvas.width / rect.width
      const y = (e.clientY - rect.top) * canvas.height / rect.height
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      const g = ctx.createRadialGradient(x, y, 0, x, y, size)
      const inner = Math.max(0.01, 1 - softness / 100)
      g.addColorStop(0, 'rgba(0,0,0,1)')
      g.addColorStop(inner, 'rgba(0,0,0,1)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    canvas.addEventListener('pointerdown', (e) => { drawing = true; canvas.setPointerCapture(e.pointerId); erase(e) })
    canvas.addEventListener('pointermove', erase)
    canvas.addEventListener('pointerup', () => { drawing = false })
  }

  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop an image, then brush areas to erase',
      onFiles: async (files) => {
        const item = await loadItem(files[0])
        if (item.error) { toast(item.error, 'err'); return }
        fileName = item.file.name.replace(/\.[^.]+$/, '')
        setup(item.img)
      }
    }))
  })

  side.append(el('div', { class: 'panel' },
    el('h2', { text: 'Brush' }),
    sliderRow({ label: 'Size', min: 5, max: 200, value: size, onInput: v => { size = v } }),
    sliderRow({ label: 'Softness', min: 0, max: 100, value: softness, unit: '%', onInput: v => { softness = v } }),
    el('p', { class: 'panel-note mt-2', text: 'Erased areas become transparent (PNG output). For precise cutouts combine with the background keying tools.' }),
    el('button', {
      class: 'btn btn-primary btn-block mt-2',
      onclick: async () => {
        if (!canvas) { toast('Load an image first.', 'info'); return }
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        const { download } = await import('../core/utils.js')
        download(blob, `${fileName}-erased.png`)
      }
    }, icon('download', 15), 'Download PNG')
  ))

  main.append(canvasWrap)
  return el('div', { class: 'tool-layout' }, main, side)
}
