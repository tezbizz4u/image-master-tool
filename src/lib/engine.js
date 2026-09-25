// Shared image-processing engine. Every tool calls these primitives instead of
// reimplementing pixel logic. Canvas-based; heavy per-pixel work lives in the
// worker module (workers/image.js).

export const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  svg: 'image/svg+xml'
}

export function mimeFor (fmt) { return MIME[String(fmt).toLowerCase()] || 'image/png' }

// ---------- Capability detection ----------
export const caps = {
  _cache: {},
  async supportsEncode (fmt) {
    if (this._cache[fmt] !== undefined) return this._cache[fmt]
    const ok = await new Promise(resolve => {
      const c = document.createElement('canvas')
      c.width = c.height = 2
      try {
        const url = c.toDataURL(mimeFor(fmt))
        resolve(url.startsWith(`data:${mimeFor(fmt)}`))
      } catch { resolve(false) }
    })
    this._cache[fmt] = ok
    return ok
  },
  async supportsDecode (mime) {
    // Probe decode by attempting to load a 1-px image of that mime via a
    // tiny generated payload — not reliably possible without a real file,
    // so callers pass the user's own Blob where possible.
    return true
  }
}

// ---------- Loading ----------
export function loadImageFromBlob (blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode-failed')) }
    img.src = url
  })
}

export async function loadImageFromFile (file) {
  return loadImageFromBlob(file)
}

// Renders an image (or SVG string) into a canvas at its natural size.
export function imageToCanvas (img, width = img.naturalWidth || img.width, height = img.naturalHeight || img.height) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c
}

// ---------- Export ----------
export function canvasToBlob (canvas, fmt = 'png', quality = 0.9) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('encode-failed')),
      mimeFor(fmt),
      quality
    )
  })
}

// ---------- Geometry ----------
export function resizeCanvas (src, width, height) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(width))
  c.height = Math.max(1, Math.round(height))
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Progressive downscale for big reductions (avoids aliasing).
  let cur = src
  let cw = src.width; let ch = src.height
  while (cw / 2 >= c.width && ch / 2 >= c.height && cw > 2 && ch > 2) {
    const half = document.createElement('canvas')
    half.width = Math.max(1, Math.floor(cw / 2))
    half.height = Math.max(1, Math.floor(ch / 2))
    const hctx = half.getContext('2d')
    hctx.imageSmoothingEnabled = true
    hctx.imageSmoothingQuality = 'high'
    hctx.drawImage(cur, 0, 0, half.width, half.height)
    cur = half; cw = half.width; ch = half.height
  }
  ctx.drawImage(cur, 0, 0, c.width, c.height)
  return c
}

export function cropCanvas (src, x, y, w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  c.getContext('2d').drawImage(src, Math.round(x), Math.round(y), c.width, c.height, 0, 0, c.width, c.height)
  return c
}

export function rotateCanvas (src, degrees) {
  const rad = degrees * Math.PI / 180
  const w = src.width; const h = src.height
  const sin = Math.abs(Math.sin(rad)); const cos = Math.abs(Math.cos(rad))
  const outW = Math.round(w * cos + h * sin)
  const outH = Math.round(w * sin + h * cos)
  const c = document.createElement('canvas')
  c.width = outW; c.height = outH
  const ctx = c.getContext('2d')
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate(rad)
  ctx.drawImage(src, -w / 2, -h / 2)
  return c
}

export function flipCanvas (src, horizontal) {
  const c = document.createElement('canvas')
  c.width = src.width; c.height = src.height
  const ctx = c.getContext('2d')
  ctx.translate(horizontal ? c.width : 0, horizontal ? 0 : c.height)
  ctx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1)
  ctx.drawImage(src, 0, 0)
  return c
}

export function newCanvas (w, h, fill) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  if (fill) {
    const ctx = c.getContext('2d')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, c.width, c.height)
  }
  return c
}

// Fit src into a WxH canvas: 'contain' | 'cover' | 'stretch'
export function fitCanvas (src, W, H, mode = 'contain', background = null) {
  const c = newCanvas(W, H, background)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (mode === 'stretch') {
    ctx.drawImage(src, 0, 0, W, H)
    return c
  }
  const sw = src.width; const sh = src.height
  const scale = mode === 'cover' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh)
  const dw = sw * scale; const dh = sh * scale
  ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh)
  return c
}

