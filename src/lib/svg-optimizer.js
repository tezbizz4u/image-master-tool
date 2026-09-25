// Dependency-free SVG minifier: strips comments/metadata/editor cruft,
// collapses whitespace and rounds numeric path data.

export function optimizeSvg (source, { precision = 2, stripIds = true } = {}) {
  const before = source.length
  let s = source

  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<\?xml-stylesheet[^>]*\?>/g, '')
  s = s.replace(/<!DOCTYPE[^>]*>/g, '')
  s = s.replace(/<metadata[\s\S]*?<\/metadata\s*>/gi, '')
  s = s.replace(/<(sodipodi|inkscape|sketch|adobe)[^>]*>[\s\S]*?<\/\1[^>]*>/gi, '')
  s = s.replace(/\s(inkscape|sodipodi|sketch):[\w-]+="[^"]*"/gi, '')
  s = s.replace(/\s(xmlns:(inkscape|sodipodi|sketch|adobe|serif))="[^"]*"/gi, '')
  if (stripIds) {
    s = s.replace(/\sid="[^"]*"/g, (m) => {
      // keep ids referenced by url(#...) and aria
      return m
    })
  }
  s = s.replace(/\sclass=""/g, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  // collapse whitespace between tags
  s = s.replace(/>\s+</g, '><')
  s = s.replace(/\s{2,}/g, ' ')
  // round numbers in path data
  s = s.replace(/(d=")([^"]*)(")/g, (m, pre, d, post) => {
    const rounded = d.replace(/-?\d*\.\d+(e-?\d+)?/gi, (num) => {
      return String(+Number(num).toFixed(precision))
    })
    return pre + rounded + post
  })
  s = s.trim()
  const after = s.length
  return { svg: s, before, after, saved: before - after, pct: before ? ((before - after) / before * 100) : 0 }
}
