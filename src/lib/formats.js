// Format detection, SVG handling and decode-capability probing.

import { imageToCanvas, mimeFor } from './engine.js'

export function sniffFormat (buffer) {
  const b = new Uint8Array(buffer)
  if (b[0] === 0xFF && b[1] === 0xD8) return 'jpg'
  if (b[0] === 0x89 && b[1] === 0x50) return 'png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return 'webp'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif'
  if (b[0] === 0x42 && b[1] === 0x4D) return 'bmp'
  if (b[0] === 0x49 && b[1] === 0x49 || b[0] === 0x4D && b[1] === 0x4D) return 'tiff'
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    // ftyp box — heic/heif/avif family
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11])
    if (brand.startsWith('avif')) return 'avif'
    if (brand.startsWith('heic') || brand.startsWith('heix') || brand.startsWith('mif1') || brand.startsWith('msf1')) return 'heic'
  }
  return 'unknown'
}

export function isSvgFile (file) {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)
}

// Escape &, <, > when displaying SVG source.
export function escapeHTML (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Very small SVG sanitizer for preview use: strips script/foreignObject/event
// handlers and external references, then renders via an <img> with a data URI
// (which does not execute scripts anyway).
export function sanitizeSvg (svgText) {
  let s = String(svgText)
  s = s.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
  s = s.replace(/<script[^>]*\/>/gi, '')
  s = s.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, '')
  s = s.replace(/on\w+\s*=\s*"[^"]*"/gi, '')
  s = s.replace(/on\w+\s*=\s*'[^']*'/gi, '')
  s = s.replace(/javascript:/gi, '')
  s = s.replace(/href\s*=\s*"(?!#)[^"]*"/gi, '')
  s = s.replace(/href\s*=\s*'(?!#)[^']*'/gi, '')
  return s
}

export function svgToBlob (svgText) {
  return new Blob([sanitizeSvg(svgText)], { type: 'image/svg+xml' })
}

// Rasterize an SVG file/blob to a canvas at a given scale.
export async function rasterizeSvg (source, scale = 1, maxDim = 4096) {
  const blob = source instanceof Blob ? source : svgToBlob(source)
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Invalid SVG — the markup could not be parsed.'))
      i.src = url
    })
    const w = img.naturalWidth || img.width || 300
    const h = img.naturalHeight || img.height || 300
    let W = Math.round(w * scale)
    let H = Math.round(h * scale)
    const biggest = Math.max(W, H)
    if (biggest > maxDim) { W = Math.round(W * maxDim / biggest); H = Math.round(H * maxDim / biggest) }
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, W); canvas.height = Math.max(1, H)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Decode-capability probes using tiny real payloads.
export async function canDecodeWebP () {
  const c = document.createElement('canvas'); c.width = c.height = 2
  return c.toDataURL('image/webp').startsWith('data:image/webp')
}

// HEIC/TIFF can't be probed with synthetic data reliably; we probe with the
// user's actual file at load time instead.
export async function tryDecodeImageBlob (blob) {
  try {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    const ok = await new Promise(resolve => {
      img.onload = () => resolve(img.naturalWidth > 0)
      img.onerror = () => resolve(false)
      img.src = url
    })
    URL.revokeObjectURL(url)
    return ok ? img : null
  } catch {
    return null
  }
}

export const FORMAT_INFO = {
  jpg: { name: 'JPEG', ext: 'jpg', lossy: true, alpha: false },
  png: { name: 'PNG', ext: 'png', lossy: false, alpha: true },
  webp: { name: 'WebP', ext: 'webp', lossy: true, alpha: true },
  avif: { name: 'AVIF', ext: 'avif', lossy: true, alpha: true },
  gif: { name: 'GIF', ext: 'gif', lossy: false, alpha: true },
  bmp: { name: 'BMP', ext: 'bmp', lossy: false, alpha: false },
  svg: { name: 'SVG', ext: 'svg', lossy: false, alpha: true },
  heic: { name: 'HEIC', ext: 'heic', lossy: true, alpha: true },
  tiff: { name: 'TIFF', ext: 'tiff', lossy: false, alpha: true }
}
