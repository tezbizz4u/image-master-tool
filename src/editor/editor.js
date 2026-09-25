// IMAGE MASTER TOOL — Editor.
// Layer-based editor: raster base + object layers (image/text/shape/draw).
// Desktop: left tools / canvas / right properties. Mobile: slide-over panels.
import { el, clamp, uid, fmtBytes } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { canvasToBlob, newCanvas, drawText, roundRectPath } from '../lib/engine.js'
import { runWorker } from '../lib/worker-client.js'
import { sliderRow, colorField, selectField, numberField, toggle } from '../components/controls.js'
import { toast } from '../components/toast.js'
import { createUploadZone } from '../components/upload.js'
import { track, EVENTS } from '../core/analytics.js'

export default function editorPage () {
  // ---------- state ----------
  const doc = {
    width: 1200,
    height: 800,
    background: '#ffffff',
    layers: [],
    selection: null
  }
  let zoom = 1
  let fitMode = true
  let showGrid = false
  let activeTool = 'move'
  let toolOpts = { color: '#e11d48', size: 8, fontSize: 64, fontFamily: 'Arial, sans-serif', opacity: 1 }
  let history = []
  let hIndex = -1

  // ---------- dom ----------
  const canvas = el('canvas', { id: 'ed-canvas' })
  const ctx = canvas.getContext('2d')
  const scrollWrap = el('div', { class: 'ed-canvas-scroll' }, canvas)
  const canvasWrap = el('div', { class: 'ed-canvas-wrap' }, scrollWrap)

  const undoBtn = el('button', { class: 'icon-btn', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: () => undo() }, icon('undo', 16))
  const redoBtn = el('button', { class: 'icon-btn', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', onclick: () => redo() }, icon('redo', 16))
  const zoomOut = el('button', { class: 'icon-btn', title: 'Zoom out', onclick: () => setZoom(zoom / 1.25) }, icon('zoom-out', 16))
  const zoomIn = el('button', { class: 'icon-btn', title: 'Zoom in', onclick: () => setZoom(zoom * 1.25) }, icon('zoom-in', 16))
  const zoomFit = el('button', { class: 'btn btn-sm', onclick: () => { fitToScreen() } }, 'Fit')
  const zoom100 = el('button', { class: 'btn btn-sm', onclick: () => setZoom(1) }, '100%')

  function fitToScreen () {
    fitMode = true
    const wrap = scrollWrap
    const availW = wrap.clientWidth - 60
    const availH = wrap.clientHeight - 60
    if (availW <= 0 || availH <= 0) { render(); return }
    zoom = clamp(Math.min(availW / doc.width, availH / doc.height), 0.05, 8)
    render()
  }

  const statusbar = el('div', { class: 'ed-status' },
    el('span', { id: 'ed-pos', text: '0, 0' }),
    el('span', { id: 'ed-dim' }),
    el('span', { id: 'ed-zoom' }),
    el('span', { id: 'ed-layers' }),
    el('span', { class: 'ed-statusbar-btns' }, undoBtn, redoBtn)
  )

  // left tools
  const TOOLS = [
    ['move', 'move', 'Move / select', 'V'],
    ['crop', 'crop', 'Crop (drag on canvas)', 'C'],
    ['brush', 'brush', 'Brush', 'B'],
    ['pencil', 'pen', 'Pencil', 'P'],
    ['marker', 'brush', 'Marker', 'M'],
    ['eraser', 'eraser', 'Eraser (raster)', 'E'],
    ['line', 'minus', 'Line', 'L'],
    ['arrow', 'arrow-right', 'Arrow', 'A'],
    ['rect', 'square', 'Rectangle', 'R'],
    ['circle', 'circle', 'Ellipse', 'O'],
    ['star', 'starshape', 'Star', 'S'],
    ['highlight', 'zap', 'Highlighter', 'H'],
    ['text', 'type', 'Text', 'T']
  ]
  const toolsCol = el('div', { class: 'ed-tools' })
  const toolButtons = {}
  for (const [id, ic, label, kbd] of TOOLS) {
    const b = el('button', { class: 'ed-tool-btn', onclick: () => selectTool(id) },
      icon(ic, 16), el('span', { text: label }), el('span', { class: 't-kbd kbd', text: kbd }))
    toolButtons[id] = b
    toolsCol.append(b)
  }

  const layerList = el('div')
  const props = el('div')

  const leftSide = el('div', { class: 'ed-side' },
    el('div', { class: 'ed-group-label', text: 'Tools' }),
    toolsCol,
    el('div', { class: 'ed-divider' }),
    el('div', { class: 'ed-group-label', text: 'Document' }),
    addImageBtn(),
    resizeDocBtn(),
    el('button', { class: 'ed-tool-btn', onclick: () => applyCrop() }, icon('crop', 16), el('span', { text: 'Apply crop' })),
    el('div', { class: 'ed-divider' }),
    el('div', { class: 'ed-group-label', text: 'Layers' }),
    layersPanel()
  )

  const leftToggle = el('button', { class: 'ed-side-toggle', onclick: () => leftSide.classList.toggle('open') }, icon('layers', 15), 'Tools & layers')
  const rightToggle = el('button', { class: 'ed-side-toggle', onclick: () => rightSide.classList.toggle('open') }, icon('sliders', 15), 'Properties')

  const exportBtn = el('button', { class: 'btn btn-primary btn-sm', onclick: exportDialog }, icon('download', 15), 'Export')

  const topbar = el('div', { class: 'ed-topbar' },
    el('a', { class: 'btn btn-sm', href: '#/' }, icon('chevron-left', 14), 'Exit'),
    leftToggle,
    el('div', { class: 'row', style: { marginLeft: 'auto', gap: '6px' } },
      zoomOut, el('span', { id: 'ed-zoom-label', class: 'muted', style: { minWidth: '46px', textAlign: 'center' }, text: '100%' }), zoomIn, zoomFit, zoom100),
    rightToggle,
    exportBtn
  )

  const mobileBar = el('div', { class: 'ed-toolbar-mobile' },
    el('button', { class: 'icon-btn', title: 'Undo', onclick: () => undo() }, icon('undo', 16)),
    el('button', { class: 'icon-btn', title: 'Redo', onclick: () => redo() }, icon('redo', 16)),
    el('button', { class: 'btn btn-sm', onclick: () => fitToScreen() }, 'Fit')
  )

  // ---------- layers ----------
  function addLayer (layer) {
    doc.layers.push(layer)
    doc.selection = layer.id
    pushHistory()
    render()
  }

  function rasterLayerFromImage (img, name) {
    return { id: uid(), type: 'raster', name, img, x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight, opacity: 1, rotation: 0, visible: true, locked: false }
  }

  function addImageBtn () {
    const b = el('button', { class: 'ed-tool-btn', onclick: () => {
      const input = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } })
      input.onchange = async () => {
        const file = input.files[0]
        if (!file) return
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file) })
        if (doc.layers.length === 0) {
          doc.width = img.naturalWidth; doc.height = img.naturalHeight
        }
        addLayer(rasterLayerFromImage(img, file.name.slice(0, 24)))
      }
      input.click()
    } }, icon('image', 16), el('span', { text: 'Add image layer' }))
    return b
  }

  function resizeDocBtn () {
    return el('button', { class: 'ed-tool-btn', onclick: () => {
      const w = prompt('Document width (px):', doc.width)
      if (!w) return
      const h = prompt('Document height (px):', doc.height)
      if (!h) return
      doc.width = clamp(parseInt(w) || doc.width, 1, 8192)
      doc.height = clamp(parseInt(h) || doc.height, 1, 8192)
      pushHistory(); render()
    } }, icon('maximize', 16), el('span', { text: 'Canvas size' }))
  }

  function layersPanel () {
    layerList.className = 'ed-tools'
    return layerList
  }

  function renderLayers () {
    layerList.replaceChildren()
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i]
      const item = el('div', { class: `layer-item${doc.selection === l.id ? ' sel' : ''}`, onclick: () => { doc.selection = l.id; renderLayers(); renderProps() } },
        el('span', { class: 'li-name', text: layerLabel(l) }),
        el('span', { class: 'li-btns' },
          el('button', { title: l.visible ? 'Hide' : 'Show', onclick: (e) => { e.stopPropagation(); l.visible = !l.visible; pushHistory(); render() } }, icon(l.visible ? 'eye' : 'eye-off', 13)),
          el('button', { title: l.locked ? 'Unlock' : 'Lock', onclick: (e) => { e.stopPropagation(); l.locked = !l.locked; renderLayers() } }, icon(l.locked ? 'lock' : 'unlock', 13)),
          el('button', { title: 'Duplicate', onclick: (e) => { e.stopPropagation(); const copy = JSON.parse(JSON.stringify(l)); copy.id = uid(); copy.name = l.name + ' copy'; doc.layers.splice(i + 1, 0, copy); doc.selection = copy.id; pushHistory(); render() } }, icon('copy', 13)),
          el('button', { title: 'Delete', onclick: (e) => { e.stopPropagation(); doc.layers.splice(i, 1); if (doc.selection === l.id) doc.selection = null; pushHistory(); render() } }, icon('trash', 13))
        )
      )
      layerList.append(item)
    }
    if (!doc.layers.length) {
      layerList.append(el('p', { class: 'muted', text: 'No layers yet. Open an image to start.' }))
    }
  }

  function layerLabel (l) {
    return l.type === 'text' ? `T · ${String(l.text).slice(0, 14)}` : l.type === 'shape' ? `${l.shape} · ${l.name || ''}` : l.name || l.type
  }

  // ---------- properties ----------
  function propsPanel () { return props }

  function renderProps () {
    const l = doc.layers.find(x => x.id === doc.selection)
    props.replaceChildren()
    if (!l) {
      props.append(el('p', { class: 'muted', text: 'Select a layer to edit its properties.' }))
      return
    }
    const num = (label, key, min, max) => numberField({ label, value: l[key] ?? 0, min, max, onInput: v => { l[key] = v; pushHistoryDebounced(); render() } })
    props.append(
      el('h2', { text: layerLabel(l) }),
      num('X', 'x', -4000, 8000), num('Y', 'y', -4000, 8000),
      num('Width', 'width', 1, 8192), num('Height', 'height', 1, 8192),
      sliderRow({ label: 'Rotation', min: -180, max: 180, value: l.rotation || 0, unit: '°', onInput: v => { l.rotation = v; pushHistoryDebounced(); render() } }),
      sliderRow({ label: 'Opacity', min: 0, max: 100, value: (l.opacity ?? 1) * 100, unit: '%', onInput: v => { l.opacity = v / 100; pushHistoryDebounced(); render() } })
    )
    if (l.type === 'text') {
      props.append(
        el('div', { class: 'field' }, el('label', { text: 'Text' }),
          el('textarea', { class: 'input', rows: 2, oninput: e => { l.text = e.target.value; pushHistoryDebounced(); render() } }, l.text)),
        selectField({ label: 'Font', value: l.font, options: ['Arial, sans-serif', 'Georgia, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif'].map(f => ({ value: f, label: f.split(',')[0] })), onChange: v => { l.font = v; render() } }),
        num('Font size', 'fontSize', 8, 400),
        colorField({ label: 'Color', value: l.color, onInput: v => { l.color = v; render() } }),
        num('Outline width', 'strokeWidth', 0, 24),
        colorField({ label: 'Outline color', value: l.strokeColor || '#000000', onInput: v => { l.strokeColor = v; render() } }),
        sliderRow({ label: 'Letter spacing', min: -5, max: 40, value: l.letterSpacing || 0, onInput: v => { l.letterSpacing = v; render() } }),
        sliderRow({ label: 'Curve', min: 0, max: 100, value: l.curve || 0, onInput: v => { l.curve = v; render() } })
      )
    }
    if (l.type === 'shape') {
      props.append(
        colorField({ label: 'Fill', value: l.fill, onInput: v => { l.fill = v; render() } }),
        colorField({ label: 'Stroke', value: l.stroke, onInput: v => { l.stroke = v; render() } }),
        num('Stroke width', 'strokeWidth', 0, 60)
      )
    }
    if (l.type === 'draw') {
      props.append(colorField({ label: 'Color', value: l.color, onInput: v => { l.color = v; render() } }))
    }
  }

  // ---------- adjustments & filters ----------
  const adjustState = { brightness: 0, contrast: 0, saturation: 0, exposure: 0, temperature: 0, gamma: 1, vibrance: 0, highlights: 0, shadows: 0 }
  function adjustPanel () {
    const p = el('div')
    p.append(
      sliderRow({ label: 'Brightness', min: -100, max: 100, value: 0, onInput: v => { adjustState.brightness = v; render() } }),
      sliderRow({ label: 'Contrast', min: -100, max: 100, value: 0, onInput: v => { adjustState.contrast = v; render() } }),
      sliderRow({ label: 'Saturation', min: -100, max: 100, value: 0, onInput: v => { adjustState.saturation = v; render() } }),
      sliderRow({ label: 'Exposure', min: -2, max: 2, step: 0.05, value: 0, onInput: v => { adjustState.exposure = v; render() } }),
      sliderRow({ label: 'Temperature', min: -100, max: 100, value: 0, onInput: v => { adjustState.temperature = v; render() } }),
      sliderRow({ label: 'Vibrance', min: -100, max: 100, value: 0, onInput: v => { adjustState.vibrance = v; render() } }),
      sliderRow({ label: 'Highlights', min: -100, max: 100, value: 0, onInput: v => { adjustState.highlights = v; render() } }),
      sliderRow({ label: 'Shadows', min: -100, max: 100, value: 0, onInput: v => { adjustState.shadows = v; render() } }),
      sliderRow({ label: 'Gamma', min: 0.2, max: 2.5, step: 0.05, value: 1, onInput: v => { adjustState.gamma = v; render() } }),
      el('button', { class: 'btn btn-sm btn-block mt-1', onclick: applyAdjustmentsToBase }, 'Bake into image')
    )
    return p
  }

  async function applyAdjustmentsToBase () {
    const l = doc.layers.find(x => x.type === 'raster')
    if (!l) { toast('Open an image first — adjustments bake into the raster layer.', 'info'); return }
    const c = newCanvas(l.width, l.height)
    c.getContext('2d').drawImage(l.img, 0, 0)
    const data = c.getContext('2d').getImageData(0, 0, l.width, l.height)
    const transfer = [data.data.buffer]
    const result = await runWorker('adjust', { imageData: data, adjustments: adjustState }, transfer)
    const out = document.createElement('canvas')
    out.width = result.width; out.height = result.height
    out.getContext('2d').putImageData(new ImageData(result.data, result.width, result.height), 0, 0)
    l.img = out
    pushHistory(); render()
    toast('Adjustments baked into the image', 'ok')
  }

  function filterPanel () {
    const looks = ['vintage', 'cinematic', 'dramatic', 'warm', 'cool', 'fade', 'noir', 'retro']
    const strength = { v: 80 }
    const p = el('div')
    const row = el('div', { class: 'row wrap', style: { gap: '6px' } })
    for (const look of looks) {
      row.append(el('button', { class: 'btn btn-sm', onclick: async () => {
        const l = doc.layers.find(x => x.type === 'raster')
        if (!l) { toast('Open an image first.', 'info'); return }
        const c = newCanvas(l.width, l.height)
        c.getContext('2d').drawImage(l.img, 0, 0)
        const data = c.getContext('2d').getImageData(0, 0, l.width, l.height)
        const transfer = [data.data.buffer]
        const result = await runWorker('look', { imageData: data, look, strength: strength.v }, transfer)
        const out = document.createElement('canvas')
        out.width = result.width; out.height = result.height
        out.getContext('2d').putImageData(new ImageData(result.data, result.width, result.height), 0, 0)
        l.img = out
        pushHistory(); render()
      } }, look))
    }
    p.append(
      el('p', { class: 'panel-note', text: 'Filters apply to the raster layer immediately.' }),
      row,
      sliderRow({ label: 'Filter strength', min: 10, max: 100, value: 80, onInput: v => { strength.v = v } })
    )
    return p
  }

  const rightSide = el('div', { class: 'ed-side right' },
    el('div', { class: 'ed-group-label', text: 'Properties' }),
    propsPanel(),
    el('div', { class: 'ed-divider' }),
    el('div', { class: 'ed-group-label', text: 'Adjustments & filters (flatten)' }),
    adjustPanel(),
    filterPanel()
  )

  // ---------- rendering ----------
  function setZoom (z) {
    fitMode = false
    zoom = clamp(z, 0.05, 8)
    render()
  }

  function render () {
    canvas.width = doc.width
    canvas.height = doc.height
    canvas.style.width = `${doc.width * zoom}px`
    canvas.style.height = `${doc.height * zoom}px`
    ctx.fillStyle = doc.background
    ctx.fillRect(0, 0, doc.width, doc.height)

    for (const l of doc.layers) {
      if (!l.visible) continue
      ctx.save()
      ctx.globalAlpha = l.opacity ?? 1
      const cx = (l.x ?? 0) + (l.width ?? 0) / 2
      const cy = (l.y ?? 0) + (l.height ?? 0) / 2
      if (l.rotation) {
        ctx.translate(cx, cy)
        ctx.rotate((l.rotation || 0) * Math.PI / 180)
        ctx.translate(-cx, -cy)
      }
      if (l.type === 'raster') {
        ctx.drawImage(l.img, l.x, l.y, l.width, l.height)
      } else if (l.type === 'text') {
        if (l.curve > 0) drawCurvedText(ctx, l)
        else {
          drawText(ctx, {
            text: l.text, x: l.x, y: l.y, size: l.fontSize, color: l.color, font: l.font,
            weight: l.weight || '700', stroke: l.strokeColor || '#000', strokeWidth: l.strokeWidth || 0,
            letterSpacing: l.letterSpacing || 0, opacity: 1
          }, doc.width, doc.height)
        }
      } else if (l.type === 'shape') {
        drawShape(ctx, l)
      } else if (l.type === 'draw') {
        drawPath(ctx, l)
      }
      ctx.restore()
    }

    // selection outline
    const sel = doc.layers.find(x => x.id === doc.selection)
    if (sel && activeTool === 'move' && sel.type !== 'draw') {
      ctx.save()
      ctx.strokeStyle = '#6366f1'
      ctx.setLineDash([6, 4])
      ctx.lineWidth = 2 / zoom * 1.4
      ctx.strokeRect(sel.x - 2, sel.y - 2, (sel.width || 10) + 4, (sel.height || 10) + 4)
      ctx.restore()
    }

    if (showGrid) drawGrid()
    if (activeTool === 'crop') drawCropOverlay()

    const dimEl = document.getElementById('ed-dim')
    if (dimEl) dimEl.textContent = `${doc.width} × ${doc.height}`
    const zoomEl = document.getElementById('ed-zoom')
    if (zoomEl) zoomEl.textContent = `${Math.round(zoom * 100)}%`
    const layersEl = document.getElementById('ed-layers')
    if (layersEl) layersEl.textContent = `${doc.layers.length} layer${doc.layers.length === 1 ? '' : 's'}`
    const zoomLabel = document.getElementById('ed-zoom-label')
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`
    renderLayers()
    renderProps()
    undoBtn.disabled = hIndex <= 0
    redoBtn.disabled = hIndex >= history.length - 1
  }

  function drawGrid () {
    ctx.save()
    ctx.strokeStyle = 'rgba(99,102,241,.25)'
    ctx.lineWidth = 1
    const step = Math.max(20, 1000 / (zoom * 10))
    for (let x = 0; x < doc.width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, doc.height); ctx.stroke() }
    for (let y = 0; y < doc.height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(doc.width, y); ctx.stroke() }
    ctx.restore()
  }

  function drawShape (ctx, l) {
    ctx.fillStyle = l.fill
    ctx.strokeStyle = l.stroke
    ctx.lineWidth = l.strokeWidth || 0
    const { x, y, width: w, height: h } = l
    if (l.shape === 'rect') {
      roundRectPath(ctx, x, y, w, h, l.radius || 0)
      ctx.fill(); if (l.strokeWidth) ctx.stroke()
    } else if (l.shape === 'circle') {
      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      ctx.fill(); if (l.strokeWidth) ctx.stroke()
    } else if (l.shape === 'line') {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h)
      ctx.strokeStyle = l.stroke; ctx.lineCap = 'round'; ctx.stroke()
    } else if (l.shape === 'arrow') {
      drawArrow(ctx, x, y, x + w, y + h, l.stroke, l.strokeWidth || 4)
    } else if (l.shape === 'star') {
      drawStar(ctx, x + w / 2, y + h / 2, Math.min(w, h) / 2, Math.min(w, h) / 4.6, l.fill)
    }
  }

  function drawArrow (ctx, x1, y1, x2, y2, color, width) {
    const head = Math.max(10, width * 3)
    const angle = Math.atan2(y2 - y1, x2 - x1)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7))
    ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7))
    ctx.closePath(); ctx.fill()
  }

  function drawStar (ctx, cx, cy, outer, inner, color) {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = (Math.PI / 5) * i - Math.PI / 2
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }

  function drawPath (ctx, l) {
    if (!l.points || l.points.length < 2) return
    ctx.strokeStyle = l.color
    ctx.lineWidth = l.size
    ctx.lineCap = l.cap || 'round'
    ctx.lineJoin = 'round'
    if (l.erase) {
      ctx.globalCompositeOperation = 'destination-out'
    }
    if (l.marker) ctx.globalAlpha *= 0.45
    ctx.beginPath()
    ctx.moveTo(l.points[0].x, l.points[0].y)
    for (const p of l.points.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }

  function drawCurvedText (ctx, l) {
    const chars = String(l.text).split('')
    const radius = 60 + (100 - Math.min(100, l.curve)) * 3
    const total = chars.length
    const angleStep = 0.22
    ctx.font = `${l.weight || '700'} ${l.fontSize}px ${l.font}`
    ctx.fillStyle = l.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const startAngle = -((total - 1) * angleStep) / 2
    chars.forEach((ch, i) => {
      ctx.save()
      ctx.translate(l.x, l.y + radius)
      ctx.rotate(startAngle + i * angleStep)
      ctx.translate(0, -radius)
      if (l.strokeWidth) {
        ctx.strokeStyle = l.strokeColor
        ctx.lineWidth = l.strokeWidth
        ctx.strokeText(ch, 0, 0)
      }
      ctx.fillText(ch, 0, 0)
      ctx.restore()
    })
  }

  // ---------- interaction ----------
  let dragging = null
  let drawing = null
  let cropRect = null

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    if (activeTool === 'move') {
      // topmost selectable layer under point
      for (let i = doc.layers.length - 1; i >= 0; i--) {
        const l = doc.layers[i]
        if (!l.visible || l.locked || l.type === 'draw') continue
        const w = l.width || 40; const h = l.height || 40
        if (x >= l.x && x <= l.x + w && y >= l.y && y <= l.y + h) {
          doc.selection = l.id
          dragging = { l, dx: x - l.x, dy: y - l.y }
          render()
          return
        }
      }
      doc.selection = null
      render()
    } else if (['brush', 'pencil', 'marker'].includes(activeTool)) {
      drawing = { id: uid(), type: 'draw', name: activeTool, color: toolOpts.color, size: activeTool === 'pencil' ? Math.max(1, toolOpts.size / 3) : toolOpts.size, points: [{ x, y }], cap: activeTool === 'pencil' ? 'butt' : 'round', marker: activeTool === 'marker' }
      doc.selection = drawing.id
    } else if (activeTool === 'eraser') {
      drawing = { id: uid(), type: 'draw', name: 'eraser', color: '#000', size: toolOpts.size * 2, points: [{ x, y }], erase: true }
    } else if (['line', 'arrow', 'rect', 'circle', 'star'].includes(activeTool)) {
      drawing = { id: uid(), type: 'shape', shape: activeTool, name: activeTool, x, y, width: 0, height: 0, fill: 'rgba(0,0,0,0)', stroke: toolOpts.color, strokeWidth: toolOpts.size }
    } else if (activeTool === 'highlight') {
      drawing = { id: uid(), type: 'draw', name: 'highlight', color: '#ffe600', size: toolOpts.size * 3, points: [{ x, y }], marker: true }
    } else if (activeTool === 'text') {
      const t = { id: uid(), type: 'text', name: 'text', text: 'Double-click to edit', x, y, fontSize: toolOpts.fontSize, font: toolOpts.fontFamily, color: toolOpts.color, weight: '700', strokeWidth: 0, strokeColor: '#000', width: 200, height: toolOpts.fontSize * 1.2 }
      addLayer(t)
      activeTool = 'move'
      selectTool('move')
    } else if (activeTool === 'crop') {
      cropRect = { x, y, w: 0, h: 0 }
    }
  })

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom
    document.getElementById('ed-pos').textContent = `${Math.round(x)}, ${Math.round(y)}`
    if (dragging) {
      dragging.l.x = Math.round(x - dragging.dx)
      dragging.l.y = Math.round(y - dragging.dy)
      render()
    } else if (drawing) {
      if (drawing.type === 'draw') drawing.points.push({ x, y })
      else {
        drawing.width = x - drawing.x
        drawing.height = y - drawing.y
      }
      render()
    } else if (cropRect) {
      cropRect.w = x - cropRect.x
      cropRect.h = y - cropRect.y
      render()
    }
  })

  canvas.addEventListener('pointerup', () => {
    if (drawing) {
      if (drawing.type === 'draw' && drawing.points.length > 1) {
        doc.layers.push(drawing)
      } else if (drawing.type === 'shape' && Math.abs(drawing.width) > 2) {
        if (drawing.width < 0) { drawing.x += drawing.width; drawing.width *= -1 }
        if (drawing.height < 0) { drawing.y += drawing.height; drawing.height *= -1 }
        doc.layers.push(drawing)
      }
      drawing = null
      pushHistory()
      render()
    } else if (dragging) {
      dragging = null
      pushHistory()
    } else if (cropRect) {
      // Commit the dragged crop rect
      const x = Math.min(cropRect.x, cropRect.x + cropRect.w)
      const y = Math.min(cropRect.y, cropRect.y + cropRect.h)
      const w = Math.abs(cropRect.w)
      const h = Math.abs(cropRect.h)
      if (w > 4 && h > 4) {
        committedCrop = { x, y, w, h }
        // Keep the overlay visible after the gesture
        cropRect = { x, y, w, h }
        toast(`Crop selected: ${Math.round(w)} × ${Math.round(h)} — press Enter or use Tools → Apply crop`, 'info')
      } else {
        cropRect = null
        committedCrop = null
      }
      render()
    }
  })

  canvas.addEventListener('dblclick', () => {
    const sel = doc.layers.find(x => x.id === doc.selection)
    if (sel?.type === 'text') {
      const v = prompt('Edit text:', sel.text)
      if (v != null) { sel.text = v; pushHistory(); render() }
    }
  })

  function selectTool (id) {
    activeTool = id
    Object.entries(toolButtons).forEach(([k, b]) => b.classList.toggle('on', k === id))
    canvas.style.cursor = id === 'move' ? 'default' : 'crosshair'
    renderToolOpts()
  }

  function renderToolOpts () {
    // Tool options appear in the left column under tools.
    const existing = document.getElementById('ed-tool-opts')
    if (existing) existing.remove()
    if (!['brush', 'pencil', 'marker', 'eraser', 'text', 'line', 'arrow', 'rect', 'circle', 'star', 'highlight'].includes(activeTool)) return
    const p = el('div', { id: 'ed-tool-opts' })
    if (['brush', 'pencil', 'marker', 'eraser', 'highlight'].includes(activeTool)) {
      p.append(
        sliderRow({ label: 'Size', min: 1, max: 80, value: toolOpts.size, onInput: v => { toolOpts.size = v } }),
        colorField({ label: 'Color', value: toolOpts.color, onInput: v => { toolOpts.color = v } })
      )
    }
    if (['line', 'arrow', 'rect', 'circle', 'star'].includes(activeTool)) {
      p.append(
        sliderRow({ label: 'Stroke width', min: 1, max: 40, value: toolOpts.size, onInput: v => { toolOpts.size = v } }),
        colorField({ label: 'Color', value: toolOpts.color, onInput: v => { toolOpts.color = v } })
      )
    }
    if (activeTool === 'text') {
      p.append(
        sliderRow({ label: 'Font size', min: 10, max: 300, value: toolOpts.fontSize, onInput: v => { toolOpts.fontSize = v } }),
        selectField({ label: 'Font', value: toolOpts.fontFamily, options: ['Arial, sans-serif', 'Georgia, serif', 'Courier New, monospace', 'Impact, sans-serif'].map(f => ({ value: f, label: f.split(',')[0] })), onChange: v => { toolOpts.fontFamily = v } }),
        colorField({ label: 'Color', value: toolOpts.color, onInput: v => { toolOpts.color = v } })
      )
    }
    toolsCol.append(p)
  }

  // ---------- crop ----------
  // Visual crop: the crop tool drags a rect (cropRect in canvas px during the
  // gesture, committed via Enter or the Apply-crop action).
  let committedCrop = null

  function drawCropOverlay () {
    if (!cropRect || !cropRect.w || !cropRect.h) return
    ctx.save()
    ctx.fillStyle = 'rgba(10,12,18,.5)'
    const x = Math.min(cropRect.x, cropRect.x + cropRect.w)
    const y = Math.min(cropRect.y, cropRect.y + cropRect.h)
    const w = Math.abs(cropRect.w)
    const h = Math.abs(cropRect.h)
    // dim outside the selection
    ctx.fillRect(0, 0, doc.width, y)
    ctx.fillRect(0, y + h, doc.width, doc.height - y - h)
    ctx.fillRect(0, y, x, h)
    ctx.fillRect(x + w, y, doc.width - x - w, h)
    ctx.strokeStyle = '#6366f1'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2 / zoom
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }

  function applyCrop () {
    if (!committedCrop || committedCrop.w < 4 || committedCrop.h < 4) { toast('Drag a crop rectangle on the canvas first (crop tool).', 'info'); return }
    const { x, y, w, h } = committedCrop
    doc.width = Math.round(w)
    doc.height = Math.round(h)
    for (const l of doc.layers) { l.x -= x; l.y -= y }
    committedCrop = null
    cropRect = null
    pushHistory()
    fitToScreen()
    toast(`Cropped to ${doc.width} × ${doc.height}`, 'ok')
  }

  // ---------- history ----------
  function snapshot () {
    return JSON.stringify({
      width: doc.width, height: doc.height,
      layers: doc.layers.map(l => {
        if (l.type === 'raster') return { ...l, img: l._imgId || (l._imgId = uid()) }
        return l
      })
    })
  }
  const rasterStore = new Map()

  function pushHistory () {
    const snap = snapshot()
    rasterStore.set(snap, doc.layers.map(l => l.type === 'raster' ? l.img : null))
    history = history.slice(0, hIndex + 1)
    history.push(snap)
    if (history.length > 40) { history.shift(); hIndex-- }
    hIndex = history.length - 1
    renderLayers()
    undoBtn.disabled = hIndex <= 0
    redoBtn.disabled = hIndex >= history.length - 1
  }
  let pushHistoryDebounced = pushHistory

  function restore (snap) {
    const data = JSON.parse(snap)
    const imgs = rasterStore.get(snap) || []
    let imgIdx = 0
    doc.width = data.width; doc.height = data.height
    doc.layers = data.layers.map(l => {
      if (l.type === 'raster') { l.img = imgs[imgIdx++] }
      return l
    })
  }

  function undo () {
    if (hIndex > 0) { hIndex--; restore(history[hIndex]); render() }
  }
  function redo () {
    if (hIndex < history.length - 1) { hIndex++; restore(history[hIndex]); render() }
  }

  // ---------- keyboard ----------
  function onKey (e) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); exportDialog() }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      const i = doc.layers.findIndex(x => x.id === doc.selection)
      if (i >= 0) { e.preventDefault(); doc.layers.splice(i, 1); doc.selection = null; pushHistory(); render() }
    } else if (e.key === 'Escape') { doc.selection = null; cropRect = null; committedCrop = null; render() }
    else if (e.key === 'Enter' && activeTool === 'crop') { applyCrop() }
    else if (e.key === 'v') selectTool('move')
    else if (e.key === 'b') selectTool('brush')
    else if (e.key === 'p') selectTool('pencil')
    else if (e.key === 'e') selectTool('eraser')
    else if (e.key === 't') selectTool('text')
    else if (e.key === 'r') selectTool('rect')
    else if (e.key === 'o') selectTool('circle')
    else if (e.key === 'l') selectTool('line')
    else if (e.key === 'a') selectTool('arrow')
  }
  document.addEventListener('keydown', onKey)

  // ---------- export ----------
  function exportDialog () {
    track(EVENTS.PROCESS_COMPLETED, { slug: 'editor' })
    const overlay = el('div', { class: 'modal-overlay' })
    const formats = ['png', 'jpg', 'webp']
    let fmt = 'png'
    let quality = 92
    let scale = 100
    const modal = el('div', { class: 'modal' },
      el('div', { class: 'modal-head' }, el('h3', { text: 'Export image' }),
        el('button', { class: 'icon-btn', onclick: () => overlay.remove() }, icon('x', 15))),
      el('div', { class: 'modal-body' },
        el('div', { class: 'field' }, el('label', { text: 'Format' }),
          el('div', { class: 'seg block' }, formats.map(f =>
            el('button', { class: f === 'png' ? 'on' : '', onclick: (e) => { fmt = f; [...e.target.parentElement.children].forEach(b => b.classList.remove('on')); e.target.classList.add('on') } }, f.toUpperCase())))),
        sliderRow({ label: 'Quality', min: 10, max: 100, value: 92, onInput: v => { quality = v } }),
        sliderRow({ label: 'Scale', min: 10, max: 200, value: 100, unit: '%', onInput: v => { scale = v } }),
        el('p', { class: 'muted', text: `Export at ${doc.width} × ${doc.height} px (current zoom doesn't affect output).` }),
        el('button', { class: 'btn btn-primary btn-block btn-lg mt-2', onclick: async () => {
          const out = newCanvas(doc.width, doc.height, fmt === 'jpg' ? '#ffffff' : null)
          const octx = out.getContext('2d')
          octx.drawImage(canvas, 0, 0)
          let final = out
          if (scale !== 100) {
            const { resizeCanvas } = await import('../lib/engine.js')
            final = resizeCanvas(out, out.width * scale / 100, out.height * scale / 100)
          }
          const blob = await canvasToBlob(final, fmt, fmt === 'png' ? undefined : quality / 100)
          const { download } = await import('../core/utils.js')
          download(blob, `image-master-export.${fmt}`)
          overlay.remove()
          toast('Exported', 'ok')
        } }, icon('download', 16), 'Export')
      )
    )
    overlay.append(modal)
    document.getElementById('modal-root').append(overlay)
  }

  // ---------- init ----------
  selectTool('move')
  render()
  pushHistory()

  // Live empty-state hint (removed when the first layer arrives).
  const emptyHint = el('div', {
    style: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 2 }
  }, el('div', { class: 'empty-state' },
    el('div', { class: 'es-icon' }, icon('image', 24)),
    el('h3', { text: 'Open an image to start editing' }),
    el('p', { text: 'Use “Add image layer” in the left panel — or drop an image right onto the canvas. Everything stays on your device.' })))
  canvasWrap.append(emptyHint)

  // Drag & drop an image straight onto the editor canvas.
  canvasWrap.addEventListener('dragover', (e) => e.preventDefault())
  canvasWrap.addEventListener('drop', async (e) => {
    e.preventDefault()
    const file = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'))
    if (!file) return
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file) })
    if (doc.layers.length === 0) { doc.width = img.naturalWidth; doc.height = img.naturalHeight }
    addLayer(rasterLayerFromImage(img, file.name.slice(0, 24)))
    fitToScreen()
  })

  // Open-with flow: an image passed via sessionStorage (from tool pages)
  const incoming = sessionStorage.getItem('imt.editorImage')
  if (incoming) {
    sessionStorage.removeItem('imt.editorImage')
    const img = new Image()
    img.onload = () => { doc.width = img.naturalWidth; doc.height = img.naturalHeight; addLayer(rasterLayerFromImage(img, 'image')); fitToScreen() }
    img.src = incoming
  }

  const origAddLayer = addLayer
  // hide empty hint as soon as layers exist (addLayer → render → renderLayers)
  const observer = new MutationObserver(() => {
    if (doc.layers.length > 0) { emptyHint.style.display = 'none' } else { emptyHint.style.display = '' }
  })
  observer.observe(layerList, { childList: true })
  void origAddLayer

  // Cleanup registered with router
  const root = el('div', { class: 'editor-root' },
    topbar,
    el('div', { class: 'ed-main' }, leftSide, canvasWrap, rightSide),
    mobileBar,
    statusbar
  )
  root.cleanup = () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize) }

  let resizeTimer = null
  function onResize () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => { if (fitMode) fitToScreen(); else render() }, 120)
  }
  window.addEventListener('resize', onResize)

  return root
}
