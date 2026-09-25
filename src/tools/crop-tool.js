// Visual crop tool: draggable/resizable selection over the image with
// aspect-ratio locks, then apply + download. Fully local.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { loadItem } from './shared.js'
import { imageToCanvas } from '../lib/engine.js'
import { cropCanvas, canvasToBlob } from '../lib/engine.js'
import { segmented } from '../components/controls.js'
import { previewBox } from '../components/preview.js'
import { createUploadZone } from '../components/upload.js'
import { toast } from '../components/toast.js'

export function cropTool () {
  const main = el('div')
  const side = el('div', { class: 'tool-side' })
  const stage = el('div', { class: 'preview-box checker-bg', style: { padding: '0', display: 'block', position: 'relative', minHeight: '260px', overflow: 'hidden' } })
  const out = el('div', { class: 'mt-3' })

  let imgCanvas = null // full-res canvas
  let displayScale = 1 // displayed / natural
  let sel = null // { x, y, w, h } in display px
  let ratio = null
  let dragging = null // { mode, startX, startY, orig }
  let fileName = 'image'
  let result = null

  const overlay = el('div', { style: { position: 'absolute', inset: 0, touchAction: 'none' } })
  const selBox = el('div', {
    style: {
      position: 'absolute', border: '2px solid #6366f1', boxShadow: '0 0 0 9999px rgba(10,12,18,.55)',
      display: 'none', cursor: 'move'
    }
  })
  const handles = {}
  for (const h of ['nw', 'ne', 'sw', 'se']) {
    handles[h] = el('div', {
      style: {
        position: 'absolute', width: '14px', height: '14px', background: '#fff',
        border: '2px solid #6366f1', borderRadius: '3px'
      }
    })
  }
  selBox.append(handles.nw, handles.ne, handles.sw, handles.se)
  overlay.append(selBox)
  stage.append(overlay)

  const dims = el('div', { class: 'muted mt-1', text: '' })

  function layoutHandles () {
    const s = selBox.style
    handles.nw.style.left = '-7px'; handles.nw.style.top = '-7px'; handles.nw.style.cursor = 'nwse-resize'
    handles.ne.style.right = '-7px'; handles.ne.style.top = '-7px'; handles.ne.style.cursor = 'nesw-resize'
    handles.sw.style.left = '-7px'; handles.sw.style.bottom = '-7px'; handles.sw.style.cursor = 'nesw-resize'
    handles.se.style.right = '-7px'; handles.se.style.bottom = '-7px'; handles.se.style.cursor = 'nwse-resize'
  }

  function setSel (x, y, w, h) {
    sel = { x, y, w, h }
    selBox.style.display = 'block'
    selBox.style.left = `${x}px`
    selBox.style.top = `${y}px`
    selBox.style.width = `${w}px`
    selBox.style.height = `${h}px`
    dims.textContent = `Selection: ${Math.round(w / displayScale)} × ${Math.round(h / displayScale)} px — drag inside to move, corner handles to resize`
  }

  function clampRatio (w, h) {
    if (!ratio) return [w, h]
    // keep w*h ratio
    const targetH = w / ratio
    return [w, targetH]
  }

  overlay.addEventListener('pointerdown', (e) => {
    if (!imgCanvas) return
    const rect = stage.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const b = selBox.getBoundingClientRect()
    const onHandle = Object.entries(handles).find(([, elNode]) => {
      const hr = elNode.getBoundingClientRect()
      return e.target === elNode
    })
    if (onHandle) {
      const [corner] = onHandle
      dragging = { mode: `resize-${corner}`, startX: x, startY: y, orig: { ...sel } }
    } else if (e.target === selBox) {
      dragging = { mode: 'move', startX: x, startY: y, orig: { ...sel } }
    } else {
      dragging = { mode: 'new', startX: x, startY: y }
      setSel(x, y, 0, 0)
    }
    overlay.setPointerCapture(e.pointerId)
  })

  overlay.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const rect = stage.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    const o = dragging.orig || { x: dragging.startX, y: dragging.startY, w: 0, h: 0 }

    if (dragging.mode === 'new') {
      let w = x - dragging.startX
      let h = y - dragging.startY
      if (ratio) h = Math.sign(h || 1) * Math.abs(w) / ratio
      setSel(Math.min(dragging.startX, dragging.startX + w), Math.min(dragging.startY, dragging.startY + h), Math.abs(w), Math.abs(h))
    } else if (dragging.mode === 'move') {
      const nx = Math.max(0, Math.min(rect.width - o.w, x - dragging.startX + o.x))
      const ny = Math.max(0, Math.min(rect.height - o.h, y - dragging.startY + o.y))
      setSel(nx, ny, o.w, o.h)
    } else if (dragging.mode.startsWith('resize-')) {
      const corner = dragging.mode.split('-')[1]
      let { x: ox, y: oy, w: ow, h: oh } = o
      let left = ox; let top = oy; let right = ox + ow; let bottom = oy + oh
      if (corner.includes('w')) left = x
      if (corner.includes('e')) right = x
      if (corner.includes('n')) top = y
      if (corner.includes('s')) bottom = y
      let w = Math.max(8, right - left)
      let h = Math.max(8, bottom - top)
      if (ratio) h = w / ratio
      if (corner.includes('n')) top = bottom - h
      setSel(Math.min(left, left + w), Math.min(top, bottom - h), w, h)
    }
  })

  overlay.addEventListener('pointerup', () => { dragging = null })

  // ---- controls ----
  let ratioValue = null
  const ratioSeg = segmented({
    options: [
      { value: 'free', label: 'Free' },
      { value: '1', label: '1:1' },
      { value: '1.3333', label: '4:3' },
      { value: '1.7777', label: '16:9' },
      { value: '0.5625', label: '9:16' }
    ],
    value: 'free',
    onChange: v => {
      ratioValue = v === 'free' ? null : Number(v)
      ratio = ratioValue
      if (sel && ratio) {
        const h = sel.w / ratio
        setSel(sel.x, sel.y, sel.w, Math.min(h, stage.clientHeight - sel.y))
      }
    }
  })

  const applyBtn = el('button', {
    class: 'btn btn-primary btn-block', disabled: true,
    onclick: async () => {
      if (!imgCanvas || !sel || sel.w < 4) return
      const x = Math.round(sel.x / displayScale)
      const y = Math.round(sel.y / displayScale)
      const w = Math.max(1, Math.round(sel.w / displayScale))
      const h = Math.max(1, Math.round(sel.h / displayScale))
      const cropped = cropCanvas(imgCanvas, x, y, w, h)
      const blob = await canvasToBlob(cropped, 'png')
      if (result) URL.revokeObjectURL(result.url)
      result = { blob, url: URL.createObjectURL(blob) }
      out.replaceChildren(
        el('h2', { class: 'mt-2', text: 'Cropped result' }),
        el('div', { class: 'preview-box checker-bg' }, el('img', { src: result.url, alt: 'Cropped image' })),
        el('div', { class: 'row mt-2' },
          el('button', { class: 'btn btn-primary', onclick: () => import('../core/utils.js').then(({ download }) => download(blob, `${fileName}-cropped.png`)) }, icon('download', 15), 'Download PNG'),
          el('button', { class: 'btn', onclick: () => { out.replaceChildren() } }, 'Discard')
        )
      )
      toast(`Cropped to ${w}×${h}`, 'ok')
    }
  }, icon('crop', 15), 'Apply crop')

  const resetBtn = el('button', {
    class: 'btn btn-block mt-2',
    onclick: () => { sel = null; selBox.style.display = 'none'; dims.textContent = ''; applyBtn.disabled = true }
  }, 'Clear selection')

  side.append(
    el('div', { class: 'panel' },
      el('h2', { text: 'Aspect ratio' }),
      ratioSeg,
      el('p', { class: 'panel-note mt-2', text: 'Drag on the image to draw a selection. Drag inside it to move; corner handles resize. Selection updates show real pixel dimensions.' }),
      dims,
      el('div', { class: 'mt-3' }, applyBtn, resetBtn)
    ),
    el('div', { class: 'panel mt-3' },
      el('h2', {}, icon('shield', 14), ' Privacy'),
      el('p', { class: 'muted', text: 'Cropping happens entirely in your browser.' })
    )
  )

  function mountImage (item) {
    imgCanvas = imageToCanvas(item.img)
    fileName = item.file.name.replace(/\.[^.]+$/, '')
    // fit display
    const maxW = Math.min(820, window.innerWidth - 60)
    const maxH = 520
    displayScale = Math.min(maxW / imgCanvas.width, maxH / imgCanvas.height, 1)
    const disp = el('img', {
      src: imgCanvas.toDataURL('image/png'),
      style: { width: `${imgCanvas.width * displayScale}px`, display: 'block', userSelect: 'none' },
      draggable: 'false'
    })
    stage.replaceChildren(disp, overlay)
    overlay.style.inset = '0'
    // default selection: 80% centered
    const w = stage.clientWidth * 0.8
    const h = (ratio ? w / ratio : stage.clientHeight * 0.8)
    setSel((stage.clientWidth - w) / 2, (stage.clientHeight - h) / 2, w, h)
    applyBtn.disabled = false
  }

  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop an image to crop',
      onFiles: async (files) => {
        const item = await loadItem(files[0])
        if (item.error) { toast(item.error, 'err'); return }
        mountImage(item)
      }
    }), el('div', { class: 'panel mt-3' }, el('h2', { text: 'Crop area' }), stage), out)
  })

  return el('div', { class: 'tool-layout' }, main, side)
}
