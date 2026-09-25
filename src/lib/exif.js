// Minimal EXIF (TIFF-structure) parser for JPEG/TIFF/WebP, plus PNG chunk
// listing. Runs entirely in the browser; nothing is uploaded.

const TAGS = {
  0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation', 0x011A: 'XResolution',
  0x011B: 'YResolution', 0x0128: 'ResolutionUnit', 0x0131: 'Software',
  0x0132: 'DateTime', 0x013B: 'Artist', 0x8298: 'Copyright', 0x8769: 'ExifIFD',
  0x8825: 'GPSIFD', 0x010E: 'ImageDescription', 0x9286: 'UserComment',
  0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8827: 'ISO', 0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized', 0x920A: 'FocalLength', 0xA002: 'PixelXDimension',
  0xA003: 'PixelYDimension', 0xA405: 'FocalLengthIn35mm', 0xA432: 'LensSpecification',
  0xA433: 'LensMake', 0xA434: 'LensModel', 0x9209: 'Flash', 0x9207: 'MeteringMode',
  0x8822: 'ExposureProgram', 0xA402: 'ExposureMode', 0xA403: 'WhiteBalance',
  0x9204: 'ExposureBias', 0xA001: 'ColorSpace', 0x9282: 'UserRating'
}

const GPS_TAGS = {
  0x0001: 'GPSLatitudeRef', 0x0002: 'GPSLatitude', 0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude', 0x0005: 'GPSAltitudeRef', 0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp'
}

const TYPE_SIZES = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

export function isJPEG (buf) {
  const b = new Uint8Array(buf)
  return b[0] === 0xFF && b[1] === 0xD8
}

export function isPNG (buf) {
  const b = new Uint8Array(buf)
  return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
}

export function isWebP (buf) {
  const b = new Uint8Array(buf)
  return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
}

export function isGIF (buf) {
  const b = new Uint8Array(buf)
  return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46
}

export function isBMP (buf) {
  const b = new Uint8Array(buf)
  return b[0] === 0x42 && b[1] === 0x4D
}

