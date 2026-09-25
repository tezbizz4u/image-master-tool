// Toast notifications — friendly, actionable messages.
import { el } from '../core/utils.js'

export function toast (message, type = 'ok', duration = 3200) {
  const root = document.getElementById('toast-root')
  const dot = el('span', { class: 't-dot' })
  const node = el('div', { class: `toast ${type}`, role: 'status' }, dot, el('span', { text: message }))
  root.append(node)
  setTimeout(() => {
    node.style.opacity = '0'
    node.style.transition = 'opacity .25s'
    setTimeout(() => node.remove(), 260)
  }, duration)
  return node
}

export const toastErr = (m) => toast(m, 'err', 4200)
export const toastInfo = (m) => toast(m, 'info')
