// Image processing worker. Runs pixel-heavy effects off the main thread so the
// UI stays responsive. Protocol: postMessage({ id, op, payload }) →
// { id, ok, result | error }. ImageData buffers transfer zero-copy.
import {
  grayscale, sepia, invert, posterize, solarize, threshold, duotone,
  noise, boxBlur, pixelate, vignette, convolve, sharpen, embossKernel,
  edgeDetect, motionBlur, glitch, kuwahara, sketch, colorOverlay, LOOKS
} from '../lib/pixelops.js'
import { applyPixelAdjustments } from '../lib/engine.js'

self.onmessage = async (e) => {
  const { id, op, payload } = e.data
  try {
    const result = await run(op, payload)
    if (result instanceof ImageData) {
      self.postMessage({ id, ok: true, result }, [result.data.buffer])
    } else if (result && result.imageData instanceof ImageData) {
      const rest = { ...result, imageData: undefined }
      self.postMessage({ id, ok: true, result: { ...rest, imageData: result.imageData } }, [result.imageData.data.buffer])
    } else {
      self.postMessage({ id, ok: true, result })
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) })
  }
}

async function run (op, p) {
  switch (op) {
    case 'adjust': {
      applyPixelAdjustments(p.imageData, p.adjustments)
      return p.imageData
    }
    case 'grayscale': return grayscale(p.imageData)
    case 'sepia': return sepia(p.imageData, p.strength)
    case 'invert': return invert(p.imageData)
    case 'posterize': return posterize(p.imageData, p.levels)
    case 'solarize': return solarize(p.imageData, p.threshold)
    case 'threshold': return threshold(p.imageData, p.level)
    case 'duotone': return duotone(p.imageData, p.dark, p.light)
    case 'noise': return noise(p.imageData, p.amount, p.monochrome)
    case 'blur': return boxBlur(p.imageData, p.radius, p.passes)
    case 'pixelate': return pixelate(p.imageData, p.blockSize)
    case 'vignette': return vignette(p.imageData, p.size, p.softness, p.darken)
    case 'sharpen': return sharpen(p.imageData, p.amount)
    case 'emboss': return embossKernel(p.imageData, p.depth, p.azimuth)
    case 'edge': return edgeDetect(p.imageData, p.strength)
    case 'motionBlur': return motionBlur(p.imageData, p.distance, p.angle)
    case 'glitch': return glitch(p.imageData, p)
    case 'kuwahara': return kuwahara(p.imageData, p.radius)
    case 'sketch': return sketch(p.imageData, p.blurRadius)
    case 'overlay': return colorOverlay(p.imageData, p.color, p.opacity)
    case 'look': return LOOKS[p.look](p.imageData, p.strength)
    case 'cartoon': return cartoon(p.imageData, p.levels, p.edge)
    case 'median': return medianFilter(p.imageData, p.radius)
    default:
      throw new Error(`Unknown worker op: ${op}`)
  }
}

// Cartoon effect: posterize + sobel edge darkening.
function cartoon (img, levels = 8, edgeStrength = 60) {
  posterize(img, levels)
  const { width: w, height: h, data } = img
  const src = new Uint8ClampedArray(data)
  const k = edgeStrength / 100
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const lum = (xx, yy) => {
        const sy = Math.min(h - 1, Math.max(0, yy))
        const sx = Math.min(w - 1, Math.max(0, xx))
        const si = (sy * w + sx) * 4
        return 0.299 * src[si] + 0.587 * src[si + 1] + 0.114 * src[si + 2]
      }
      const gx = -lum(x - 1, y - 1) - 2 * lum(x - 1, y) - lum(x - 1, y + 1) + lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1)
      const gy = -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1) + lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1)
      const mag = Math.sqrt(gx * gx + gy * gy)
      if (mag > 40) {
        const f = Math.max(0, 1 - (mag - 40) * k / 60)
        const di = (y * w + x) * 4
        data[di] *= f; data[di + 1] *= f; data[di + 2] *= f
      }
    }
  }
  return img
}

// Median filter (for denoise tool).
export function medianFilter (img, radius = 2) {
  const { width: w, height: h, data } = img
  const src = new Uint8ClampedArray(data)
  const side = radius * 2 + 1
  const win = new Float32Array(side * side)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let n = 0
        for (let dy = -radius; dy <= radius; dy++) {
          const sy = Math.min(h - 1, Math.max(0, y + dy))
          for (let dx = -radius; dx <= radius; dx++) {
            const sx = Math.min(w - 1, Math.max(0, x + dx))
            win[n++] = src[(sy * w + sx) * 4 + c]
          }
        }
        // insertion sort small window
        for (let i = 1; i < n; i++) {
          const v = win[i]
          let j = i - 1
          while (j >= 0 && win[j] > v) { win[j + 1] = win[j]; j-- }
          win[j + 1] = v
        }
        data[(y * w + x) * 4 + c] = win[n >> 1]
      }
    }
  }
  return img
}
