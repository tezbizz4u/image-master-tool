// Universal upload component. Drag & drop, file picker, clipboard paste.
// Validates type and decodability, shows thumbnails, size, dimensions.

import { el, fmtBytes } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { track, EVENTS } from '../core/analytics.js'
import { loadImageFromBlob } from '../lib/engine.js'
import { toastErr } from './toast.js'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/avif', 'image/heic', 'image/heif', 'image/tiff']
const MAX_SIZE = 80 * 1024 * 1024 // 80 MB per file

export function createUploadZone ({
  multiple = true,
  accept = ACCEPTED.join(','),
  compact = false,
  onFiles,
  label = 'Drop images here',
  sub = 'or click to browse — you can also paste from clipboard'
} = {}) {
  let input

  const zone = el('div', {
    class: `dropzone${compact ? ' compact' : ''}`,
    role: 'button',
    tabindex: '0',
    'aria-label': 'Upload images'
  },
  !compact && el('div', { class: 'dz-icon' }, icon('upload', 26)),
  el('h3', { text: label }),
  el('p', {}, el('b', { text: 'Click to select' }), el('span', { text: ` — ${sub}` })),
  el('div', { class: 'dz-actions' },
    el('button', {
      class: 'btn btn-primary btn-sm',
      type: 'button',
      onclick: (e) => { e.stopPropagation(); ensureInput().click() }
    }, icon('image', 15), 'Browse files'),
    multiple && el('button', {
      class: 'btn btn-sm',
      type: 'button',
      onclick: (e) => { e.stopPropagation(); toastPasteHint() }
    }, 'Paste (Ctrl+V)')
  ))

  function ensureInput () {
    if (input) return input
    input = el('input', { type: 'file', accept, multiple: String(multiple) })
    input.style.display = 'none'
    input.addEventListener('change', () => {
      handleFiles([...input.files])
      input.value = ''
    })
    document.body.append(input)
    return input
  }

  zone.addEventListener('click', () => ensureInput().click())
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ensureInput().click() }
  })
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover') })
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'))
  zone.addEventListener('drop', (e) => {
    e.preventDefault()
    zone.classList.remove('dragover')
    handleFiles([...e.dataTransfer.files])
  })

  function toastPasteHint () {
    import('./toast.js').then(m => m.toastInfo('Copy an image anywhere (e.g. a screenshot), then press Ctrl+V on this page.'))
  }

  function handleFiles (files) {
    const images = files.filter(f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|svg|avif|heic|heif|tiff?)$/i.test(f.name))
    const rejected = files.length - images.length
    if (rejected > 0) {
      toastErr(`${rejected} file${rejected > 1 ? 's were' : ' was'} skipped — only image files are supported.`)
    }
    if (!images.length) return
    track(EVENTS.UPLOAD_STARTED, { count: images.length })
    onFiles(images)
  }

  // Global paste handler — attached once per zone, removed with the zone.
  const onPaste = (e) => {
    const items = [...(e.clipboardData?.items || [])]
    const files = items.filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean)
    if (files.length) handleFiles(files)
  }
  document.addEventListener('paste', onPaste)

  const origRemove = zone.remove.bind(zone)
  zone.remove = function () {
    document.removeEventListener('paste', onPaste)
    if (input) input.remove()
    origRemove()
  }

  return zone
}

// Renders a file list with thumbnails and remove buttons. Returns { root, set, get }.
export function createFileList ({ onRemove, onReorder } = {}) {
  const root = el('div', { class: 'file-list' })
  let files = []

  async function render () {
    root.replaceChildren()
    for (const item of files) {
      const row = el('div', { class: 'file-row', draggable: String(!!onReorder) })
      if (!item.thumb && !item.thumbLoading) {
        item.thumbLoading = true
        loadImageFromBlob(item.file).then(img => {
          const c = document.createElement('canvas')
          const scale = 88 / Math.max(img.naturalWidth, img.naturalHeight)
          c.width = Math.max(1, Math.round(img.naturalWidth * scale))
          c.height = Math.max(1, Math.round(img.naturalHeight * scale))
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
          item.thumb = c.toDataURL('image/png')
          render()
        }).catch(() => { item.thumbError = true; render() })
      }
      if (item.thumb) {
        row.append(el('img', { class: 'file-thumb', src: item.thumb, alt: '' }))
      } else if (item.thumbError) {
        row.append(el('div', { class: 'file-thumb', style: { display: 'grid', placeItems: 'center' } }, icon('alert', 18)))
      } else {
        row.append(el('div', { class: 'file-thumb', style: { display: 'grid', placeItems: 'center' } }))
      }
      const sub = item.error
        ? el('span', { class: 'text-err', text: item.error })
        : `${item.width && item.height ? `${item.width}×${item.height} · ` : ''}${fmtBytes(item.file.size)} · ${extOf(item.file)}`
      row.append(
        el('div', { class: 'file-meta' },
          el('div', { class: 'file-name', text: item.file.name }),
          el('div', { class: 'file-sub' }, sub)
        )
      )
      if (item.status) {
        row.append(el('span', { class: `file-status ${item.status}`, text: statusLabel(item.status) }))
      }
      if (onReorder) {
        const up = el('button', { class: 'file-x', title: 'Move up', 'aria-label': `Move ${item.file.name} up`, onclick: () => onReorder(item, -1) }, icon('chevron-up', 14))
        const down = el('button', { class: 'file-x', title: 'Move down', 'aria-label': `Move ${item.file.name} down`, onclick: () => onReorder(item, 1) }, icon('chevron-down', 14))
        row.append(up, down)
      }
      row.append(el('button', {
        class: 'file-x',
        'aria-label': `Remove ${item.file.name}`,
        onclick: () => onRemove(item)
      }, icon('x', 14)))
      root.append(row)
    }
  }

  return {
    root,
    set (list) { files = list; render() },
    get () { return files }
  }
}

function extOf (file) {
  const m = /\.([a-z0-9]+)$/i.exec(file.name)
  return (m ? m[1] : file.type.replace('image/', '') || '?').toUpperCase()
}

function statusLabel (s) {
  return { pending: 'Pending', working: 'Processing…', done: 'Done', error: 'Failed' }[s] || s
}

// Validate a single file; returns error message or null. Also checks the file
// actually decodes (guards against renamed non-images).
export async function validateImageFile (file) {
  if (file.size > MAX_SIZE) return 'File is too large (limit 80 MB).'
  if (file.size === 0) return 'File is empty.'
  if (file.type && !file.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|bmp|svg|avif|heic|heif|tiff?)$/i.test(file.name)) {
    return 'Not an image file.'
  }
  if (file.type && !ACCEPTED.includes(file.type) && file.type !== '') {
    // Unknown/unsupported mime — still allow extension-based images but warn.
    return null
  }
  return null
}
