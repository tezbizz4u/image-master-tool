// Quick Tools implementations. Each export is mounted by tool-page.js via
// TOOL_IMPLS[slug]. Geometry/encode work goes through lib/engine.js.
import { el, fmtBytes, clamp, readFileAsDataURL } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { simpleTool, infoTable, loadItem, outputName } from './shared.js'
import {
  imageToCanvas, canvasToBlob, resizeCanvas, cropCanvas, rotateCanvas, flipCanvas,
  fitCanvas, newCanvas, drawText, drawWatermark, addBorder, roundCorners,
  mergeCanvases, setPngDpi, setJpegDpi, caps
} from '../lib/engine.js'
import {
  sliderRow, numberField, selectField, colorField, toggle, segmented, radioTiles, textField
} from '../components/controls.js'
import { previewBox, resultActions } from '../components/preview.js'
import { toast, toastErr } from '../components/toast.js'
import { parseExif, formatGps, listPngChunks, gifInfo, isPNG, isJPEG } from '../lib/exif.js'
import { extractPalette, rgbToHex } from '../lib/palette.js'
import { imagesToPdfBlob } from '../lib/pdf.js'
import { readFileAsArrayBuffer } from '../core/utils.js'

export const TOOL_IMPLS = {}

// ---------- Resize ----------
TOOL_IMPLS['resize-image'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let mode = 'width'
    let pct = 100
    let width = 1280
    let height = 720
    let fmt = 'keep'
    let quality = 90

    const wField = numberField({ label: 'Width (px)', value: width, min: 1, max: 20000, onInput: v => { width = v || 1; if (ctx.linkH) syncH() } })
    const hField = numberField({ label: 'Height (px)', value: height, min: 1, max: 20000, onInput: v => { height = v || 1; ctx.linkH = false } })
    let linkH = true

    function syncH () {
      const item = ctx.getItems().find(i => !i.error)
      if (item && linkH) {
        height = Math.max(1, Math.round(width * item.height / item.width))
        hField.querySelector('input').value = height
      }
    }

    panel.append(
      radioTiles({
        label: 'Resize by',
        value: 'width',
        options: [
          { value: 'width', label: 'Width', sub: 'keep ratio' },
          { value: 'height', label: 'Height', sub: 'keep ratio' },
          { value: 'percent', label: 'Percent', sub: 'scale %' },
          { value: 'exact', label: 'Exact', sub: 'both sides' }
        ],
        onChange: v => {
          mode = v
          wField.classList.toggle('hidden', v === 'percent')
          hField.classList.toggle('hidden', v !== 'exact' && v !== 'height')
        }
      }),
      wField, hField,
      sliderRow({ label: 'Scale', min: 1, max: 400, value: 100, unit: '%', onInput: v => { pct = v } }),
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    // default visibility
    hField.classList.add('hidden')

    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      let out
      if (mode === 'percent') {
        out = resizeCanvas(src, src.width * pct / 100, src.height * pct / 100)
      } else if (mode === 'width') {
        out = resizeCanvas(src, width, width * src.height / src.width)
      } else if (mode === 'height') {
        out = resizeCanvas(src, height * src.width / src.height, height)
      } else {
        out = resizeCanvas(src, width, height)
      }
      return finish(out, item, fmt, quality)
    }
  }
})

// ---------- Rotate ----------
TOOL_IMPLS['rotate-image'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let angle = 90
    let fmt = 'keep'; let quality = 92
    const custom = sliderRow({ label: 'Custom angle', min: -180, max: 180, value: 0, unit: '°', onInput: v => { angle = v } })
    custom.classList.add('hidden')
    panel.append(
      segmented({
        options: [{ value: 90, label: '90°' }, { value: 180, label: '180°' }, { value: 270, label: '270°' }, { value: 0, label: 'Custom' }],
        value: 90,
        onChange: v => { angle = v === 0 ? angle : v; custom.classList.toggle('hidden', v !== 0) }
      }),
      custom,
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )

    ctx.process = async (item) => {
      let out = rotateCanvas(imageToCanvas(item.img), angle)
      if (angle % 90 === 0 && angle % 360 !== 0) {
        // straighten edges for quarter turns (canvas rounding) — no-op visually
      }
      return finish(out, item, fmt, quality)
    }
  }
})

// ---------- Flip ----------
TOOL_IMPLS['flip-image'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let dir = 'h'; let fmt = 'keep'; let quality = 92
    panel.append(
      segmented({ options: [{ value: 'h', label: 'Horizontal' }, { value: 'v', label: 'Vertical' }], value: 'h', onChange: v => { dir = v } }),
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    ctx.process = async (item) => finish(flipCanvas(imageToCanvas(item.img), dir === 'h'), item, fmt, quality)
  }
})

