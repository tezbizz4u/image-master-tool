// Tiny client-side PDF writer. Builds a valid PDF with one page per image
// (JPEG-embedded, DCTDecode) entirely in the browser — no libraries.

// Fits an image into a page size (points). PageSize in {a4, letter, fit}.
export async function imagesToPdfBlob (canvases, { pageSize = 'a4', orientation = 'portrait', margin = 24 } = {}) {
  const encoder = new TextEncoder()
  const chunks = []
  let offset = 0
  const offsets = []

  const push = (str) => {
    const bytes = encoder.encode(str)
    chunks.push(bytes)
    offset += bytes.length
  }
  const pushBytes = (bytes) => {
    chunks.push(bytes)
    offset += bytes.length
  }

  const sizes = {
    a4: [595.28, 841.89],
    letter: [612, 792],
    a3: [841.89, 1190.55]
  }

  const pages = []
  for (const canvas of canvases) {
    const jpegBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
    const jpeg = new Uint8Array(await jpegBlob.arrayBuffer())
    let [pw, ph] = sizes[pageSize] || sizes.a4
    if (orientation === 'landscape') [pw, ph] = [ph, pw]
    if (pageSize === 'fit') { pw = canvas.width * 0.75; ph = canvas.height * 0.75 }
    const scale = Math.min((pw - margin * 2) / canvas.width, (ph - margin * 2) / canvas.height)
    const dw = canvas.width * scale
    const dh = canvas.height * scale
    pages.push({ jpeg, pw, ph, dw, dh, x: (pw - dw) / 2, y: (ph - dh) / 2 })
  }

  const n = pages.length
  const infoId = 1
  const pageIds = pages.map((_, i) => 2 + i)
  const contentIds = pages.map((_, i) => 2 + n + i)
  const imageIds = pages.map((_, i) => 2 + 2 * n + i)

  const objStart = (id) => { offsets[id] = offset; push(`${id} 0 obj\n`) }
  const objEnd = () => push('endobj\n')

  push('%PDF-1.4\n%\xB5\xB5\xB5\xB5\n')

  objStart(infoId)
  push('<< /Producer (Image Master Tool) /Creator (Image Master Tool) >>\n')
  objEnd()

  pages.forEach((p, i) => {
    objStart(pageIds[i])
    push(`<< /Type /Page /Parent ${infoId + n + pages.length + 2 * n} 0 R /MediaBox [0 0 ${p.pw.toFixed(2)} ${p.ph.toFixed(2)}] /Resources << /XObject << /Im${i} ${imageIds[i]} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${contentIds[i]} 0 R >>\n`)
    objEnd()
  })

  pages.forEach((p, i) => {
    const content = `q\n${p.dw.toFixed(2)} 0 0 ${p.dh.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)} cm\n/Im${i} Do\nQ\n`
    objStart(contentIds[i])
    push(`<< /Length ${content.length} >>\nstream\n${content}endstream\n`)
    objEnd()
  })

  pages.forEach((p, i) => {
    objStart(imageIds[i])
    const canvas = canvases[i]
    push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`)
    pushBytes(p.jpeg)
    push('\nendstream\n')
    objEnd()
  })

  const pagesId = infoId + n + pages.length + 2 * n
  objStart(pagesId)
  push(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${n} >>\n`)
  objEnd()

  const catalogId = pagesId + 1
  objStart(catalogId)
  push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>\n`)
  objEnd()

  const xrefOff = offset
  const maxId = catalogId
  push(`xref\n0 ${maxId + 1}\n`)
  push('0000000000 65535 f \n')
  for (let id = 1; id <= maxId; id++) {
    const offStr = String(offsets[id] || 0).padStart(10, '0')
    push(`${offStr} 00000 n \n`)
  }
  push(`trailer\n<< /Size ${maxId + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOff}\n%%EOF`)

  return new Blob(chunks, { type: 'application/pdf' })
}
