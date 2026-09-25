// Color quantization via median cut, applied to ImageData in place.
import { extractPalette } from './palette.js'

export function quantize (imageData, maxColors = 256) {
  const palette = extractPalette(imageData, Math.min(maxColors, 256))
  if (!palette.length) return imageData

  // Build lookup: map each pixel to nearest palette color.
  const colors = palette.map(p => [
    parseInt(p.hex.slice(1, 3), 16),
    parseInt(p.hex.slice(3, 5), 16),
    parseInt(p.hex.slice(5, 7), 16)
  ])

  // Cache for exact matches speeds up flat areas.
  const cache = new Map()
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]
    let c = cache.get(key)
    if (c === undefined) {
      let best = 0; let bestD = Infinity
      for (let j = 0; j < colors.length; j++) {
        const dr = d[i] - colors[j][0]; const dg = d[i + 1] - colors[j][1]; const db = d[i + 2] - colors[j][2]
        const dist = dr * dr + dg * dg + db * db
        if (dist < bestD) { bestD = dist; best = j }
      }
      c = colors[best]
      cache.set(key, c)
    }
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]
  }
  return imageData
}