// ---------- Adjustments (applied via ctx.filter where possible + pixel ops) ----------
export function applyAdjustments (src, adj) {
  const c = newCanvas(src.width, src.height)
  const ctx = c.getContext('2d')
  // Brightness/contrast/saturation have GPU-accelerated paths.
  const parts = []
  if (adj.brightness) parts.push(`brightness(${1 + adj.brightness / 100})`)
  if (adj.contrast) parts.push(`contrast(${1 + adj.contrast / 100})`)
  if (adj.saturation) parts.push(`saturate(${1 + adj.saturation / 100})`)
  if (adj.hueRotate) parts.push(`hue-rotate(${adj.hueRotate}deg)`)
  ctx.filter = parts.length ? parts.join(' ') : 'none'
  ctx.drawImage(src, 0, 0)
  ctx.filter = 'none'
  if (adj.opacity != null && adj.opacity < 100) {
    // Apply opacity by compositing over transparent (visual transparency).
    const out = newCanvas(c.width, c.height)
    const octx = out.getContext('2d')
    octx.globalAlpha = adj.opacity / 100
    octx.drawImage(c, 0, 0)
    return out
  }
  return c
}

// Pixel-level adjustments executed in the worker for heavy parameters.
export function applyPixelAdjustments (imageData, adj) {
  const d = imageData.data
  const get = (k, dflt) => (adj[k] == null ? dflt : adj[k])
  const brightness = get('brightness', 0) * 2.55
  const contrast = 1 + get('contrast', 0) / 100
  const saturation = 1 + get('saturation', 0) / 100
  const exposure = get('exposure', 0)
  const gamma = Math.max(0.1, get('gamma', 1))
  const temp = get('temperature', 0)
  const tint = get('tint', 0)
  const vibrance = get('vibrance', 0) / 100
  const highlights = get('highlights', 0) / 100
  const shadows = get('shadows', 0) / 100

  const expFactor = Math.pow(2, exposure)
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i]; let g = d[i + 1]; let b = d[i + 2]
    // exposure (linear-ish)
    r *= expFactor; g *= expFactor; b *= expFactor
    // brightness / contrast
    r = (r + brightness - 128) * contrast + 128
    g = (g + brightness - 128) * contrast + 128
    b = (b + brightness - 128) * contrast + 128
    // temperature / tint
    r += temp * 0.6; b -= temp * 0.6
    g += tint * 0.4; r -= tint * 0.2; b -= tint * 0.2
    // saturation + vibrance
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const sat = saturation + vibrance * (1 - Math.min(1, Math.abs(lum - 128) / 128))
    r = lum + (r - lum) * sat
    g = lum + (g - lum) * sat
    b = lum + (b - lum) * sat
    // shadows / highlights
    const l2 = lum / 255
    const shW = Math.pow(1 - Math.min(1, l2), 2)
    const hiW = Math.pow(Math.max(0, l2 - 0.5) * 2, 2)
    const shift = shadows * shW * 120 - highlights * hiW * 120
    r += shift; g += shift; b += shift
    // gamma
    if (gamma !== 1) {
      r = 255 * Math.pow(Math.min(1, Math.max(0, r / 255)), 1 / gamma)
      g = 255 * Math.pow(Math.min(1, Math.max(0, g / 255)), 1 / gamma)
      b = 255 * Math.pow(Math.min(1, Math.max(0, b / 255)), 1 / gamma)
    }
    d[i] = Math.max(0, Math.min(255, r))
    d[i + 1] = Math.max(0, Math.min(255, g))
    d[i + 2] = Math.max(0, Math.min(255, b))
  }
  return imageData
}

// Precomputed gamma/curves LUT for speed.
export function makeLUT (fn) {
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) lut[i] = Math.max(0, Math.min(255, fn(i)))
  return lut
}

export function applyLUT (imageData, lutR, lutG = lutR, lutB = lutR) {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lutR[d[i]]
    d[i + 1] = lutG[d[i + 1]]
    d[i + 2] = lutB[d[i + 2]]
  }
  return imageData
}

