// Developer Tools.
import { el, fmtBytes, readFileAsText, readFileAsDataURL } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { simpleTool, loadItem, outputName } from './shared.js'
import { imageToCanvas, canvasToBlob, newCanvas, fitCanvas, resizeCanvas } from '../lib/engine.js'
import { sliderRow, numberField, colorField, radioTiles, selectField, textField, toggle } from '../components/controls.js'
import { previewBox, resultActions } from '../components/preview.js'
import { createUploadZone } from '../components/upload.js'
import { toast } from '../components/toast.js'
import { optimizeSvg } from '../lib/svg-optimizer.js'
import { sanitizeSvg, svgToBlob } from '../lib/formats.js'
import { perceptualHash, extractPalette } from '../lib/palette.js'
import { APP_ICON_SIZES_IOS, APP_ICON_SIZES_ANDROID } from '../lib/presets.js'
import { buildIco } from '../lib/ico.js'

export const TOOL_IMPLS = {}

function codeBox (text) {
  const ta = el('textarea', { class: 'input', rows: Math.min(12, text.split('\n').length + 1), readonly: '' })
  ta.value = text
  ta.style.fontFamily = 'var(--mono)'
  ta.style.fontSize = '12px'
  return el('div', { class: 'codebox mt-2' }, ta,
    el('button', { class: 'btn btn-sm copy-btn', onclick: () => { navigator.clipboard.writeText(text); toast('Copied to clipboard') } }, 'Copy'))
}

function fileDrop ({ label, onFile }) {
  const main = el('div')
  const out = el('div', { class: 'mt-3' })
  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label,
      onFiles: async (files) => {
        out.replaceChildren(el('div', { class: 'row mt-3' }, el('div', { class: 'spinner' })))
        try { await onFile(files[0], out) } catch (e) {
          out.replaceChildren(el('div', { class: 'error-box mt-3', text: 'We couldn\'t read this file. It may be corrupted or in an unsupported format.' }))
        }
      }
    }), out)
  })
  return { main, out }
}

// ---------- Image → Base64 ----------
TOOL_IMPLS['image-to-base64'] = function () {
  return layout(fileDrop({
    label: 'Drop an image to encode',
    onFile: async (file, out) => {
      const buf = await file.arrayBuffer()
      const b64 = arrayBufferToBase64(buf)
      const dataUri = `data:${file.type || guessMime(file)};base64,${b64}`
      const overhead = ((dataUri.length / file.size) - 1) * 100
      out.replaceChildren(
        el('div', { class: 'warn-box mb-2', text: `Data URI size: ${fmtBytes(dataUri.length)} (${overhead.toFixed(0)}% overhead vs the ${fmtBytes(file.size)} original). Keep inline images under ~5 KB; reference larger ones as files.` }),
        el('h2', { text: 'Data URI' }),
        codeBox(dataUri),
        el('h2', { class: 'mt-3', text: 'Bare Base64' }),
        codeBox(b64)
      )
    }
  }))
}

// ---------- Base64 → Image ----------
TOOL_IMPLS['base64-to-image'] = function () {
  const main = el('div')
  const out = el('div')
  main.append(
    el('div', { class: 'field' },
      el('label', { text: 'Paste Base64 or a data URI' }),
      el('textarea', { class: 'input', rows: 7, placeholder: 'data:image/png;base64,...', style: { fontFamily: 'var(--mono)', fontSize: '12px' } })),
    el('button', { class: 'btn btn-primary', onclick: decode }, icon('zap', 15), 'Decode & preview'),
    out
  )
  function decode () {
    const text = main.querySelector('textarea').value.trim()
    out.replaceChildren()
    if (!text) { toast('Paste a Base64 string or data URI first.', 'info'); return }
    const dataUri = text.startsWith('data:') ? text : `data:image/png;base64,${text.replace(/\s/g, '')}`
    try {
      const img = el('img', { src: dataUri, alt: 'Decoded image', style: { maxWidth: '100%', maxHeight: '420px', borderRadius: '10px', border: '1px solid var(--border)' } })
      out.append(el('div', { class: 'preview-box checker-bg mt-3' }, img))
      img.addEventListener('load', async () => {
        // fetch to blob for download
        const res = await fetch(dataUri)
        const blob = await res.blob()
        out.append(resultActions([{ name: `decoded.${(blob.type.split('/')[1] || 'png').replace('+xml', '')}`, blob }]))
      })
    } catch {
      out.append(el('div', { class: 'error-box mt-3', text: 'That doesn\'t look like valid Base64 image data. Check for stray spaces or line breaks.' }))
    }
  }
  return layout(main)
}