// Locate the EXIF TIFF block in JPEG or WebP.
export function findExif (buf) {
  const b = new Uint8Array(buf)
  const dv = new DataView(buf)
  if (isJPEG(buf)) {
    let off = 2
    while (off < b.length - 4) {
      if (b[off] !== 0xFF) { off++; continue }
      const marker = b[off + 1]
      if (marker === 0xD8 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { off += 2; continue }
      if (marker === 0xDA) break // start of scan
      const len = dv.getUint16(off + 2)
      if (marker === 0xE1 && dv.getUint32(off + 4) === 0x45786966) { // "Exif"
        return off + 10
      }
      off += 2 + len
    }
  } else if (isWebP(buf)) {
    let off = 12
    while (off < b.length - 8) {
      const tag = String.fromCharCode(b[off], b[off + 1], b[off + 2], b[off + 3])
      const size = dv.getUint32(off + 4, true)
      if (tag === 'EXIF') return off + 8
      off += 8 + size + (size % 2)
    }
  }
  return null
}

export function parseExif (buf) {
  const exifStart = findExif(buf)
  if (exifStart == null) return null
  const dv = new DataView(buf)
  const b = new Uint8Array(buf)
  const byteOrder = dv.getUint16(exifStart)
  const little = byteOrder === 0x4949
  if (!little && byteOrder !== 0x4D4D) return null
  const u16 = (o) => dv.getUint16(o, little)
  const u32 = (o) => dv.getUint32(o, little)
  const i32 = (o) => dv.getInt32(o, little)

  const ifd0Off = u32(exifStart + 4)
  const out = { IFD0: {}, Exif: {}, GPS: {}, _tiffStart: exifStart }

  const readIFD = (start, target) => {
    if (start <= 0 || start + 2 > b.length) return
    const count = u16(start)
    for (let i = 0; i < count; i++) {
      const entry = start + 2 + i * 12
      if (entry + 12 > b.length) break
      const tag = u16(entry)
      const type = u16(entry + 2)
      const num = u32(entry + 4)
      const size = (TYPE_SIZES[type] || 1) * num
      let valOff = entry + 8
      if (size > 4) valOff = exifStart + u32(entry + 8)
      if (valOff + Math.min(size, 4) > b.length) continue
      readValue(dv, b, type, num, valOff, exifStart, tag, target, little)
    }
  }

  readIFD(exifStart + ifd0Off, out.IFD0)
  if (out.IFD0.ExifIFD != null) readIFD(exifStart + out.IFD0.ExifIFD, out.Exif)
  if (out.IFD0.GPSIFD != null) readIFD(exifStart + out.IFD0.GPSIFD, out.GPS)

  delete out.IFD0.ExifIFD
  delete out.IFD0.GPSIFD
  return out
}

function readValue (dv, b, type, num, valOff, tiffStart, tag, target, little) {
  const name = TAGS[tag] || GPS_TAGS[tag] || `Tag_0x${tag.toString(16).padStart(4, '0')}`
  let value
  switch (type) {
    case 2: { // ASCII
      let s = ''
      for (let i = 0; i < num - 1 && valOff + i < b.length; i++) s += String.fromCharCode(b[valOff + i])
      value = s
      break
    }
    case 1: case 7: { // BYTE / UNDEFINED
      value = num === 1 ? b[valOff] : Array.from(b.slice(valOff, valOff + Math.min(num, 32)))
      break
    }
    case 3: value = num === 1 ? dv.getUint16(valOff, little) : readSeq(dv, valOff, num, little, 'u16'); break
    case 4: value = num === 1 ? dv.getUint32(valOff, little) : readSeq(dv, valOff, num, little, 'u32'); break
    case 5: { // RATIONAL
      const rationals = []
      for (let i = 0; i < num; i++) {
        const o = valOff + i * 8
        rationals.push(dv.getUint32(o, little) / (dv.getUint32(o + 4, little) || 1))
      }
      value = num === 1 ? rationals[0] : rationals
      break
    }
    case 9: value = dv.getInt32(valOff, little); break
    case 10: { // SRATIONAL
      value = dv.getInt32(valOff, little) / (dv.getInt32(valOff + 4, little) || 1)
      break
    }
    default: value = null
  }
  target[name] = value
}

function readSeq (dv, off, num, little, kind) {
  const out = []
  for (let i = 0; i < Math.min(num, 16); i++) {
    out.push(kind === 'u16' ? dv.getUint16(off + i * 2, little) : dv.getUint32(off + i * 4, little))
  }
  return out
}

export function formatGps (gps) {
  if (!gps || !gps.GPSLatitude || !gps.GPSLongitude) return null
  const toDeg = (v) => Array.isArray(v) && v.length === 3 ? v[0] + v[1] / 60 + v[2] / 3600 : null
  const lat = toDeg(gps.GPSLatitude) * (gps.GPSLatitudeRef === 'S' ? -1 : 1)
  const lon = toDeg(gps.GPSLongitude) * (gps.GPSLongitudeRef === 'W' ? -1 : 1)
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null
  return { lat, lon, display: `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'W'}` }
}

// List PNG chunks (name, size) for the metadata viewer.
export function listPngChunks (buf) {
  const b = new Uint8Array(buf)
  const dv = new DataView(buf)
  const chunks = []
  let off = 8
  while (off + 8 <= b.length) {
    const len = dv.getUint32(off)
    const name = String.fromCharCode(b[off + 4], b[off + 5], b[off + 6], b[off + 7])
    let text = null
    if (['tEXt', 'zTXt', 'iTXt', 'eXIf'].includes(name)) {
      try { text = new TextDecoder().decode(b.slice(off + 8, off + 8 + Math.min(len, 400))) } catch { /* binary */ }
    }
    chunks.push({ name, len, text })
    off += 12 + len
    if (name === 'IEND') break
  }
  return chunks
}

// GIF metadata: parse logical screen descriptor + comment extensions.
export function gifInfo (buf) {
  const b = new Uint8Array(buf)
  const dv = new DataView(buf)
  const info = { version: String.fromCharCode(b[3], b[4], b[5]), frames: 0, comments: [] }
  info.width = dv.getUint16(6, true)
  info.height = dv.getUint16(8, true)
  let off = 13
  const flags = b[10]
  if (flags & 0x80) off += 3 * (2 << (flags & 7))
  while (off < b.length) {
    const block = b[off]
    if (block === 0x21) { // extension
      const label = b[off + 1]
      if (label === 0xF9) { info.frames++; off += 8 }
      else if (label === 0xFE) {
        let o = off + 2
        let text = ''
        while (o < b.length && b[o] !== 0) { text += String.fromCharCode(b[o]); o++ }
        info.comments.push(text)
        off = o + 1
        continue
      } else if (label === 0xFF) { off += 14 } else { off += 2 }
      // skip sub-blocks
      while (off < b.length && b[off] !== 0) off += b[off] + 1
      off++
    } else if (block === 0x2C) { // image descriptor
      info.frames++
      off += 9
      const f = b[off - 1]
      if (f & 0x80) off += 3 * (2 << (f & 7))
      off++ // LZW min code
      while (off < b.length && b[off] !== 0) off += b[off] + 1
      off++
    } else if (block === 0x3B) break
    else off++
  }
  return info
}