// ---------- Compress ----------
TOOL_IMPLS['compress-image'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let fmt = 'keep'; let quality = 75; let resize = false; let maxDim = 1920
    const maxField = numberField({ label: 'Max dimension (px)', value: 1920, min: 16, max: 20000, onInput: v => { maxDim = v || 1920 } })
    maxField.classList.add('hidden')
    panel.append(
      formatSelectPanel(f => { fmt = f }, q => { quality = q }, ['keep', 'jpg', 'webp', 'png']),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 75, onInput: v => { quality = v } }),
      toggle({ label: 'Also resize (max dimension)', value: false, onChange: v => { resize = v; maxField.classList.toggle('hidden', !v) } }),
      maxField
    )
    ctx.process = async (item) => {
      let out = imageToCanvas(item.img)
      if (resize) {
        const scale = Math.min(1, maxDim / Math.max(out.width, out.height))
        if (scale < 1) out = resizeCanvas(out, out.width * scale, out.height * scale)
      }
      const format = fmt === 'keep' ? extOf(item) : fmt
      const q = format === 'png' ? undefined : quality / 100
      const blob = await canvasToBlob(out, format, q)
      return { blob, canvas: out, format, name: outputName(item.file, format) }
    }
  }
})

// ---------- Convert ----------
TOOL_IMPLS['convert-image'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let fmt = 'png'; let quality = 90; let matte = '#ffffff'
    const matteField = colorField({ label: 'Background for transparent areas (JPG)', value: matte, onInput: v => { matte = v } })
    const qualityRow = sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { quality = v } })
    panel.append(
      radioTiles({
        label: 'Convert to',
        value: 'png',
        options: [{ value: 'jpg', label: 'JPG', sub: 'smallest photos' }, { value: 'png', label: 'PNG', sub: 'lossless' }, { value: 'webp', label: 'WebP', sub: 'modern web' }, { value: 'avif', label: 'AVIF', sub: 'if supported' }],
        onChange: v => {
          fmt = v
          qualityRow.classList.toggle('hidden', v === 'png')
          matteField.classList.toggle('hidden', v !== 'jpg')
          ctx.refresh()
        }
      }),
      qualityRow,
      matteField
    )
    ctx.process = async (item) => {
      if (fmt === 'avif' && !(await caps.supportsEncode('avif'))) {
        throw new Error('This browser can\'t encode AVIF. Try WebP instead — same goal, universal support.')
      }
      let src = imageToCanvas(item.img)
      if (fmt === 'jpg') {
        const matted = newCanvas(src.width, src.height, matte)
        matted.getContext('2d').drawImage(src, 0, 0)
        src = matted
      }
      const blob = await canvasToBlob(src, fmt, fmt === 'png' ? undefined : quality / 100)
      return { blob, canvas: src, format: fmt, name: outputName(item.file, fmt) }
    }
  }
})

// ---------- Change Dimensions (exact WxH strategies) ----------
TOOL_IMPLS['change-dimensions'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let W = 1200; let H = 630; let mode = 'cover'; let bg = '#ffffff'; let fmt = 'keep'; let quality = 90
    const bgField = colorField({ label: 'Padding color', value: bg, onInput: v => { bg = v; ctx.refresh() } })
    panel.append(
      el('div', { class: 'grid-2' },
        numberField({ label: 'Width (px)', value: W, min: 1, max: 20000, onInput: v => { W = v || 1; ctx.refresh() } }),
        numberField({ label: 'Height (px)', value: H, min: 1, max: 20000, onInput: v => { H = v || 1; ctx.refresh() } })
      ),
      radioTiles({
        label: 'Fit strategy',
        value: 'cover',
        options: [
          { value: 'cover', label: 'Cover', sub: 'fill & crop' },
          { value: 'contain', label: 'Contain', sub: 'fit & pad' },
          { value: 'stretch', label: 'Stretch', sub: 'ignore ratio' }
        ],
        onChange: v => { mode = v; bgField.classList.toggle('hidden', v !== 'contain'); ctx.refresh() }
      }),
      bgField,
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    ctx.process = async (item) =>
      finish(fitCanvas(imageToCanvas(item.img), W, H, mode, mode === 'contain' ? bg : null), item, fmt, quality)
  }
})

// ---------- Change Aspect Ratio ----------
TOOL_IMPLS['change-aspect-ratio'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let ratio = '1:1'; let strategy = 'crop'; let bg = '#ffffff'; let fmt = 'keep'; let quality = 92
    const bgField = colorField({ label: 'Pad color', value: bg, onInput: v => { bg = v; ctx.refresh() } })
    panel.append(
      selectField({
        label: 'Target ratio',
        value: ratio,
        options: ['1:1', '4:3', '3:2', '16:9', '19.5:9', '9:16', '3:4', '2:3'].map(r => ({ value: r, label: r })),
        onChange: v => { ratio = v; ctx.refresh() }
      }),
      segmented({
        options: [{ value: 'crop', label: 'Crop' }, { value: 'pad', label: 'Pad' }],
        value: 'crop',
        onChange: v => { strategy = v; bgField.classList.toggle('hidden', v !== 'pad'); ctx.refresh() }
      }),
      bgField,
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    bgField.classList.add('hidden')

    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      const [rw, rh] = ratio.split(':').map(Number)
      const target = rw / rh
      const cur = src.width / src.height
      if (strategy === 'crop') {
        let cw = src.width; let ch = src.height
        if (cur > target) cw = src.height * target
        else ch = src.width / target
        return finish(cropCanvas(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch), item, fmt, quality)
      }
      let W = src.width; let H = src.height
      if (cur > target) H = src.width / target
      else W = src.height * target
      return finish(fitCanvas(src, W, H, 'contain', bg), item, fmt, quality)
    }
  }
})