// ---------- Text drawing helper ----------
export function drawText (ctx, spec, W, H) {
  const {
    text = '', x = 50, y = 50, size = 48, color = '#ffffff', font = 'Arial, sans-serif',
    weight = '700', align = 'left', baseline = 'top', stroke = '', strokeWidth = 0,
    shadow = false, shadowColor = 'rgba(0,0,0,.6)', shadowBlur = 8, opacity = 1,
    angle = 0, letterSpacing = 0, lineHeight = 1.2, maxWidth = 0, bg = ''
  } = spec
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.translate(x, y)
  if (angle) ctx.rotate(angle * Math.PI / 180)
  ctx.font = `${weight} ${size}px ${font}`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`

  const lines = String(text).split('\n')
  const lineH = size * lineHeight

  // Wrap if maxWidth is set
  let out = lines
  if (maxWidth > 0) {
    out = []
    for (const line of lines) {
      const words = line.split(' ')
      let cur = ''
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w
        if (ctx.measureText(test).width > maxWidth && cur) {
          out.push(cur)
          cur = w
        } else cur = test
      }
      out.push(cur)
    }
  }

  if (bg) {
    let wMax = 0
    for (const l of out) wMax = Math.max(wMax, ctx.measureText(l).width)
    const padX = size * 0.35; const padY = size * 0.25
    const bw = wMax + padX * 2
    const bh = out.length * lineH + padY * 2 - (lineH - size)
    let bx = 0
    if (align === 'center') bx = -bw / 2
    else if (align === 'right') bx = -bw
    ctx.fillStyle = bg
    ctx.fillRect(bx, -padY, bw, bh)
  }

  if (shadow) {
    ctx.shadowColor = shadowColor
    ctx.shadowBlur = shadowBlur
  }
  out.forEach((line, i) => {
    const ly = i * lineH
    if (strokeWidth > 0) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = strokeWidth
      ctx.lineJoin = 'round'
      ctx.strokeText(line, 0, ly)
    }
    ctx.fillStyle = color
    ctx.fillText(line, 0, ly)
  })
  ctx.restore()
  return { lines: out.length, height: out.length * lineH, width: Math.max(...out.map(l => ctx.measureText(l).width), 0) }
}

// ---------- Watermark (tiled or positioned) ----------
export function drawWatermark (ctx, W, H, spec) {
  const { text = '© Watermark', image = null, position = 'bottom-right', opacity = 0.5, scale = 4, rotation = 0, tile = false, color = '#ffffff', margin = 20 } = spec
  ctx.save()
  ctx.globalAlpha = opacity
  if (image) {
    const iw = W * (scale / 100) * 2
    const ih = iw * (image.naturalHeight / image.naturalWidth)
    if (tile) {
      for (let y = 0; y < H + ih; y += ih + margin) {
        for (let x = 0; x < W + iw; x += iw + margin) {
          ctx.drawImage(image, x, y, iw, ih)
        }
      }
    } else {
      const pos = positionXY(position, W, H, iw, ih, margin)
      ctx.translate(pos.x + iw / 2, pos.y + ih / 2)
      if (rotation) ctx.rotate(rotation * Math.PI / 180)
      ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih)
    }
  } else {
    const size = Math.max(12, W * (scale / 400))
    ctx.font = `600 ${size}px Arial, sans-serif`
    const tw = ctx.measureText(text).width
    const th = size
    if (tile) {
      ctx.translate(W / 2, H / 2)
      if (rotation) ctx.rotate(rotation * Math.PI / 180)
      const diag = Math.sqrt(W * W + H * H)
      ctx.fillStyle = color
      for (let y = -diag; y < diag; y += th * 4) {
        for (let x = -diag; x < diag; x += tw + th * 3) {
          ctx.fillText(text, x, y)
        }
      }
    } else {
      const pos = positionXY(position, W, H, tw, th, margin)
      if (rotation) {
        ctx.translate(pos.x + tw / 2, pos.y + th / 2)
        ctx.rotate(rotation * Math.PI / 180)
        ctx.fillStyle = color
        ctx.fillText(text, -tw / 2, th / 3)
      } else {
        ctx.fillStyle = color
        ctx.fillText(text, pos.x, pos.y + th)
      }
    }
  }
  ctx.restore()
}

function positionXY (pos, W, H, w, h, m) {
  const map = {
    'top-left': [m, m], 'top-center': [(W - w) / 2, m], 'top-right': [W - w - m, m],
    'middle-left': [m, (H - h) / 2], center: [(W - w) / 2, (H - h) / 2], 'middle-right': [W - w - m, (H - h) / 2],
    'bottom-left': [m, H - h - m], 'bottom-center': [(W - w) / 2, H - h - m], 'bottom-right': [W - w - m, H - h - m]
  }
  const [x, y] = map[pos] || map['bottom-right']
  return { x, y }
}

// ---------- Border & corners ----------
export function addBorder (src, { size = 20, color = '#ffffff', radius = 0, outer = 0 }) {
  const W = src.width + (size + outer) * 2
  const H = src.height + (size + outer) * 2
  const c = newCanvas(W, H, color)
  const ctx = c.getContext('2d')
  // rounded clip for the image area
  ctx.save()
  roundRectPath(ctx, size + outer, size + outer, src.width, src.height, radius)
  ctx.clip()
  ctx.drawImage(src, size + outer, size + outer)
  ctx.restore()
  return c
}

export function roundRectPath (ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function roundCorners (src, radius) {
  const c = newCanvas(src.width, src.height)
  const ctx = c.getContext('2d')
  roundRectPath(ctx, 0, 0, src.width, src.height, radius)
  ctx.clip()
  ctx.drawImage(src, 0, 0)
  return c
}

// ---------- Merge ----------
export function mergeCanvases (canvases, { direction = 'horizontal', gap = 10, background = 'transparent', align = 'center' }) {
  const n = canvases.length
  if (!n) throw new Error('no-images')
  const horizontal = direction === 'horizontal'
  const fixed = horizontal ? 'height' : 'width'
  const run = horizontal ? 'width' : 'height'
  // Normalize to the smallest common fixed size
  const fixedSize = Math.min(...canvases.map(c => c[fixed]))
  const total = canvases.reduce((s, c) => s + c[run], 0) + gap * (n - 1)
  const W = horizontal ? total : fixedSize
  const H = horizontal ? fixedSize : total
  const out = newCanvas(W, H, background === 'transparent' ? null : background)
  const ctx = out.getContext('2d')
  let cursor = 0
  for (const c of canvases) {
    const scale = fixedSize / c[fixed]
    const dw = horizontal ? c.width * scale : fixedSize
    const dh = horizontal ? fixedSize : c.height * scale
    const runPos = horizontal ? cursor : (fixedSize - dw) / 2
    const fixedPos = horizontal ? (fixedSize - dh) / 2 : cursor
    if (align === 'start') {
      if (horizontal) ctx.drawImage(c, cursor, 0, c.width * scale, dh)
      else ctx.drawImage(c, 0, cursor, dw, c.height * scale)
    } else {
      ctx.drawImage(c, horizontal ? runPos : fixedPos, horizontal ? fixedPos : runPos, dw, dh)
    }
    cursor += c[run] * scale + gap
  }
  return out
}

// ---------- ICC/DPI ----------
// Sets pHYs chunk on PNG (DPI) or APP0 density in JPEG via JFIF header rewrite.
export function setPngDpi (buffer, dpi) {
  const bytes = new Uint8Array(buffer)
  const ppm = Math.round(dpi / 0.0254)
  // Find IHDR end to insert pHYs after it
  const view = new DataView(buffer)
  let off = 8
  while (off < bytes.length - 8) {
    const len = view.getUint32(off)
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7])
    if (type === 'IHDR') {
      const chunk = buildPngChunk('pHYs', new Uint8Array([
        (ppm >>> 24) & 255, (ppm >>> 16) & 255, (ppm >>> 8) & 255, ppm & 255,
        (ppm >>> 24) & 255, (ppm >>> 16) & 255, (ppm >>> 8) & 255, ppm & 255,
        1
      ]))
      const out = new Uint8Array(bytes.length + chunk.length)
      out.set(bytes.subarray(0, off + 8 + len + 4), 0)
      out.set(chunk, off + 8 + len + 4)
      out.set(bytes.subarray(off + 8 + len + 4), off + 8 + len + 4 + chunk.length)
      return out.buffer
    }
    off += 8 + len + 4
  }
  return buffer
}

function buildPngChunk (type, data) {
  const len = data.length
  const out = new Uint8Array(12 + len)
  const view = new DataView(out.buffer)
  view.setUint32(0, len)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  let crc = 0xFFFFFFFF
  const crcTable = (function () {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })()
  for (let i = 4; i < 8 + len; i++) crc = crcTable[(crc ^ out[i]) & 255] ^ (crc >>> 8)
  crc = (crc ^ 0xFFFFFFFF) >>> 0
  view.setUint32(8 + len, crc)
  return out
}

export function setJpegDpi (buffer, dpi) {
  // Rewrite JFIF density fields (bytes 12..17 after APP0 marker at offset 2).
  const bytes = new Uint8Array(buffer)
  if (bytes[2] === 0xFF && bytes[3] === 0xE0) {
    const view = new DataView(buffer)
    view.setUint16(12, dpi) // X density
    view.setUint16(14, dpi) // Y density
  }
  return buffer
}
