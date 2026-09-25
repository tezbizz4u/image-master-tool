// Pure per-pixel effect algorithms. Shared between the Web Worker (for full
// images) and the main thread (for small previews). All functions take and
// return ImageData.

export function grayscale (img) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    d[i] = d[i + 1] = d[i + 2] = l
  }
  return img
}

export function sepia (img, strength = 1) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]; const g = d[i + 1]; const b = d[i + 2]
    const sr = 0.393 * r + 0.769 * g + 0.189 * b
    const sg = 0.349 * r + 0.686 * g + 0.168 * b
    const sb = 0.272 * r + 0.434 * g + 0.133 * b
    d[i] = r + (sr - r) * strength
    d[i + 1] = g + (sg - g) * strength
    d[i + 2] = b + (sb - b) * strength
  }
  return img
}

export function invert (img) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]
  }
  return img
}

export function posterize (img, levels = 5) {
  const d = img.data
  const step = 255 / Math.max(2, levels - 1)
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step
    d[i + 1] = Math.round(d[i + 1] / step) * step
    d[i + 2] = Math.round(d[i + 2] / step) * step
  }
  return img
}

export function solarize (img, threshold = 128) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > threshold) d[i] = 255 - d[i]
    if (d[i + 1] > threshold) d[i + 1] = 255 - d[i + 1]
    if (d[i + 2] > threshold) d[i + 2] = 255 - d[i + 2]
  }
  return img
}

export function threshold (img, level = 128) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    const v = l >= level ? 255 : 0
    d[i] = d[i + 1] = d[i + 2] = v
  }
  return img
}

export function duotone (img, dark = '#1e1b4b', light = '#e0e7ff') {
  const d = img.data
  const hex = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16))
  const [dr, dg, db] = hex(dark)
  const [lr, lg, lb] = hex(light)
  for (let i = 0; i < d.length; i += 4) {
    const t = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
    d[i] = dr + (lr - dr) * t
    d[i + 1] = dg + (lg - dg) * t
    d[i + 2] = db + (lb - db) * t
  }
  return img
}

export function noise (img, amount = 25, monochrome = true) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (monochrome) {
      const n = (Math.random() - 0.5) * amount * 2
      d[i] += n; d[i + 1] += n; d[i + 2] += n
    } else {
      d[i] += (Math.random() - 0.5) * amount * 2
      d[i + 1] += (Math.random() - 0.5) * amount * 2
      d[i + 2] += (Math.random() - 0.5) * amount * 2
    }
  }
  return img
}

// Separable box blur (two passes, sliding window). Repeated twice this
// approximates a Gaussian and runs in O(w*h) regardless of radius.
export function boxBlur (img, radius = 3, passes = 2) {
  const { width: w, height: h } = img
  if (radius < 1 || w < 2 || h < 2) return img
  let src = new Uint8ClampedArray(img.data)
  const tmp = new Uint8ClampedArray(src.length)

  for (let p = 0; p < passes; p++) {
    // horizontal pass: src -> tmp
    const div = radius * 2 + 1
    for (let y = 0; y < h; y++) {
      const row = y * w * 4
      let r = 0; let g = 0; let b = 0; let a = 0
      for (let x = -radius; x <= radius; x++) {
        const xi = Math.min(w - 1, Math.max(0, x)) * 4 + row
        r += src[xi]; g += src[xi + 1]; b += src[xi + 2]; a += src[xi + 3]
      }
      for (let x = 0; x < w; x++) {
        const o = row + x * 4
        tmp[o] = r / div; tmp[o + 1] = g / div; tmp[o + 2] = b / div; tmp[o + 3] = a / div
        const addX = Math.min(w - 1, x + radius + 1) * 4 + row
        const subX = Math.max(0, x - radius) * 4 + row
        r += src[addX] - src[subX]
        g += src[addX + 1] - src[subX + 1]
        b += src[addX + 2] - src[subX + 2]
        a += src[addX + 3] - src[subX + 3]
      }
    }
    // vertical pass: tmp -> src
    for (let x = 0; x < w; x++) {
      const col = x * 4
      let r = 0; let g = 0; let b = 0; let a = 0
      for (let y = -radius; y <= radius; y++) {
        const yi = Math.min(h - 1, Math.max(0, y)) * w * 4 + col
        r += tmp[yi]; g += tmp[yi + 1]; b += tmp[yi + 2]; a += tmp[yi + 3]
      }
      for (let y = 0; y < h; y++) {
        const o = y * w * 4 + col
        src[o] = r / div; src[o + 1] = g / div; src[o + 2] = b / div; src[o + 3] = a / div
        const addY = Math.min(h - 1, y + radius + 1) * w * 4 + col
        const subY = Math.max(0, y - radius) * w * 4 + col
        r += tmp[addY] - tmp[subY]
        g += tmp[addY + 1] - tmp[subY + 1]
        b += tmp[addY + 2] - tmp[subY + 2]
        a += tmp[addY + 3] - tmp[subY + 3]
      }
    }
  }

  img.data.set(src)
  return img
}