// ---------- Change Quality ----------
TOOL_IMPLS['change-quality'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let quality = 80; let fmt = 'keep'
    panel.append(
      formatSelectPanel(f => { fmt = f }, q => {}, ['keep', 'jpg', 'webp', 'avif']),
      sliderRow({ label: 'Quality', min: 5, max: 100, value: 80, onInput: v => { quality = v; ctx.refresh() } })
    )
    ctx.process = async (item) => {
      const format = fmt === 'keep' ? extOf(item) : fmt
      if (format === 'png') throw new Error('PNG is lossless — it has no quality setting. Convert to JPG or WebP to control quality/size.')
      return finish(imageToCanvas(item.img), item, format, quality)
    }
  }
})

// ---------- Change DPI ----------
TOOL_IMPLS['change-dpi'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let dpi = 300
    panel.append(
      sliderRow({ label: 'DPI (print resolution)', min: 72, max: 600, step: 1, value: 300, onInput: v => { dpi = v; ctx.refresh() } }),
      el('p', { class: 'panel-note', text: 'Changes the stored print density only — pixel dimensions and on-screen appearance are untouched.' })
    )
    ctx.process = async (item) => {
      const format = extOf(item)
      if (format !== 'png' && format !== 'jpg') {
        throw new Error('DPI metadata is written for JPG and PNG. Convert the image to one of those formats first.')
      }
      const canvas = imageToCanvas(item.img)
      const fmt2 = format === 'jpg' ? 'jpg' : 'png'
      const blob = await canvasToBlob(canvas, fmt2, 0.95)
      const buf = await blob.arrayBuffer()
      const outBuf = fmt2 === 'png' ? setPngDpi(buf, dpi) : setJpegDpi(buf, dpi)
      return { blob: new Blob([outBuf], { type: fmt2 === 'png' ? 'image/png' : 'image/jpeg' }), format: fmt2, name: outputName(item.file, fmt2), width: canvas.width, height: canvas.height }
    }
  }
})

// ---------- Remove Metadata ----------
function stripMetadataTool (label) {
  return simpleTool({
    multiple: true,
    settings (panel, ctx) {
      let fmt = 'keep'; let quality = 92
      panel.append(
        el('p', { class: 'panel-note mb-2', text: 'Output is re-encoded with all EXIF, GPS, comments and color-profile text removed. Pixels are untouched.' }),
        formatSelectPanel(f => { fmt = f }, q => { quality = q })
      )
      ctx.process = async (item) => {
        const format = fmt === 'keep' ? (extOf(item) === 'gif' ? 'png' : extOf(item)) : fmt
        const canvas = imageToCanvas(item.img)
        const blob = await canvasToBlob(canvas, format, format === 'png' ? undefined : quality / 100)
        return { blob, canvas, format, name: outputName(item.file, format) }
      }
    }
  })
}
TOOL_IMPLS['remove-metadata'] = stripMetadataTool()
TOOL_IMPLS['exif-remover'] = stripMetadataTool()

// ---------- Add Watermark ----------
TOOL_IMPLS['add-watermark'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let text = '© Your Name'; let position = 'bottom-right'; let opacity = 45; let scale = 5; let tile = false; let rotation = 0; let color = '#ffffff'; let fmt = 'keep'; let quality = 92
    panel.append(
      textField({ label: 'Watermark text', value: text, onInput: v => { text = v; ctx.refresh() } }),
      colorField({ label: 'Text color', value: color, onInput: v => { color = v; ctx.refresh() } }),
      selectField({
        label: 'Position', value: position,
        options: ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'].map(p => ({ value: p, label: p.replace('-', ' ') })),
        onChange: v => { position = v; ctx.refresh() }
      }),
      sliderRow({ label: 'Size', min: 2, max: 20, value: 5, onInput: v => { scale = v; ctx.refresh() } }),
      sliderRow({ label: 'Opacity', min: 5, max: 100, value: 45, unit: '%', onInput: v => { opacity = v; ctx.refresh() } }),
      sliderRow({ label: 'Rotation', min: -90, max: 90, value: 0, unit: '°', onInput: v => { rotation = v; ctx.refresh() } }),
      toggle({ label: 'Tile across image', value: false, onChange: v => { tile = v; ctx.refresh() } }),
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    ctx.process = async (item) => {
      const canvas = imageToCanvas(item.img)
      const ctx2 = canvas.getContext('2d')
      drawWatermark(ctx2, canvas.width, canvas.height, { text, position, opacity: opacity / 100, scale, rotation, tile, color })
      return finish(canvas, item, fmt, quality)
    }
  }
})

