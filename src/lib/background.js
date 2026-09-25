// Local background-removal engine. Honest, non-AI approach:
//  1. User clicks a background color (or we sample the border pixels)
//  2. Flood-fill from the borders collecting pixels within tolerance
//  3. Optional edge feathering softens the cutout
// Works well on uniform/solid backgrounds; we say so in the UI.

export function sampleBorderColor (imageData) {
  const { width: w, height: h, data } = imageData
  let r = 0; let g = 0; let b = 0; let n = 0
  const sample = (x, y) => {
    const i = (y * w + x) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
  }
  const step = Math.max(1, Math.floor(Math.min(w, h) / 50))
  for (let x = 0; x < w; x += step) { sample(x, 0); sample(x, h - 1) }
  for (let y = 0; y < h; y += step) { sample(0, y); sample(w - 1, y) }
  if (!n) return null
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) }
}

export function colorDistance (r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2; const dg = g1 - g2; const db = b1 - b2
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

// Flood fill from all border pixels, clearing pixels within tolerance of the
// key color. Uses a scanline-ish stack fill for speed. Returns modified ImageData.
export function floodRemove (imageData, key, tolerance = 40, feather = 1) {
  const { width: w, height: h, data } = imageData
  const visited = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    const idx = y * w + x
    if (!visited[idx]) { visited[idx] = 1; stack.push(idx) }
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }

  const tol2 = tolerance * tolerance * 3
  while (stack.length) {
    const idx = stack.pop()
    const i = idx * 4
    const d2 = (data[i] - key.r) ** 2 + (data[i + 1] - key.g) ** 2 + (data[i + 2] - key.b) ** 2
    if (d2 > tol2) continue
    data[i + 3] = 0
    const x = idx % w
    const y = (idx - x) / w
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }

  if (feather > 0) featherAlpha(imageData, feather)
  return imageData
}

// Point-based key: clears ALL pixels matching the key color within tolerance
// (not just border-connected) — for backgrounds that appear in multiple spots.
export function globalKeyRemove (imageData, key, tolerance = 40, feather = 1) {
  const { data, width: w, height: h } = imageData
  const tol2 = tolerance * tolerance * 3
  for (let i = 0; i < data.length; i += 4) {
    const d2 = (data[i] - key.r) ** 2 + (data[i + 1] - key.g) ** 2 + (data[i + 2] - key.b) ** 2
    if (d2 <= tol2) data[i + 3] = 0
  }
  if (feather > 0) featherAlpha(imageData, feather)
  return imageData
}

// Alpha feather: pixels adjacent to transparency get partial alpha. One pass.
export function featherAlpha (imageData, radius = 1) {
  const { width: w, height: h, data } = imageData
  const src = new Uint8ClampedArray(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (src[i + 3] === 0) continue
      let transparentNeighbors = 0
      let total = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = Math.min(h - 1, Math.max(0, y + dy))
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.min(w - 1, Math.max(0, x + dx))
          const si = (sy * w + sx) * 4
          total++
          if (src[si + 3] === 0) transparentNeighbors++
        }
      }
      if (transparentNeighbors > 0) {
        data[i + 3] = Math.round(255 * (1 - transparentNeighbors / total) * 0.85 + 255 * 0.15)
      }
    }
  }
  return imageData
}

// Compose a foreground (with alpha) over a generated background canvas.
export function compositeOver (fgCanvas, bgDraw) {
  const out = document.createElement('canvas')
  out.width = fgCanvas.width
  out.height = fgCanvas.height
  const ctx = out.getContext('2d')
  bgDraw(ctx, out.width, out.height)
  ctx.drawImage(fgCanvas, 0, 0)
  return out
}

export function solidBackground (color) {
  return (ctx, w, h) => { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h) }
}

export function gradientBackground (colorA, colorB, angleDeg = 135) {
  return (ctx, w, h) => {
    const rad = angleDeg * Math.PI / 180
    const x = Math.cos(rad); const y = Math.sin(rad)
    const len = Math.abs(w * x) + Math.abs(h * y)
    const g = ctx.createLinearGradient(
      w / 2 - (x * len) / 2, h / 2 - (y * len) / 2,
      w / 2 + (x * len) / 2, h / 2 + (y * len) / 2
    )
    g.addColorStop(0, colorA)
    g.addColorStop(1, colorB)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}