export function pixelate (img, blockSize = 10) {
  const { width: w, height: h, data } = img
  const bs = Math.max(2, Math.round(blockSize))
  for (let by = 0; by < h; by += bs) {
    for (let bx = 0; bx < w; bx += bs) {
      let r = 0; let g = 0; let b = 0; let a = 0; let n = 0
      const maxY = Math.min(h, by + bs)
      const maxX = Math.min(w, bx + bs)
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const i = (y * w + x) * 4
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3]; n++
        }
      }
      r /= n; g /= n; b /= n; a /= n
      for (let y = by; y < maxY; y++) {
        for (let x = bx; x < maxX; x++) {
          const i = (y * w + x) * 4
          data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
        }
      }
    }
  }
  return img
}

export function vignette (img, size = 50, softness = 50, darken = true) {
  const { width: w, height: h, data } = img
  const cx = w / 2; const cy = h / 2
  const maxD = Math.sqrt(cx * cx + cy * cy)
  const inner = (size / 100) * maxD
  const feather = Math.max(1, (softness / 100) * maxD * 0.5)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx; const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      let t = (dist - inner) / feather
      t = Math.max(0, Math.min(1, t))
      if (!darken) t = 0
      const i = (y * w + x) * 4
      const f = darken ? 1 - t * 0.9 : 1
      data[i] *= f; data[i + 1] *= f; data[i + 2] *= f
      if (!darken && t > 0) {
        const add = t * 90
        data[i] += (255 - data[i]) * (add / 255) * 2
        data[i + 1] += (255 - data[i + 1]) * (add / 255) * 2
        data[i + 2] += (255 - data[i + 2]) * (add / 255) * 2
      }
    }
  }
  return img
}

// Convolution with a kernel; edge handling clamps.
export function convolve (img, kernel, divisor = null, offset = 0) {
  const { width: w, height: h, data } = img
  const side = Math.round(Math.sqrt(kernel.length))
  const half = Math.floor(side / 2)
  const div = divisor ?? (kernel.reduce((s, v) => s + v, 0) || 1)
  const src = new Uint8ClampedArray(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0; let g = 0; let b = 0
      for (let ky = 0; ky < side; ky++) {
        for (let kx = 0; kx < side; kx++) {
          const sy = Math.min(h - 1, Math.max(0, y + ky - half))
          const sx = Math.min(w - 1, Math.max(0, x + kx - half))
          const si = (sy * w + sx) * 4
          const kv = kernel[ky * side + kx]
          r += src[si] * kv; g += src[si + 1] * kv; b += src[si + 2] * kv
        }
      }
      const di = (y * w + x) * 4
      data[di] = r / div + offset
      data[di + 1] = g / div + offset
      data[di + 2] = b / div + offset
    }
  }
  return img
}

export function sharpen (img, amount = 50) {
  const a = amount / 100
  const k = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0]
  return convolve(img, k, 1)
}

export function embossKernel (img, depth = 1, azimuth = 135) {
  const rad = azimuth * Math.PI / 180
  const dx = Math.cos(rad); const dy = -Math.sin(rad)
  const k = [
    -depth * dx - depth * dy, -depth * dy, depth * dx - depth * dy,
    -depth * dx, 1, depth * dx,
    -depth * dx + depth * dy, depth * dy, depth * dx + depth * dy
  ]
  return convolve(img, k, 1, 0)
}

