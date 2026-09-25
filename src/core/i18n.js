// Internationalization layer. UI strings resolve through t(); English is the
// base dictionary and additional locales can be registered later without
// touching components. Tool names/descriptions come from the registry and can
// be localized by extending the registry entries per-locale.
const dictionaries = { en: {} }

let fallback = 'en'
let current = 'en'

export function registerLocale (code, dict) {
  dictionaries[code] = { ...(dictionaries[code] || {}), ...dict }
}

export function setLocale (code) {
  if (dictionaries[code]) current = code
}

export function getLocale () {
  return current
}

export function t (key, vars) {
  let str = dictionaries[current][key] ?? dictionaries[fallback][key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, String(v))
  }
  return str
}