// ---------- SVG Optimizer ----------
TOOL_IMPLS['svg-optimizer'] = function () {
  return layout(fileDrop({
    label: 'Drop an SVG to optimize',
    onFile: async (file, out) => {
      const text = await file.text()
      const r = optimizeSvg(text, { precision: 2 })
      out.replaceChildren(
        el('div', { class: 'result-stats' },
          el('div', { class: 'rs' }, el('label', { text: 'Before' }), el('b', { text: fmtBytes(r.before) })),
          el('div', { class: 'rs' }, el('label', { text: 'After' }), el('b', { text: fmtBytes(r.after) })),
          el('div', { class: 'rs' }, el('label', { text: 'Saved' }), el('b', { class: 'ok', text: `${r.pct.toFixed(1)}%` }))
        ),
        el('h2', { class: 'mt-3', text: 'Optimized SVG' }),
        codeBox(r.svg),
        el('div', { class: 'mt-2' },
          el('button', {
            class: 'btn btn-primary',
            onclick: () => {
              const blob = new Blob([r.svg], { type: 'image/svg+xml' })
              import('../core/utils.js').then(({ download }) => download(blob, file.name.replace(/\.svg$/i, '') + '.min.svg'))
            }
          }, icon('download', 15), 'Download optimized SVG'))
      )
    }
  }))
}

