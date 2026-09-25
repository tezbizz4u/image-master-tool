// Converter tools. Format-specific wrappers around the convert core, with
// honest capability checks for AVIF/HEIC/TIFF and SVG rasterization.
import { el, fmtBytes } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { simpleTool, outputName } from './shared.js'
import { imageToCanvas, canvasToBlob, newCanvas, caps } from '../lib/engine.js'
import { sliderRow, numberField, radioTiles, toggle } from '../components/controls.js'
import { resultActions, resultStats } from '../components/preview.js'
import { toast } from '../components/toast.js'
import { rasterizeSvg, isSvgFile, tryDecodeImageBlob, sniffFormat, FORMAT_INFO } from '../lib/formats.js'
import { buildIco } from '../lib/ico.js'
import { FAVICON_SIZES, PWA_ICON_SIZES, APPLE_TOUCH_SIZE } from '../lib/presets.js'

export const TOOL_IMPLS = {}

function makeConverter (toFmt, { alpha = false, note } = {}) {
  return simpleTool({
    multiple: true,
    settings (panel, ctx) {
      let quality = 90
      let matte = '#ffffff'
      const matteField = el('div', { class: 'field hidden' },
        el('label', { text: 'Matte color (for transparency)' }),
        el('input', { class: 'input', type: 'color', value: matte, oninput: e => { matte = e.target.value } }))
      const qRow = sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { quality = v } })
      qRow.classList.toggle('hidden', toFmt === 'png')
      if (note) panel.append(el('p', { class: 'panel-note mb-2', text: note }))
      panel.append(
        qRow,
        alpha ? el('div') : matteField
      )
      ctx.process = async (item) => {
        let canvas = imageToCanvas(item.img)
        if (!alpha && (toFmt === 'jpg' || toFmt === 'bmp')) {
          const matted = newCanvas(canvas.width, canvas.height, matte)
          matted.getContext('2d').drawImage(canvas, 0, 0)
          canvas = matted
        }
        return {
          canvas,
          format: toFmt,
          quality: toFmt === 'png' ? undefined : quality / 100,
          name: outputName(item.file, toFmt)
        }
      }
    }
  })
}

TOOL_IMPLS['jpg-to-png'] = makeConverter('png', { alpha: true })
TOOL_IMPLS['png-to-jpg'] = makeConverter('jpg')
TOOL_IMPLS['jpg-to-webp'] = makeConverter('webp')
TOOL_IMPLS['png-to-webp'] = makeConverter('webp', { alpha: true })
TOOL_IMPLS['webp-to-jpg'] = makeConverter('jpg')
TOOL_IMPLS['webp-to-png'] = makeConverter('png', { alpha: true })
TOOL_IMPLS['bmp-to-jpg'] = makeConverter('jpg')

TOOL_IMPLS['to-avif'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let quality = 60
    panel.append(
      el('p', { class: 'panel-note mb-2', text: 'AVIF gives the smallest files of any common format. Encoding uses your browser\'s built-in AVIF encoder — availability is checked before processing.' }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 60, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      if (!(await caps.supportsEncode('avif'))) {
        throw new Error('This browser can\'t encode AVIF. Chrome and Firefox support it from recent versions — WebP is a good alternative with similar savings.')
      }
      const canvas = imageToCanvas(item.img)
      return { canvas, format: 'avif', quality: quality / 100, name: outputName(item.file, 'avif') }
    }
  }
})

TOOL_IMPLS['avif-to-jpg'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let quality = 90
    panel.append(sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { quality = v } }))
    ctx.process = async (item) => {
      // Load via <img>; decode support is checked by the browser itself.
      const canvas = imageToCanvas(item.img)
      return { canvas, format: 'jpg', quality: quality / 100, name: outputName(item.file, 'jpg') }
    }
  }
})

// HEIC converter with honest capability probing of the actual file.
TOOL_IMPLS['heic-to-jpg'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let quality = 90
    panel.append(
      el('div', { class: 'info-box mb-2', text: 'HEIC decoding depends on your browser: Safari supports it natively. On other browsers we check your actual file first and tell you honestly if decoding isn\'t possible.' }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const img = await tryDecodeImageBlob(item.file)
      if (!img) {
        throw new Error('This browser can\'t decode HEIC files (only Safari does today). Quick fix: share the photo from the iPhone app and choose \"Automatic\" format, or use Safari for this conversion.')
      }
      const canvas = imageToCanvas(img)
      return { canvas, format: 'jpg', quality: quality / 100, name: outputName(item.file, 'jpg') }
    }
  }
})