// ---------- Add Text ----------
TOOL_IMPLS['add-text'] = simpleTool({
  settings (panel, ctx) {
    let spec = {
      text: 'Your text here', x: 40, y: 40, size: 64, color: '#ffffff', font: 'Arial, sans-serif',
      weight: '700', stroke: '#000000', strokeWidth: 0, shadow: true, opacity: 100, angle: 0, bg: ''
    }
    let fmt = 'keep'; let quality = 92
    const fonts = ['Arial, sans-serif', 'Georgia, serif', 'Courier New, monospace', 'Impact, sans-serif', 'Verdana, sans-serif', 'Trebuchet MS, sans-serif']
    panel.append(
      el('div', { class: 'field' }, el('label', { text: 'Text' }),
        el('textarea', { class: 'input', rows: 2, oninput: e => { spec.text = e.target.value; ctx.refresh() } }, spec.text)),
      selectField({ label: 'Font', value: spec.font, options: fonts.map(f => ({ value: f, label: f.split(',')[0] })), onChange: v => { spec.font = v; ctx.refresh() } }),
      selectField({ label: 'Weight', value: '700', options: ['400', '600', '700', '900'].map(w => ({ value: w, label: w })), onChange: v => { spec.weight = v; ctx.refresh() } }),
      sliderRow({ label: 'Font size', min: 8, max: 300, value: 64, onInput: v => { spec.size = v; ctx.refresh() } }),
      colorField({ label: 'Text color', value: spec.color, onInput: v => { spec.color = v; ctx.refresh() } }),
      colorField({ label: 'Outline color', value: '#000000', onInput: v => { spec.stroke = v; ctx.refresh() } }),
      sliderRow({ label: 'Outline width', min: 0, max: 20, value: 0, onInput: v => { spec.strokeWidth = v; ctx.refresh() } }),
      sliderRow({ label: 'X position', min: 0, max: 4000, value: 40, onInput: v => { spec.x = v; ctx.refresh() } }),
      sliderRow({ label: 'Y position', min: 0, max: 4000, value: 40, onInput: v => { spec.y = v; ctx.refresh() } }),
      sliderRow({ label: 'Rotation', min: -180, max: 180, value: 0, unit: '°', onInput: v => { spec.angle = v; ctx.refresh() } }),
      sliderRow({ label: 'Opacity', min: 5, max: 100, value: 100, unit: '%', onInput: v => { spec.opacity = v; ctx.refresh() } }),
      toggle({ label: 'Drop shadow', value: true, onChange: v => { spec.shadow = v; ctx.refresh() } }),
      textField({ label: 'Background (CSS color, empty = none)', value: '', placeholder: 'e.g. rgba(0,0,0,.5)', onInput: v => { spec.bg = v; ctx.refresh() } }),
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    ctx.process = async (item) => {
      const canvas = imageToCanvas(item.img)
      drawText(canvas.getContext('2d'), { ...spec, opacity: spec.opacity / 100 }, canvas.width, canvas.height)
      return finish(canvas, item, fmt, quality)
    }
  }
})

// ---------- Add Border ----------
TOOL_IMPLS['add-border'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let size = 24; let color = '#ffffff'; let radius = 0; let outer = 0; let fmt = 'keep'; let quality = 92
    panel.append(
      sliderRow({ label: 'Border width', min: 0, max: 200, value: 24, onInput: v => { size = v; ctx.refresh() } }),
      colorField({ label: 'Border color', value: color, onInput: v => { color = v; ctx.refresh() } }),
      sliderRow({ label: 'Outer padding', min: 0, max: 200, value: 0, onInput: v => { outer = v; ctx.refresh() } }),
      sliderRow({ label: 'Corner radius', min: 0, max: 200, value: 0, onInput: v => { radius = v; ctx.refresh() } }),
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    ctx.process = async (item) => finish(addBorder(imageToCanvas(item.img), { size, color, radius, outer }), item, fmt, quality)
  }
})

// ---------- Round Corners ----------
TOOL_IMPLS['round-corners'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let radius = 40; let fmt = 'png'; let quality = 92
    panel.append(
      sliderRow({ label: 'Corner radius', min: 0, max: 500, value: 40, onInput: v => { radius = v; ctx.refresh() } }),
      el('p', { class: 'panel-note mb-2', text: 'Output is PNG or WebP so corners stay transparent.' }),
      radioTiles({
        label: 'Format', value: 'png',
        options: [{ value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }],
        onChange: v => { fmt = v; ctx.refresh() }
      }),
      sliderRow({ label: 'Quality (WebP)', min: 10, max: 100, value: 92, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      return finish(roundCorners(src, Math.min(radius, Math.min(src.width, src.height) / 2)), item, fmt, quality / 100)
    }
  }
})