// ---------- SVG Preview ----------
TOOL_IMPLS['svg-preview'] = function () {
  const main = el('div')
  const out = el('div', { class: 'mt-3' })
  main.append(
    el('div', { class: 'field' },
      el('label', { text: 'SVG markup' }),
      el('textarea', { class: 'input', rows: 8, placeholder: '<svg xmlns="..." ...>', style: { fontFamily: 'var(--mono)', fontSize: '12px' } })),
    el('div', { class: 'row' },
      el('button', { class: 'btn btn-primary', onclick: render }, icon('eye', 15), 'Preview safely'),
      el('label', { class: 'check' }, Object.assign(el('input', { type: 'checkbox', onchange: e => { dark = e.target.checked; render() } })), el('span', { text: 'Dark background' })))
  )
  let dark = false
  function render () {
    const text = main.querySelector('textarea').value
    out.replaceChildren()
    if (!text.trim()) { toast('Paste SVG markup first.', 'info'); return }
    const sizes = [16, 24, 32, 64, 128, 256]
    const row = el('div', { class: 'row wrap mt-1', style: { background: dark ? '#111318' : '#ffffff', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', alignItems: 'flex-end' } })
    for (const s of sizes) {
      const url = URL.createObjectURL(svgToBlob(text))
      const img = el('img', { src: url, width: s, height: s, alt: `${s}px preview` })
      img.addEventListener('load', () => URL.revokeObjectURL(url))
      row.append(el('div', { style: { textAlign: 'center' } }, img, el('div', { class: 'muted mt-1', text: `${s}px` })))
    }
    out.append(row)
  }
  return layout(main)
}

// ---------- App Icon Generator ----------
TOOL_IMPLS['app-icon-generator'] = function () {
  return layout(fileDrop({
    label: 'Drop a square 1024×1024 master icon',
    onFile: async (file, out) => {
      const item = await loadItem(file)
      if (item.error) { out.replaceChildren(el('div', { class: 'error-box', text: item.error })); return }
      const master = imageToCanvas(item.img)
      const side = Math.min(master.width, master.height)
      const { cropCanvas } = await import('../lib/engine.js')
      const square = cropCanvas(master, (master.width - side) / 2, (master.height - side) / 2, side, side)
      const outputs = []
      for (const s of [...new Set([...APP_ICON_SIZES_IOS, ...APP_ICON_SIZES_ANDROID])]) {
        const c = resizeCanvas(square, s, s)
        const blob = await canvasToBlob(c, 'png')
        outputs.push({ name: `icon-${s}.png`, blob, url: URL.createObjectURL(blob), format: 'png' })
      }
      const gallery = el('div', { class: 'cmp-gallery mt-2' })
      for (const o of outputs.slice(0, 12)) {
        gallery.append(el('div', { class: 'cmp-item' },
          el('img', { src: o.url, alt: o.name }),
          el('div', { class: 'ci-body' }, el('b', { text: o.name }), el('span', { text: fmtBytes(o.blob.size) }))
        ))
      }
      out.replaceChildren(
        el('h2', { text: `${outputs.length} icons generated` }),
        gallery,
        el('div', { class: 'mt-3' }, resultActions(outputs))
      )
    }
  }))
}

// ---------- OG Image Generator ----------
TOOL_IMPLS['og-image-generator'] = function () {
  const main = el('div')
  const side = el('div', { class: 'tool-side' })
  const preview = previewBox()
  const state = { title: 'Your product launched 🚀', desc: 'A short description sits here.', bg: '#111318', color: '#ffffff', useImage: false, accent: '#6366f1' }
  let bgImg = null
  let canvas = null

  function render () {
    const W = 1200; const H = 630
    canvas = newCanvas(W, H, state.bg)
    const ctx = canvas.getContext('2d')
    if (state.useImage && bgImg) {
      const s = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight)
      ctx.drawImage(bgImg, (W - bgImg.naturalWidth * s) / 2, (H - bgImg.naturalHeight * s) / 2, bgImg.naturalWidth * s, bgImg.naturalHeight * s)
      ctx.fillStyle = 'rgba(10,12,18,.55)'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.fillStyle = state.accent
    ctx.fillRect(0, 0, 16, H)
    const { drawText } = window.__dt || {}
    import('../lib/engine.js').then(({ drawText }) => {
      drawText(ctx, { text: state.title, x: 72, y: 120, size: 72, color: state.color, weight: '800', maxWidth: W - 144, font: 'Arial, sans-serif' }, W, H)
      drawText(ctx, { text: state.desc, x: 72, y: 330, size: 36, color: 'rgba(255,255,255,.75)', weight: '400', maxWidth: W - 200, font: 'Arial, sans-serif' }, W, H)
      preview.set(canvas.toDataURL('image/png'))
      dl.disabled = false
    })
  }

  const dl = el('button', { class: 'btn btn-primary btn-block mt-2', disabled: true, onclick: async () => {
    const blob = await canvasToBlob(canvas, 'png')
    const { download } = await import('../core/utils.js')
    download(blob, 'og-image.png')
  } }, icon('download', 15), 'Download 1200×630 PNG')

  import('../components/upload.js').then(({ createUploadZone }) => {
    main.append(createUploadZone({
      compact: true,
      label: 'Optional background image',
      onFiles: async (files) => {
        const item = await loadItem(files[0])
        if (!item.error) { bgImg = item.img; state.useImage = true; render() }
      }
    }), el('div', { class: 'panel mt-3' }, el('h2', { text: 'Preview (1200×630)' }), preview))
  })

  side.append(el('div', { class: 'panel' },
    el('h2', { text: 'Content' }),
    textField({ label: 'Title', value: state.title, onInput: v => { state.title = v; render() } }),
    textField({ label: 'Description', value: state.desc, onInput: v => { state.desc = v; render() } }),
    colorField({ label: 'Background', value: state.bg, onInput: v => { state.bg = v; state.useImage = false; render() } }),
    colorField({ label: 'Accent bar', value: state.accent, onInput: v => { state.accent = v; render() } })
  ), el('div', { class: 'panel mt-3' }, el('p', { class: 'muted' }, icon('shield', 14), ' Composed locally at the standard Open Graph size.')), el('div', { class: 'mt-2' }, dl))

  render()
  return el('div', { class: 'tool-layout' }, main, side)
}

// ---------- Placeholder Generator ----------
TOOL_IMPLS['placeholder-generator'] = function () {
  const main = el('div')
  const side = el('div', { class: 'tool-side' })
  const preview = previewBox()
  const state = { W: 800, H: 600, color: '#6366f1', color2: '', label: true, fmt: 'png' }
  let canvas = null

  function render () {
    canvas = newCanvas(state.W, state.H)
    const ctx = canvas.getContext('2d')
    if (state.color2) {
      const g = ctx.createLinearGradient(0, 0, state.W, state.H)
      g.addColorStop(0, state.color); g.addColorStop(1, state.color2)
      ctx.fillStyle = g
    } else ctx.fillStyle = state.color
    ctx.fillRect(0, 0, state.W, state.H)
    if (state.label) {
      import('../lib/engine.js').then(({ drawText }) => {
        drawText(ctx, { text: `${state.W} × ${state.H}`, x: state.W / 2, y: state.H / 2 - 20, size: Math.max(16, Math.min(state.W, state.H) / 10), color: 'rgba(255,255,255,.9)', align: 'center', weight: '700' }, state.W, state.H)
        preview.set(canvas.toDataURL('image/png'))
      })
    } else preview.set(canvas.toDataURL('image/png'))
    dl.disabled = false
  }
  const dl = el('button', { class: 'btn btn-primary btn-block mt-2', disabled: true, onclick: async () => {
    const blob = await canvasToBlob(canvas, state.fmt)
    const { download } = await import('../core/utils.js')
    download(blob, `placeholder-${state.W}x${state.H}.${state.fmt}`)
  } }, icon('download', 15), 'Download')

  side.append(el('div', { class: 'panel' },
    el('h2', { text: 'Size & style' }),
    el('div', { class: 'grid-2' },
      numberField({ label: 'Width', value: 800, min: 16, max: 4096, onInput: v => { state.W = v || 800; render() } }),
      numberField({ label: 'Height', value: 600, min: 16, max: 4096, onInput: v => { state.H = v || 600; render() } })),
    colorField({ label: 'Color', value: '#6366f1', onInput: v => { state.color = v; render() } }),
    colorField({ label: 'Gradient to (optional)', value: '#a855f7', onInput: v => { state.color2 = v; render() } }),
    toggle({ label: 'Show dimensions text', value: true, onChange: v => { state.label = v; render() } }),
    radioTiles({ label: 'Format', value: 'png', options: [{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'webp', label: 'WebP' }], onChange: v => { state.fmt = v } }),
    el('div', { class: 'mt-2' }, dl)
  ))
  main.append(preview)
  render()
  return el('div', { class: 'tool-layout' }, main, side)
}

// ---------- CSS Background Generator ----------
TOOL_IMPLS['css-background-generator'] = function () {
  return layout(fileDrop({
    label: 'Drop an image to get CSS',
    onFile: async (file, out) => {
      const dataUri = await readFileAsDataURL(file)
      const item = await loadItem(file)
      const css = `.hero {\n  background-image: url("${dataUri}");\n  background-size: cover;\n  background-position: center;\n  background-repeat: no-repeat;\n}`
      const tile = `.tile {\n  background-image: url("${dataUri}");\n  background-repeat: repeat;\n  background-size: auto;\n}`
      out.replaceChildren(
        el('div', { class: 'warn-box mb-2', text: `Inline size: ${fmtBytes(dataUri.length)} vs the ${fmtBytes(file.size)} original (~33% overhead) — best for small decorative images.` }),
        el('h2', { text: 'Cover background' }),
        codeBox(css),
        el('h2', { class: 'mt-3', text: 'Tiled background' }),
        codeBox(tile)
      )
    }
  }))
}

// ---------- Image Hash ----------
TOOL_IMPLS['image-hash'] = simpleTool({
  multiple: true,
  showComparison: false,
  settings (panel, ctx) {
    panel.append(el('p', { class: 'panel-note', text: 'Produces a 64-bit perceptual hash (dHash): similar images get similar hashes. Great for near-duplicate detection. MD5 of raw bytes is also shown.' }))
  },
  async process (item, ctx) {
    const canvas = imageToCanvas(item.img)
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
    const phash = perceptualHash(data)
    const md5 = await md5Hex(await item.file.arrayBuffer())
    return {
      canvas,
      format: 'png',
      name: outputName(item.file, 'png'),
      note: `dHash: ${phash} · MD5: ${md5}`
    }
  }
})

// ---------- Dominant Color Finder ----------
TOOL_IMPLS['dominant-color'] = function () {
  return layout(fileDrop({
    label: 'Drop an image to find its dominant colors',
    onFile: async (file, out) => {
      const item = await loadItem(file)
      if (item.error) { out.replaceChildren(el('div', { class: 'error-box', text: item.error })); return }
      const canvas = imageToCanvas(item.img)
      const palette = extractPalette(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height), 6)
      const cssVars = palette.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join('\n')
      out.replaceChildren(
        el('div', { class: 'row wrap mt-2' }, palette.map(c =>
          el('button', { class: 'btn', style: { background: c.hex, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)' }, onclick: () => { navigator.clipboard.writeText(c.hex); toast(`${c.hex} copied`) } }, c.hex))),
        el('h2', { class: 'mt-3', text: 'CSS variables' }),
        codeBox(`:root {\n${cssVars}\n}`)
      )
    }
  }))
}

// ---------- helpers ----------
function layout (children) {
  return el('div', { class: 'tool-layout' },
    el('div', {}, children.main ?? children),
    el('div', { class: 'tool-side' },
      el('div', { class: 'panel' },
        el('h2', {}, icon('shield', 15), ' Privacy'),
        el('p', { class: 'muted', text: 'Runs entirely in your browser — nothing is uploaded.' })))
  )
}

function arrayBufferToBase64 (buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function guessMime (file) {
  const m = /\.([a-z0-9]+)$/i.exec(file.name)
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' })[m?.[1]?.toLowerCase()] || 'application/octet-stream'
}

async function md5Hex (buf) {
  // Correct compact MD5 (RFC 1321). Used only as a byte-level file fingerprint;
  // cryptographic needs would use SubtleCrypto (SHA-256) instead.
  const bytes = new Uint8Array(buf)
  const rl = (x, c) => (x << c) | (x >>> (32 - c))
  const add = (a, b) => (a + b) | 0
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
  const K = new Int32Array(64)
  for (let i = 0; i < 64; i++) K[i] = (Math.abs(Math.sin(i + 1)) * 4294967296) | 0
  const len = bytes.length
  const withPad = new Uint8Array((((len + 8) >> 6) + 1) * 64)
  withPad.set(bytes)
  withPad[len] = 0x80
  const view = new DataView(withPad.buffer)
  view.setUint32(withPad.length - 8, len * 8 >>> 0, true)
  view.setUint32(withPad.length - 4, Math.floor(len * 8 / 4294967296), true)

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
  const M = new Int32Array(16)
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = view.getInt32(off + i * 4, true)
    let A = a0, B = b0, C = c0, D = d0
    for (let i = 0; i < 64; i++) {
      let F; let g
      if (i < 16) { F = (B & C) | (~B & D); g = i }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16 }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16 }
      else { F = C ^ (B | ~D); g = (7 * i) % 16 }
      F = add(add(F, A), add(K[i], M[g]))
      A = D
      D = C
      C = B
      B = add(B, rl(F, S[i]))
    }
    a0 = add(a0, A); b0 = add(b0, B); c0 = add(c0, C); d0 = add(d0, D)
  }
  const hexLE = v => {
    let s = ''
    for (let i = 0; i < 4; i++) s += ((v >>> (i * 8)) & 255).toString(16).padStart(2, '0')
    return s
  }
  return hexLE(a0) + hexLE(b0) + hexLE(c0) + hexLE(d0)
}
