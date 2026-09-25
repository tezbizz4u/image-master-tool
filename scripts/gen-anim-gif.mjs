// Generates a tiny 2-frame animated GIF using "uncompressed" LZW
// (clear code before every pixel code, so code size never grows).
import { mkdirSync, writeFileSync } from 'node:fs'

const W = 16, H = 16

function lzwData (indices, minCodeSize) {
  const clear = 1 << minCodeSize
  const eoi = clear + 1
  const codeSize = minCodeSize + 1
  const bits = []
  const push = (code) => {
    for (let i = 0; i < codeSize; i++) bits.push((code >> i) & 1)
  }
  push(clear)
  for (const px of indices) { push(px); push(clear) }
  push(eoi)
  // pack LSB-first into bytes
  const bytes = []
  let cur = 0, n = 0
  for (const b of bits) { cur |= b << n; if (++n === 8) { bytes.push(cur); cur = 0; n = 0 } }
  if (n) bytes.push(cur)
  // split into <=255-byte sub-blocks
  const out = [minCodeSize]
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255)
    out.push(chunk.length, ...chunk)
  }
  out.push(0)
  return out
}

const colors = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 255]]
const gct = colors.flat()

function frame (colorIdx) {
  const indices = new Array(W * H).fill(colorIdx)
  return [
    0x21, 0xF9, 0x04, 0x04, 0x14, 0x00, 0x00, 0x00, // GCE: delay 200ms
    0x2C, // image separator
    0, 0, // left
    0, 0, // top
    W & 255, W >> 8, // width
    H & 255, H >> 8, // height
    0x00, // packed: no LCT, no interlace
    ...lzwData(indices, 2)
  ]
}

const gif = [
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
  W & 255, W >> 8, H & 255, H >> 8,
  0x81, 0x00, 0x00, // GCT flag, 4 colors
  ...gct,
  0x21, 0xFF, 0x0B, ...Buffer.from('NETSCAPE2.0'), 0x03, 0x01, 0x00, 0x00, 0x00, // loop forever
  ...frame(0), // red
  ...frame(2), // blue
  0x3B // trailer
]

mkdirSync('public', { recursive: true })
writeFileSync('public/anim.gif', Buffer.from(gif))
console.log('wrote public/anim.gif', gif.length, 'bytes')