// ---------- Merge / Combine / Stitch ----------
TOOL_IMPLS['merge-images'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let direction = 'horizontal'; let gap = 12; let align = 'center'; let bg = 'transparent'; let fmt = 'png'; let quality = 92
    const bgField = colorField({ label: 'Background color', value: '#ffffff', onInput: v => { bg = v; ctx.refresh() } })
    panel.append(
      segmented({
        options: [{ value: 'horizontal', label: 'Side by side' }, { value: 'vertical', label: 'Stacked' }],
        value: 'horizontal',
        onChange: v => { direction = v; ctx.refresh() }
      }),
      sliderRow({ label: 'Gap', min: 0, max: 120, value: 12, onInput: v => { gap = v; ctx.refresh() } }),
      selectField({ label: 'Alignment', value: 'center', options: [{ value: 'center', label: 'Center' }, { value: 'start', label: 'Top / Left' }], onChange: v => { align = v; ctx.refresh() } }),
      radioTiles({
        label: 'Background', value: 'transparent',
        options: [{ value: 'transparent', label: 'Transparent' }, { value: 'color', label: 'Solid color' }],
        onChange: v => { bg = v === 'transparent' ? 'transparent' : bgField.querySelector('input[type=text]')?.value || '#ffffff'; bgField.classList.toggle('hidden', v === 'transparent'); ctx.refresh() }
      }),
      bgField,
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    bgField.classList.add('hidden')
    bgField.querySelector('input[type=text]').addEventListener('input', e => { if (bg !== 'transparent') { bg = e.target.value; ctx.refresh() } })

    ctx.process = async (item, c) => {
      // Merge is a single-output op: run once when we reach the first item.
      if (c.getItems().indexOf(item) !== 0) return null
      const items = c.getItems().filter(i => !i.error)
      const canvases = items.map(i => imageToCanvas(i.img))
      const merged = mergeCanvases(canvases, { direction, gap, background: bg, align })
      return { canvas: merged, format: fmt, name: 'merged.' + fmt, quality: quality / 100 }
    }
  }
})

// ---------- Split ----------
TOOL_IMPLS['split-image'] = simpleTool({
  settings (panel, ctx) {
    let cols = 3; let rows = 1; let fmt = 'png'; let quality = 92
    panel.append(
      el('div', { class: 'grid-2' },
        numberField({ label: 'Columns', value: 3, min: 1, max: 20, onInput: v => { cols = clamp(v || 1, 1, 20); ctx.refresh() } }),
        numberField({ label: 'Rows', value: 1, min: 1, max: 20, onInput: v => { rows = clamp(v || 1, 1, 20); ctx.refresh() } })
      ),
      formatSelectPanel(f => { fmt = f }, q => { quality = q })
    )
    ctx.process = async (item) => {
      const src = imageToCanvas(item.img)
      const tw = Math.floor(src.width / cols)
      const th = Math.floor(src.height / rows)
      const base = item.file.name.replace(/\.[^.]+$/, '')
      const outs = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const piece = cropCanvas(src, c * tw, r * th, tw, th)
          const blob = await canvasToBlob(piece, fmt, fmt === 'png' ? undefined : quality / 100)
          outs.push({ blob, canvas: piece, format: fmt, name: `${base}_r${r + 1}c${c + 1}.${fmt}` })
        }
      }
      ctx.setMultiOutput(outs)
      return null
    }
  }
})

// ---------- Image to PDF ----------
TOOL_IMPLS['image-to-pdf'] = simpleTool({
  multiple: true,
  showComparison: false,
  settings (panel, ctx) {
    let size = 'a4'; let orientation = 'portrait'
    panel.append(
      selectField({ label: 'Page size', value: 'a4', options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }, { value: 'a3', label: 'A3' }, { value: 'fit', label: 'Fit to image' }], onChange: v => { size = v } }),
      segmented({ options: [{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }], value: 'portrait', onChange: v => { orientation = v } }),
      el('p', { class: 'panel-note', text: 'Images are embedded at high quality (92). The PDF is built entirely in your browser.' })
    )
    ctx.process = async (item, c) => {
      if (c.getItems().indexOf(item) !== 0) return null
      const items = c.getItems().filter(i => !i.error)
      const canvases = items.map(i => imageToCanvas(i.img))
      const blob = await imagesToPdfBlob(canvases, { pageSize: size, orientation })
      return { blob, format: 'pdf', name: 'document.pdf', width: 0, height: 0 }
    }
  }
})