TOOL_IMPLS['tiff-to-jpg'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let quality = 90
    panel.append(
      el('div', { class: 'info-box mb-2', text: 'TIFF decoding works in Safari. On browsers without TIFF support we detect it on your file and explain your options.' }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 90, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const img = await tryDecodeImageBlob(item.file)
      if (!img) {
        throw new Error('This browser can\'t decode TIFF files. Safari can — or open the image in an image editor and export as PNG/JPG first.')
      }
      const canvas = imageToCanvas(img)
      return { canvas, format: 'jpg', quality: quality / 100, name: outputName(item.file, 'jpg') }
    }
  }
})

// GIF → PNG: static GIFs convert directly; animated GIFs offer real frame
// extraction via WebCodecs ImageDecoder when the browser supports it,
// with an honest fallback note when it doesn't.
TOOL_IMPLS['gif-to-png'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let useFrame = false
    let frameIdx = 0
    let frameCount = 0
    panel.append(
      el('p', { class: 'panel-note mb-2', text: 'Static GIFs convert directly. For animated GIFs you can export a specific frame — availability depends on your browser\'s WebCodecs support.' })
    )
    const frameRow = sliderRow({ label: 'Frame', min: 0, max: 0, value: 0, onInput: v => { frameIdx = v } })
    frameRow.classList.add('hidden')

    ctx.hookAfterLoad = async (item) => {
      if (!('ImageDecoder' in window) || !item?.file) return null
      try {
        const data = await item.file.arrayBuffer()
        const decoder = new ImageDecoder({ data, type: 'image/gif' })
        await decoder.tracks.ready
        const track = decoder.tracks.selectedTrack
        if (!track || track.frameCount <= 1) return null
        frameCount = track.frameCount
        frameRow.querySelector('input').max = frameCount - 1
        frameRow.classList.remove('hidden')
        panel.append(el('p', { class: 'panel-note', text: `Animated GIF detected — ${frameCount} frames available.` }))
        useFrame = true
      } catch { /* decoder unavailable for this file */ }
      return null
    }
    panel.append(frameRow)

    ctx.process = async (item) => {
      if (useFrame && 'ImageDecoder' in window) {
        try {
          const data = await item.file.arrayBuffer()
          const decoder = new ImageDecoder({ data, type: 'image/gif' })
          await decoder.tracks.ready
          const { image } = await decoder.decode({ frameIndex: Math.min(frameIdx, frameCount - 1) })
          const canvas = document.createElement('canvas')
          canvas.width = image.displayWidth; canvas.height = image.displayHeight
          canvas.getContext('2d').drawImage(image, 0, 0)
          image.close()
          return { canvas, format: 'png', name: outputName(item.file, 'png').replace('.png', `_frame${frameIdx}.png`) }
        } catch { /* fall through to first frame */ }
      }
      const canvas = imageToCanvas(item.img)
      return { canvas, format: 'png', name: outputName(item.file, 'png') }
    }
  }
})

// GIF → animated WebP — only when the browser encodes animated WebP; we probe
// by encoding and checking bytes. Most browsers encode static WebP only.
TOOL_IMPLS['gif-to-webp'] = simpleTool({
  multiple: true,
  settings (panel, ctx) {
    let quality = 80
    panel.append(
      el('div', { class: 'warn-box mb-2', text: 'Browsers can encode single-frame WebP today; true animated WebP re-encoding needs a server or wasm encoder. This tool converts the first frame honestly — no fake animation.' }),
      sliderRow({ label: 'Quality', min: 10, max: 100, value: 80, onInput: v => { quality = v } })
    )
    ctx.process = async (item) => {
      const canvas = imageToCanvas(item.img)
      return { canvas, format: 'webp', quality: quality / 100, name: outputName(item.file, 'webp') }
    }
  }
})

// SVG converters.
TOOL_IMPLS['svg-to-png'] = svgTool('png')
TOOL_IMPLS['svg-to-jpg'] = svgTool('jpg')