export function edgeDetect (img, strength = 1) {
  const { width: w, height: h, data } = img
  const src = new Uint8ClampedArray(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // luminance grid
      const lum = (xx, yy) => {
        const sy = Math.min(h - 1, Math.max(0, yy))
        const sx = Math.min(w - 1, Math.max(0, xx))
        const si = (sy * w + sx) * 4
        return 0.299 * src[si] + 0.587 * src[si + 1] + 0.114 * src[si + 2]
      }
      const gx =
        -lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1) +
        lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1)
      const gy =
        -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1) +
        lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1)
      const mag = Math.sqrt(gx * gx + gy * gy) * strength
      const di = (y * w + x) * 4
      data[di] = data[di + 1] = data[di + 2] = Math.min(255, mag)
      data[di + 3] = 255
    }
  }
  return img
}

// Tilt-shift style motion blur along an angle using line averaging.
export function motionBlur (img, distance = 10, angle = 0) {
  const { width: w, height: h, data } = img
  const rad = angle * Math.PI / 180
  const dx = Math.cos(rad); const dy = Math.sin(rad)
  const src = new Uint8ClampedArray(data)
  const n = Math.max(1, Math.round(distance))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0; let g = 0; let b = 0; let a = 0
      for (let i = -n; i <= n; i++) {
        const sx = Math.min(w - 1, Math.max(0, Math.round(x + dx * i)))
        const sy = Math.min(h - 1, Math.max(0, Math.round(y + dy * i)))
        const si = (sy * w + sx) * 4
        r += src[si]; g += src[si + 1]; b += src[si + 2]; a += src[si + 3]
      }
      const cnt = n * 2 + 1
      const di = (y * w + x) * 4
      data[di] = r / cnt; data[di + 1] = g / cnt; data[di + 2] = b / cnt; data[di + 3] = a / cnt
    }
  }
  return img
}

// RGB channel shift + slice displacement glitch.
export function glitch (img, { shift = 12, slices = 6, intensity = 30, scanlines = 20 } = {}) {
  const { width: w, height: h, data } = img
  const src = new Uint8ClampedArray(data)
  // RGB channel offset
  const off = Math.round(shift)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4
      const rX = Math.min(w - 1, x + off)
      const bX = Math.max(0, x - off)
      data[di] = src[(y * w + rX) * 4]
      data[di + 2] = src[(y * w + bX) * 4 + 2]
    }
  }
  // slice displacement
  const rng = mulberry32(1337)
  for (let s = 0; s < slices; s++) {
    const sy = Math.floor(rng() * h)
    const sh = Math.floor(rng() * h * 0.08) + 4
    const dx = Math.floor((rng() - 0.5) * w * 0.12 * (intensity / 50))
    for (let y = sy; y < Math.min(h, sy + sh); y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.min(w - 1, Math.max(0, x - dx))
        const di = (y * w + x) * 4
        const si = (y * w + sx) * 4
        data[di] = src[si]; data[di + 1] = src[si + 1]; data[di + 2] = src[si + 2]
      }
    }
  }
  // scanlines
  if (scanlines > 0) {
    for (let y = 0; y < h; y += Math.max(2, Math.round(200 / scanlines))) {
      for (let x = 0; x < w; x++) {
        const di = (y * w + x) * 4
        data[di] *= 0.82; data[di + 1] *= 0.82; data[di + 2] *= 0.82
      }
    }
  }
  return img
}

function mulberry32 (seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Kuwahara oil-painting filter (4-region variance pick).
export function kuwahara (img, radius = 4) {
  const { width: w, height: h, data } = img
  const src = new Uint8ClampedArray(data)
  const r = Math.max(1, Math.round(radius))
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let bestVar = Infinity; let br = 0; let bg = 0; let bb = 0
      const quadrants = [
        [-r, 0, -r, 0], [0, r, -r, 0], [-r, 0, 0, r], [0, r, 0, r]
      ]
      for (const [x0, x1, y0, y1] of quadrants) {
        let sr = 0; let sg = 0; let sb = 0; let sl = 0; let sl2 = 0; let n = 0
        for (let qy = Math.max(0, y + y0); qy <= Math.min(h - 1, y + y1); qy++) {
          for (let qx = Math.max(0, x + x0); qx <= Math.min(w - 1, x + x1); qx++) {
            const si = (qy * w + qx) * 4
            const R = src[si]; const G = src[si + 1]; const B = src[si + 2]
            const L = 0.299 * R + 0.587 * G + 0.114 * B
            sr += R; sg += G; sb += B; sl += L; sl2 += L * L; n++
          }
        }
        if (!n) continue
        const mean = sl / n
        const variance = sl2 / n - mean * mean
        if (variance < bestVar) {
          bestVar = variance
          br = sr / n; bg = sg / n; bb = sb / n
        }
      }
      const di = (y * w + x) * 4
      data[di] = br; data[di + 1] = bg; data[di + 2] = bb
    }
  }
  return img
}