// ---------- Image Info (custom) ----------
TOOL_IMPLS['image-info'] = function () {
  const main = el('div')
  const out = el('div', { class: 'mt-2' })

  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop an image to inspect',
      onFiles: async (files) => {
        out.replaceChildren(el('div', { class: 'row mt-3' }, el('div', { class: 'spinner' })))
        const file = files[0]
        const item = await loadItem(file)
        const rows = []
        if (item.error) {
          out.replaceChildren(el('div', { class: 'error-box mt-3', text: item.error }))
          return
        }
        const buf = await readFileAsArrayBuffer(file)
        rows.push(['File name', file.name])
        rows.push(['File size', fmtBytes(file.size)])
        rows.push(['MIME type', file.type || 'unknown'])
        rows.push(['Detected format', sniff(buf).toUpperCase()])
        rows.push(['Dimensions', `${item.width} × ${item.height} px`])
        rows.push(['Megapixels', ((item.width * item.height) / 1e6).toFixed(2) + ' MP'])
        rows.push(['Aspect ratio', simplifyRatio(item.width, item.height)])
        const exif = parseExif(buf)
        if (exif?.IFD0?.Make || exif?.IFD0?.Model) rows.push(['Camera', `${exif.IFD0.Make || ''} ${exif.IFD0.Model || ''}`.trim()])
        const png = isPNG(buf) ? listPngChunks(buf) : null
        if (png) rows.push(['PNG chunks', png.map(c => c.name).join(', ')])
        const gif = buf && isGIFBytes(buf) ? gifInfo(buf) : null
        if (gif) { rows.push(['GIF frames', String(gif.frames)]); rows.push(['GIF version', gif.version]) }
        out.replaceChildren(infoTable(rows))
      }
    }))
    main.append(out)
  })

  return el('div', { class: 'tool-layout' }, main, sidePrivacyPanel('Inspection happens on your device.'))
}

// ---------- Metadata Viewer (custom) ----------
TOOL_IMPLS['metadata-viewer'] = function () {
  const main = el('div')
  const out = el('div', { class: 'mt-2' })
  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop an image to read its metadata',
      onFiles: async (files) => {
        const file = files[0]
        const buf = await readFileAsArrayBuffer(file)
        const sections = []
        const exif = parseExif(buf)
        if (exif) {
          const flat = []
          for (const [group, obj] of [['Image', exif.IFD0], ['Photo', exif.Exif], ['GPS', exif.GPS]]) {
            for (const [k, v] of Object.entries(obj)) {
              if (v == null) continue
              flat.push([`${group} · ${k}`, typeof v === 'object' ? JSON.stringify(v) : String(v)])
            }
          }
          const gps = formatGps(exif)
          if (gps) flat.push(['GPS position', gps.display])
          if (flat.length) sections.push(['EXIF / metadata', flat])
        }
        if (isPNG(buf)) {
          const chunks = listPngChunks(buf).filter(c => c.name !== 'IDAT')
          if (chunks.length) sections.push(['PNG chunks', chunks.map(c => [`${c.name} (${c.len} B)`, c.text || '—'])])
        }
        if (isGIFBytes(buf)) {
          const gi = gifInfo(buf)
          sections.push(['GIF', [['Version', gi.version], ['Frames', String(gi.frames)], ['Comments', gi.comments.join(' | ') || '—']]])
        }
        out.replaceChildren()
        if (!sections.length) {
          out.append(el('div', { class: 'info-box mt-3', text: 'No readable metadata found — this image is already clean.' }))
        } else {
          for (const [title, rows] of sections) {
            out.append(el('h2', { class: 'mt-4', text: title }), infoTable(rows))
          }
        }
      }
    }), out)
  })
  return el('div', { class: 'tool-layout' }, main, sidePrivacyPanel('Metadata is parsed locally — the file is never uploaded.'))
}

// ---------- EXIF Viewer (custom) ----------
TOOL_IMPLS['exif-viewer'] = function () {
  const main = el('div')
  const out = el('div', { class: 'mt-2' })
  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop a photo to read its EXIF data',
      onFiles: async (files) => {
        const buf = await readFileAsArrayBuffer(files[0])
        const exif = parseExif(buf)
        out.replaceChildren()
        if (!exif || (!Object.keys(exif.IFD0).length && !Object.keys(exif.Exif).length)) {
          out.append(el('div', { class: 'warn-box mt-3', text: 'No EXIF data found. Photos shared through messaging apps often have EXIF stripped already.' }))
          return
        }
        const rows = []
        const add = (k, v, fmt) => { if (v != null) rows.push([k, fmt ? fmt(v) : String(v)]) }
        add('Camera', [exif.IFD0.Make, exif.IFD0.Model].filter(Boolean).join(' '))
        add('Software', exif.IFD0.Software)
        add('Taken on', exif.Exif.DateTimeOriginal || exif.IFD0.DateTime)
        add('Exposure', exif.Exif.ExposureTime, v => v < 1 ? `1/${Math.round(1 / v)} s` : `${v} s`)
        add('Aperture', exif.Exif.FNumber, v => `f/${v.toFixed(1)}`)
        add('ISO', exif.Exif.ISO)
        add('Focal length', exif.Exif.FocalLength, v => `${Math.round(v)} mm`)
        add('35mm equivalent', exif.Exif.FocalLengthIn35mm, v => `${Math.round(v)} mm`)
        add('Flash', exif.Exif.Flash, v => v & 1 ? 'Fired' : 'No flash')
        add('White balance', exif.Exif.WhiteBalance, v => v === 1 ? 'Manual' : 'Auto')
        add('Lens', [exif.Exif.LensMake, exif.Exif.LensModel].filter(Boolean).join(' '))
        add('Orientation', exif.IFD0.Orientation)
        const gps = formatGps(exif)
        if (gps) add('GPS', gps.display)
        const lensSpec = exif.Exif.LensSpecification
        if (Array.isArray(lensSpec)) add('Lens range', `${lensSpec[0]}–${lensSpec[2]} mm f/${lensSpec[1]}–${lensSpec[3]}`)
        out.append(rows.length ? infoTable(rows) : el('div', { class: 'warn-box mt-3', text: 'EXIF block present but empty.' }))
      }
    }), out)
  })
  return el('div', { class: 'tool-layout' }, main, sidePrivacyPanel('EXIF is decoded in your browser. Nothing is uploaded.'))
}