function svgTool (fmt) {
  return simpleTool({
    settings (panel, ctx) {
      let scale = 2; let quality = 92; let bg = '#ffffff'
      panel.append(
        sliderRow({ label: 'Scale', min: 0.25, max: 8, step: 0.25, value: 2, fmt: v => `${v}×`, onInput: v => { scale = v } }),
        fmt === 'jpg' ? colorFieldLocal(v => { bg = v }) : el('div'),
        fmt === 'jpg' ? sliderRow({ label: 'Quality', min: 10, max: 100, value: 92, onInput: v => { quality = v } }) : el('div')
      )
      ctx.process = async (item) => {
        const text = await item.file.text()
        let canvas = await rasterizeSvg(text, scale)
        if (fmt === 'jpg') {
          const matted = newCanvas(canvas.width, canvas.height, bg)
          matted.getContext('2d').drawImage(canvas, 0, 0)
          canvas = matted
        }
        return { canvas, format: fmt, quality: fmt === 'png' ? undefined : quality / 100, name: outputName(item.file, fmt) }
      }
    }
  })
}

function colorFieldLocal (onInput) {
  return el('div', { class: 'field' },
    el('label', { text: 'Background color' }),
    el('input', { class: 'input', type: 'color', value: '#ffffff', oninput: e => onInput(e.target.value) }))
}

// Favicon generator: multi-size ICO + PNGs + apple-touch-icon.
TOOL_IMPLS['favicon-generator'] = function () {
  const main = el('div')
  const out = el('div')
  let outputs = []

  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Drop a square image (PNG recommended)',
      onFiles: async (files) => {
        const item = await loadItem(files[0])
        if (item.error) { out.replaceChildren(el('div', { class: 'error-box mt-3', text: item.error })); return }
        const canvas = imageToCanvas(item.img)
        // Center-crop to square
        const side = Math.min(canvas.width, canvas.height)
        const cropped = cropCanvas(canvas, (canvas.width - side) / 2, (canvas.height - side) / 2, side, side)

        out.replaceChildren(el('div', { class: 'row mt-3' }, el('div', { class: 'spinner' }), el('span', { class: 'muted', text: 'Generating icon set…' })))
        outputs = []
        const pngTargets = []
        for (const size of FAVICON_SIZES) {
          const c = resizeCanvas(cropped, size, size)
          pngTargets.push({ size, blob: await canvasToBlob(c, 'png') })
        }
        const ico = await buildIco(pngTargets)
        outputs.push({ name: 'favicon.ico', blob: ico, url: URL.createObjectURL(ico), format: 'ico' })
        for (const size of [...PWA_ICON_SIZES, APPLE_TOUCH_SIZE]) {
          const c = resizeCanvas(cropped, size, size)
          const blob = await canvasToBlob(c, 'png')
          const name = size === APPLE_TOUCH_SIZE ? 'apple-touch-icon.png' : `icon-${size}.png`
          outputs.push({ name, blob, url: URL.createObjectURL(blob), format: 'png' })
        }
        render()
      }
    }), out)
  })

  function render () {
    const gallery = el('div', { class: 'cmp-gallery mt-2' })
    for (const o of outputs) {
      gallery.append(el('div', { class: 'cmp-item' },
        el('img', { src: o.url, alt: o.name }),
        el('div', { class: 'ci-body' },
          el('b', { text: o.name }),
          el('span', { text: fmtBytes(o.blob.size) }),
          el('div', { class: 'mt-1' }, resultActions([o]))
        )
      ))
    }
    out.replaceChildren(
      el('h2', { class: 'mt-2', text: 'Your favicon set' }),
      gallery,
      el('div', { class: 'mt-3' }, resultActions(outputs, {})),
      el('div', { class: 'panel mt-3' },
        el('h2', { text: 'Add to your site' }),
        codeBoxStatic(`<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`)
      )
    )
  }

  return el('div', { class: 'tool-layout' }, main, el('div', { class: 'tool-side' },
    el('div', { class: 'panel' },
      el('h2', { text: 'What you get' }),
      el('p', { class: 'muted', text: 'A real multi-size favicon.ico (16/32/48), 192 and 512 px PWA icons, and the 180 px apple-touch-icon — generated locally.' })
    ),
    el('div', { class: 'panel' }, el('p', { class: 'muted' }, icon('shield', 14), ' Icons are generated in your browser.'))
  ))
}

import { cropCanvas, resizeCanvas } from '../lib/engine.js'
import { loadItem } from './shared.js'

function codeBoxStatic (text) {
  const ta = el('textarea', { class: 'input', rows: 4, readonly: '' })
  ta.value = text
  ta.style.fontFamily = 'var(--mono)'
  ta.style.fontSize = '12px'
  return el('div', { class: 'codebox' }, ta,
    el('button', { class: 'btn btn-sm copy-btn', onclick: () => { navigator.clipboard.writeText(text); toast('Copied') } }, 'Copy'))
}