// Dodge-blend pencil sketch: grayscale blur inverted, dodge with original.
export function sketch (img, blurRadius = 8) {
  const copy = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height)
  grayscale(copy)
  boxBlur(copy, blurRadius, 2)
  const d = img.data
  const s = copy.data
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    let v
    if (s[i] === 255) v = 255
    else v = Math.min(255, (lum * 255) / (255 - s[i]))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  return img
}

export function colorOverlay (img, color = '#4338ca', opacity = 40) {
  const d = img.data
  const hex = (s) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16))
  const [r, g, b] = hex(color)
  const a = opacity / 100
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] * (1 - a) + r * a
    d[i + 1] = d[i + 1] * (1 - a) + g * a
    d[i + 2] = d[i + 2] * (1 - a) + b * a
  }
  return img
}

// Named "cinematic" looks composed from primitives (LUT-style).
export const LOOKS = {
  vintage (img, strength = 80) {
    const s = strength / 100
    sepia(img, 0.4 * s)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] * (1 - s * 0.1) + 255 * (s * 0.1)
      d[i + 1] = d[i + 1] * (1 - s * 0.05) + 250 * (s * 0.05)
      const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      d[i] += (lum - d[i]) * 0.12 * s
      d[i + 1] += (lum - d[i + 1]) * 0.12 * s
      d[i + 2] += (lum - d[i + 2]) * 0.12 * s
    }
    vignette(img, 35, 60, true)
    return img
  },
  cinematic (img, strength = 80) {
    const s = strength / 100
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      // teal shadows, orange highlights
      const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
      const shadowW = 1 - lum
      d[i] += 12 * s * shadowW * -1 + 14 * s * lum
      d[i + 1] += 2 * s * shadowW
      d[i + 2] += 26 * s * shadowW - 8 * s * lum
      // lifted blacks
      d[i] = d[i] * (1 - s * 0.06) + 22 * s * 0.06 * 2.2
      d[i + 1] = d[i + 1] * (1 - s * 0.06) + 24 * s * 0.06 * 2.2
      d[i + 2] = d[i + 2] * (1 - s * 0.06) + 30 * s * 0.06 * 2.2
    }
    return img
  },
  dramatic (img, strength = 80) {
    const s = strength / 100
    applyContrastSafe(img, 1 + 0.35 * s)
    vignette(img, 30, 55, true)
    return img
  },
  warm (img, strength = 60) {
    const s = strength / 100
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      d[i] += 18 * s; d[i + 1] += 6 * s; d[i + 2] -= 12 * s
    }
    return img
  },
  cool (img, strength = 60) {
    const s = strength / 100
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      d[i] -= 12 * s; d[i + 1] += 2 * s; d[i + 2] += 18 * s
    }
    return img
  },
  fade (img, strength = 60) {
    const s = strength / 100
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] * (1 - s * 0.25) + 128 * s * 0.25
      d[i + 1] = d[i + 1] * (1 - s * 0.25) + 128 * s * 0.25
      d[i + 2] = d[i + 2] * (1 - s * 0.25) + 128 * s * 0.25
    }
    return img
  },
  noir (img, strength = 90) {
    grayscale(img)
    applyContrastSafe(img, 1 + 0.45 * (strength / 100))
    vignette(img, 40, 55, true)
    return img
  },
  retro (img, strength = 70) {
    const s = strength / 100
    sepia(img, 0.25 * s)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      d[i + 1] = d[i + 1] * 0.96 + 6 * s
      d[i] = d[i] * 0.97 + 10 * s
    }
    return img
  }
}

function applyContrastSafe (img, factor) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = (d[i] - 128) * factor + 128
    d[i + 1] = (d[i + 1] - 128) * factor + 128
    d[i + 2] = (d[i + 2] - 128) * factor + 128
  }
}