// ---------- Color Picker (custom, interactive) ----------
TOOL_IMPLS['color-picker'] = function () {
  const main = el('div')
  const out = el('div', { class: 'mt-3' })
  const swatches = el('div', { class: 'row wrap mt-2' })
  const colors = []
  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop an image to pick colors',
      onFiles: async (files) => {
        const url = URL.createObjectURL(files[0])
        const img = el('img', { src: url, alt: 'Pick colors by clicking', style: { maxWidth: '100%', maxHeight: '480px', cursor: 'crosshair', borderRadius: '10px' } })
        const loupe = el('div', {
          class: 'cmp-tag',
          style: { position: 'fixed', pointerEvents: 'none', display: 'none', zIndex: 60, padding: '8px 10px', borderRadius: '8px' }
        })
        out.replaceChildren(img, loupe, swatches)

        img.addEventListener('click', (e) => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
          canvas.getContext('2d').drawImage(img, 0, 0)
          const rect = img.getBoundingClientRect()
          const x = Math.floor((e.clientX - rect.left) * img.naturalWidth / rect.width)
          const y = Math.floor((e.clientY - rect.top) * img.naturalHeight / rect.height)
          const d = canvas.getContext('2d').getImageData(x, y, 1, 1).data
          const hex = rgbToHex(d[0], d[1], d[2])
          colors.unshift(hex)
          if (colors.length > 12) colors.pop()
          renderSwatches()
        })
        img.addEventListener('mousemove', (e) => {
          loupe.style.display = 'block'
          loupe.style.left = `${e.clientX + 14}px`
          loupe.style.top = `${e.clientY + 14}px`
          const rect = img.getBoundingClientRect()
          const canvas = loupe._c ||= (() => { const c = document.createElement('canvas'); c.width = c.height = img.naturalWidth; return c })()
          if (!loupe._drawn) { canvas.getContext('2d').drawImage(img, 0, 0); loupe._drawn = true }
          const x = Math.floor((e.clientX - rect.left) * img.naturalWidth / rect.width)
          const y = Math.floor((e.clientY - rect.top) * img.naturalHeight / rect.height)
          const d = canvas.getContext('2d').getImageData(Math.max(0, Math.min(canvas.width - 1, x)), Math.max(0, Math.min(canvas.height - 1, y)), 1, 1).data
          loupe.style.background = rgbToHex(d[0], d[1], d[2])
          loupe.textContent = `${rgbToHex(d[0], d[1], d[2])} · rgb(${d[0]}, ${d[1]}, ${d[2]})`
          loupe.style.color = '#fff'
          loupe.style.textShadow = '0 1px 2px rgba(0,0,0,.8)'
        })
        img.addEventListener('mouseleave', () => { loupe.style.display = 'none' })
      }
    }))
  })
  function renderSwatches () {
    swatches.replaceChildren(...colors.map(hex =>
      el('button', {
        class: 'btn btn-sm',
        style: { background: hex, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)', fontFamily: 'var(--mono)' },
        title: 'Click to copy',
        onclick: () => { navigator.clipboard.writeText(hex); toast(`${hex} copied`) }
      }, hex)
    ))
  }
  return el('div', { class: 'tool-layout' }, main, sidePrivacyPanel('Click anywhere on the image to sample that pixel.'))
}

