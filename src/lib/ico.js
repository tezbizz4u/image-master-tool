// ICO container writer. Assembles a valid multi-size .ico from PNG blobs
// (Vista+ format: PNG-compressed frames inside the ICO container).

export async function buildIco (pngBlobsWithSizes) {
  // [{ size, blob }] — blob must be PNG
  const entries = []
  for (const { size, blob } of pngBlobsWithSizes) {
    entries.push({ size, data: new Uint8Array(await blob.arrayBuffer()) })
  }

  const count = entries.length
  const headerSize = 6 + count * 16
  let total = headerSize
  for (const e of entries) total += e.data.length

  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // ICONDIR
  dv.setUint16(0, 0, true)  // reserved
  dv.setUint16(2, 1, true)  // type: icon
  dv.setUint16(4, count, true)

  let dataOffset = headerSize
  entries.forEach((e, i) => {
    const o = 6 + i * 16
    bytes[o] = e.size >= 256 ? 0 : e.size        // width (0 = 256)
    bytes[o + 1] = e.size >= 256 ? 0 : e.size    // height
    bytes[o + 2] = 0                              // palette
    bytes[o + 3] = 0                              // reserved
    dv.setUint16(o + 4, 1, true)                  // planes
    dv.setUint16(o + 6, 32, true)                 // bpp
    dv.setUint32(o + 8, e.data.length, true)      // data size
    dv.setUint32(o + 12, dataOffset, true)        // offset
    dataOffset += e.data.length
  })

  let cursor = headerSize
  for (const e of entries) {
    bytes.set(e.data, cursor)
    cursor += e.data.length
  }
  return new Blob([buf], { type: 'image/x-icon' })
}
