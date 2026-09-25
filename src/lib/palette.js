// Color utilities: median-cut quantization for palette extraction,
// dominant color, and color space conversions.

// Extract up to maxColors dominant colors from ImageData via median cut.
export function extractPalette (imageData, maxColors = 8) {
  const d = imageData.data
  const pixels = []
  // Sample up to 20k pixels for speed
  const total = d.length / 4
  const stride = Math.max(1, Math.floor(total / 20000))
  for (let i = 0; i < total; i += stride) {
    const o = i * 4
    if (d[o + 3] < 40) continue // skip transparent
    pixels.push([d[o], d[o + 1], d[o + 2]])
  }
  if (!pixels.length) return []

  let boxes = [pixels]
  while (boxes.length < maxColors) {
    // pick box with largest channel range
    let best = -1; let bestRange = -1; let bestChannel = 0
    boxes.forEach((box, idx) => {
      if (box.length < 2) return
      for (let c = 0; c < 3; c++) {
        let min = 255; let max = 0
        for (const p of box) { if (p[c] < min) min = p[c]; if (p[c] > max) max = p[c] }
        const range = max - min
        if (range > bestRange) { bestRange = range; best = idx; bestChannel = c }
      }
    })
    if (best < 0 || bestRange <= 0) break
    const box = boxes[best]
    box.sort((a, b) => a[bestChannel] - b[bestChannel])
    const mid = Math.floor(box.length / 2)
    boxes = [...boxes.slice(0, best), box.slice(0, mid), box.slice(mid), ...boxes.slice(best + 1)]
  }

  return boxes
    .filter(b => b.length)
    .map(box => {
      let r = 0; let g = 0; let b = 0
      for (const p of box) { r += p[0]; g += p[1]; b += p[2] }
      const n = box.length
      return {
        hex: rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n)),
        count: n,
        share: n / pixels.length
      }
    })
    .sort((a, b) => b.count - a.count)
}

export function rgbToHex (r, g, b) {
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function hexToRgb (hex) {
  const s = hex.replace('#', '')
  const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function rgbToHsl (r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b); const min = Math.min(r, g, b)
  let h = 0; let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const dd = max - min
    s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min)
    switch (max) {
      case r: h = (g - b) / dd + (g < b ? 6 : 0); break
      case g: h = (b - r) / dd + 2; break
      default: h = (r - g) / dd + 4
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex (h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const to = v => Math.round(255 * v).toString(16).padStart(2, '0')
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`
}

// Rank colors by "interestingness" (saturation × population) for a vibrant set.
export function vibrantVariants (palette) {
  return [...palette]
    .map(c => {
      const { r, g, b } = hexToRgb(c.hex)
      const { h, s, l } = rgbToHsl(r, g, b)
      return { ...c, h, s, l, score: s * Math.min(l, 100 - l) * c.share }
    })
    .sort((a, b) => b.score - a.score)
    .map(({ hex: hexv }) => hexv)
}

// 64-bit perceptual hash (dHash variant via DCT-lite row/column signing).
export function perceptualHash (imageData) {
  // Downscale to 9x8 grayscale = 72 values → 64 comparisons
  const c = document.createElement('canvas')
  c.width = 9; c.height = 8
  const ctx = c.getContext('2d')
  // Draw source scaled down using an intermediate canvas
  const src = document.createElement('canvas')
  src.width = imageData.width; src.height = imageData.height
  src.getContext('2d').putImageData(imageData, 0, 0)
  ctx.drawImage(src, 0, 0, 9, 8)
  const small = ctx.getImageData(0, 0, 9, 8).data
  const gray = []
  for (let i = 0; i < 72; i++) gray.push(0.299 * small[i * 4] + 0.587 * small[i * 4 + 1] + 0.114 * small[i * 4 + 2])
  let bits = 0n
  let bit = 0n
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (gray[y * 9 + x] > gray[y * 9 + x + 1]) bits |= (1n << bit)
      bit++
    }
  }
  return bits.toString(16).padStart(16, '0')
}

export function paletteToCssVars (palette) {
  return palette.map((c, i) => `--color-${i + 1}: ${c.hex};`).join('\n')
}
