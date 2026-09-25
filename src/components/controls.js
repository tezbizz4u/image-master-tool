// Reusable controls used by every tool's settings panel.

import { el, clamp } from '../core/utils.js'

export function sliderRow ({ label, min = 0, max = 100, value = 50, step = 1, unit = '', onInput, fmt }) {
  const val = el('span', { class: 'val', text: format(value) })
  const range = el('input', {
    type: 'range', min, max, step, value,
    'aria-label': label,
    oninput: (e) => {
      const v = Number(e.target.value)
      val.textContent = format(v)
      onInput(v)
    }
  })
  const row = el('div', { class: 'slider-row' }, range, val)
  function format (v) { return fmt ? fmt(v) : `${v}${unit}` }
  const wrap = el('div', { class: 'field' }, el('label', {}, el('span', { text: label }), val), row)
  wrap.update = (v) => { range.value = v; val.textContent = format(v) }
  return wrap
}

export function numberField ({ label, value = 0, min = -Infinity, max = Infinity, step = 1, onInput, suffix = '', placeholder = '' }) {
  const input = el('input', {
    class: 'input', type: 'number', value, min, max, step, placeholder,
    'aria-label': label,
    oninput: (e) => {
      const v = e.target.value === '' ? '' : Number(e.target.value)
      onInput(v === '' ? '' : clamp(v, min, max))
    }
  })
  return el('div', { class: 'field' },
    label ? el('label', { text: label }) : '',
    el('div', { class: 'color-row' }, input, suffix ? el('span', { class: 'muted', text: suffix }) : '')
  )
}

export function textField ({ label, value = '', placeholder = '', onInput, onEnter }) {
  const input = el('input', {
    class: 'input', type: 'text', value, placeholder,
    'aria-label': label || 'Text',
    oninput: (e) => onInput(e.target.value),
    onkeydown: (e) => { if (e.key === 'Enter' && onEnter) onEnter(e.target.value) }
  })
  return el('div', { class: 'field' }, label ? el('label', { text: label }) : '', input)
}

export function selectField ({ label, value, options, onChange }) {
  const select = el('select', {
    class: 'input',
    'aria-label': label || 'Select',
    onchange: (e) => onChange(e.target.value)
  }, options.map(o => el('option', { value: o.value, selected: o.value === value }, o.label)))
  return el('div', { class: 'field' }, label ? el('label', { text: label }) : '', select)
}

export function colorField ({ label, value = '#000000', onInput }) {
  const text = el('input', {
    class: 'input', type: 'text', value,
    'aria-label': label || 'Color',
    oninput: (e) => {
      if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) { swatch.value = e.target.value; onInput(e.target.value) }
    }
  })
  const swatch = el('input', { type: 'color', value, 'aria-label': `${label || 'Color'} picker`, oninput: (e) => { text.value = e.target.value; onInput(e.target.value) } })
  return el('div', { class: 'field' }, label ? el('label', { text: label }) : '', el('div', { class: 'color-row' }, swatch, text))
}

export function toggle ({ label, value = false, onChange }) {
  const input = el('input', { type: 'checkbox', checked: value, onchange: (e) => onChange(e.target.checked) })
  return el('label', { class: 'check' }, input, el('span', { text: label }))
}

export function switchToggle ({ label, value = false, onChange }) {
  const input = el('input', { type: 'checkbox', checked: value, onchange: (e) => onChange(e.target.checked) })
  return el('div', { class: 'field' },
    el('label', {}, el('span', { text: label })),
    el('div', { class: 'switch' }, input, el('span', { class: 'track' }), el('span', { class: 'thumb' }))
  )
}

export function segmented ({ options, value, onChange, block = false }) {
  const root = el('div', { class: `seg${block ? ' block' : ''}`, role: 'tablist' })
  const buttons = options.map(o => {
    const b = el('button', {
      type: 'button',
      class: o.value === value ? 'on' : '',
      role: 'tab',
      onclick: () => {
        buttons.forEach(x => x.classList.remove('on'))
        b.classList.add('on')
        onChange(o.value)
      }
    }, o.label)
    return b
  })
  root.append(...buttons)
  return root
}

export function radioTiles ({ label, options, value, onChange }) {
  const name = `rt-${Math.random().toString(36).slice(2, 8)}`
  const root = el('div', { class: 'field' }, label ? el('label', { text: label }) : '')
  const tiles = el('div', { class: 'radio-tiles' })
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: o.value, checked: o.value === value })
    const tile = el('label', { class: o.value === value ? 'on' : '' },
      input,
      el('b', { text: o.label }),
      o.sub ? el('span', { text: o.sub }) : ''
    )
    input.addEventListener('change', () => {
      tiles.querySelectorAll('label').forEach(l => l.classList.remove('on'))
      tile.classList.add('on')
      onChange(o.value)
    })
    tiles.append(tile)
  }
  root.append(tiles)
  return root
}

export function checkboxGroup ({ label, options, values = [], onChange }) {
  const state = new Set(values)
  const root = el('div', { class: 'field' }, label ? el('label', { text: label }) : '')
  for (const o of options) {
    const cb = el('input', { type: 'checkbox', checked: state.has(o.value) })
    cb.addEventListener('change', () => {
      cb.checked ? state.add(o.value) : state.delete(o.value)
      onChange([...state])
    })
    root.append(el('label', { class: 'check' }, cb, el('span', { text: o.label })))
  }
  return root
}
