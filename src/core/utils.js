// Shared utilities: DOM construction, formatting, file helpers, downloads.

export function el (tag, attrs = {}, ...children) {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue
    if (k === 'class') node.className = v
    else if (k === 'html') node.innerHTML = v
    else if (k === 'text') node.textContent = v
    else if (k === 'dataset') Object.assign(node.dataset, v)
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v)
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v)
    else if (k === 'value') node.value = v
    else if (['checked', 'disabled', 'selected', 'multiple', 'indeterminate', 'readOnly'].includes(k)) node[k] = v
    else node.setAttribute(k, v)
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue
    node.append(c.nodeType ? c : document.createTextNode(String(c)))
  }
  return node
}

export function fmtBytes (bytes, digits = 1) {
  if (bytes === 0) return '0 B'
  if (bytes == null || isNaN(bytes)) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / (1024 ** i)
  return `${val.toFixed(i === 0 ? 0 : val >= 100 ? 0 : digits)} ${units[i]}`
}

export function fmtPct (reduction) {
  const sign = reduction >= 0 ? '−' : '+'
  return `${sign}${Math.abs(reduction).toFixed(1)}%`
}

export function debounce (fn, ms = 150) {
  let timer
  const wrapped = (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  wrapped.cancel = () => clearTimeout(timer)
  return wrapped
}

export function clamp (v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export function uid () {
  return Math.random().toString(36).slice(2, 10)
}

export function download (blobOrUrl, filename) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl)
  const a = el('a', { href: url, download: filename || 'image' })
  document.body.append(a)
  a.click()
  a.remove()
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 4000)
  trackDownload()
}

function trackDownload () {
  // Imported lazily to avoid a circular import with analytics.
  import('../core/analytics.js').then(m => m.track(m.EVENTS.DOWNLOAD, {})).catch(() => {})
}

export function downloadZip (files, zipName = 'image-master-tool.zip') {
  // files: [{ name, blob }]
  return import('jszip').then(async ({ default: JSZip }) => {
    const zip = new JSZip()
    for (const f of files) zip.file(f.name, f.blob)
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
    download(blob, zipName)
  })
}

export function readFileAsArrayBuffer (file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('read-failed'))
    r.readAsArrayBuffer(file)
  })
}

export function readFileAsDataURL (file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('read-failed'))
    r.readAsDataURL(file)
  })
}

export function readFileAsText (file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(new Error('read-failed'))
    r.readAsText(file)
  })
}

export function friendlyError (err) {
  const msg = String(err && (err.message || err))
  if (/decode|corrupt|broken|not a valid|invalid image/i.test(msg)) {
    return 'We couldn\'t read this image. The file may be corrupted or in a format this browser can\'t decode. Try converting it to JPG or PNG first.'
  }
  if (/too large|size/i.test(msg)) {
    return 'This file is too large to process in your browser. Try a smaller image (under ~100 MP of pixels).'
  }
  if (/format|unsupported|mime/i.test(msg)) {
    return 'This image format isn\'t supported in your browser. Try converting it to JPG or PNG first.'
  }
  return 'We couldn\'t process this image. The file may be corrupted, too large, or use an unsupported format.'
}

export function globToRegExp (glob) {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${esc}$`, 'i')
}