// ---------- Palette Generator ----------
TOOL_IMPLS['palette-generator'] = TOOL_IMPLS['dominant-color'] = function () {
  const main = el('div')
  const out = el('div', { class: 'mt-2' })
  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop an image to extract its palette',
      onFiles: async (files) => {
        const item = await loadItem(files[0])
        if (item.error) { out.replaceChildren(el('div', { class: 'error-box mt-3', text: item.error })); return }
        const canvas = imageToCanvas(item.img)
        const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
        const palette = extractPalette(data, 8)
        const grid = el('div', { class: 'cmp-gallery' })
        palette.forEach((c, i) => {
          const { r, g, b } = { r: parseInt(c.hex.slice(1, 3), 16), g: parseInt(c.hex.slice(3, 5), 16), b: parseInt(c.hex.slice(5, 7), 16) }
          grid.append(el('div', { class: 'cmp-item' },
            el('div', { style: { background: c.hex, height: '90px' } }),
            el('div', { class: 'ci-body' },
              el('b', { style: { fontFamily: 'var(--mono)' }, text: c.hex }),
              el('span', { text: `rgb(${r}, ${g}, ${b}) · ${(c.share * 100).toFixed(1)}% of image` }),
              el('div', { class: 'row mt-1' },
                el('button', { class: 'btn btn-sm', onclick: () => { navigator.clipboard.writeText(c.hex); toast(`${c.hex} copied`) } }, 'Copy HEX'),
                el('button', { class: 'btn btn-sm', onclick: () => { navigator.clipboard.writeText(`rgb(${r}, ${g}, ${b})`); toast('RGB copied') } }, 'RGB')
              )
            )
          ))
        })
        const cssVars = palette.map((c, i) => `--color-${i + 1}: ${c.hex};`).join('\n')
        out.replaceChildren(
          el('h2', { class: 'mt-2', text: 'Extracted palette' }),
          grid,
          el('h2', { class: 'mt-4', text: 'CSS custom properties' }),
          codeBox(cssVars)
        )
      }
    }), out)
  })
  return el('div', { class: 'tool-layout' }, main, sidePrivacyPanel('Quantization (median cut) runs locally.'))
}

// ---------- helpers ----------
function formatSelectPanel (onFmt, onQuality, include = ['keep', 'jpg', 'png', 'webp']) {
  const wrap = el('div')
  let qRow = null
  wrap.append(selectField({
    label: 'Output format', value: include[0],
    options: include.map(f => ({ value: f, label: { keep: 'Keep original', jpg: 'JPG', png: 'PNG', webp: 'WebP', avif: 'AVIF' }[f] || f.toUpperCase() })),
    onChange: v => {
      onFmt(v)
      qRow?.classList.toggle('hidden', v === 'png' || v === 'keep' && wrap._keepNoQ)
      wrap._fmt = v
    }
  }))
  qRow = sliderRow({ label: 'Quality', min: 10, max: 100, value: 92, onInput: v => onQuality(v) })
  wrap.append(qRow)
  wrap.classList.add('hidden')
  // unhide: formatSelectPanel is appended by callers; show by default
  requestAnimationFrame(() => wrap.classList.remove('hidden'))
  return wrap
}

function finish (canvas, item, fmt, quality) {
  const format = fmt === 'keep' ? extOf(item) : fmt
  return {
    canvas,
    format,
    quality: format === 'png' ? undefined : quality / 100,
    name: outputName(item.file, format)
  }
}

function extOf (item) {
  const m = /\.([a-z0-9]+)$/i.exec(item.file.name)
  const e = (m ? m[1] : 'png').toLowerCase()
  return e === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp', 'gif', 'bmp'].includes(e) ? e : 'png'
}

function sniff (buf) {
  const b = new Uint8Array(buf)
  if (b[0] === 0xFF && b[1] === 0xD8) return 'jpg'
  if (b[0] === 0x89 && b[1] === 0x50) return 'png'
  if (b[0] === 0x52 && b[8] === 0x57) return 'webp'
  if (b[0] === 0x47 && b[1] === 0x49) return 'gif'
  if (b[0] === 0x42 && b[1] === 0x4D) return 'bmp'
  if (b[0] === 0x49 && b[1] === 0x49 || b[0] === 0x4D && b[1] === 0x4D) return 'tiff'
  return 'unknown'
}

function isGIFBytes (buf) { const b = new Uint8Array(buf); return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 }

function simplifyRatio (w, h) {
  const gcd = (a, b) => b ? gcd(b, a % b) : a
  const d = gcd(w, h) || 1
  const rw = w / d; const rh = h / d
  return (rw <= 40 && rh <= 40) ? `${rw}:${rh}` : (w / h).toFixed(3) + ' : 1'
}

function codeBox (text) {
  const ta = el('textarea', { class: 'input', rows: Math.min(10, text.split('\n').length + 1), readonly: '' })
  ta.value = text
  ta.style.fontFamily = 'var(--mono)'
  ta.style.fontSize = '12px'
  return el('div', { class: 'codebox' }, ta,
    el('button', { class: 'btn btn-sm copy-btn', onclick: () => { navigator.clipboard.writeText(text); toast('Copied') } }, 'Copy'))
}

function sidePrivacyPanel (text) {
  return el('div', { class: 'tool-side' },
    el('div', { class: 'panel' },
      el('h2', {}, icon('shield', 15), ' Privacy'),
      el('p', { class: 'muted', text })
    )
  )
}
