// Category definitions. Order defines navigation order.
export const CATEGORIES = [
  { id: 'quick-tools', name: 'Quick Tools', icon: 'zap', blurb: 'The everyday essentials — resize, crop, rotate, compress, convert and more. Fast, batch-ready, and always in your browser.' },
  { id: 'editor', name: 'Editor', icon: 'sliders', blurb: 'A full browser-based image editor: layers, drawing, text, shapes, adjustments, filters and history — nothing to install.' },
  { id: 'ai-tools', name: 'AI Tools', icon: 'sparkles', blurb: 'AI-powered enhancement, upscaling and background work. Server-backed tools are clearly marked and integration-ready.' },
  { id: 'converters', name: 'Converters', icon: 'repeat', blurb: 'Convert between JPG, PNG, WebP, AVIF, GIF, BMP, SVG, TIFF and ICO — plus HEIC decoding where the browser allows.' },
  { id: 'compress', name: 'Compress & Optimize', icon: 'zap', blurb: 'Shrink JPG, PNG, WebP and AVIF files with precise quality or target-size control. See exactly what you save.' },
  { id: 'effects', name: 'Effects & Filters', icon: 'wand', blurb: 'Blur, sharpen, vignette, glitch, sketch, posterize and dozens more — all with live previews.' },
  { id: 'background', name: 'Background Tools', icon: 'image', blurb: 'Make backgrounds transparent, replace colors, add gradients, blur edges and erase objects.' },
  { id: 'design', name: 'Design Tools', icon: 'layout', blurb: 'Memes, posters, collages, frames and watermarks — practical design tools built for image workflows.' },
  { id: 'social-media', name: 'Social Media', icon: 'smartphone', blurb: 'Perfectly sized canvases for Instagram, YouTube, Facebook, LinkedIn, X, Pinterest and WhatsApp.' },
  { id: 'ecommerce', name: 'E-commerce', icon: 'bag', blurb: 'Product-ready images: white backgrounds, shadows, marketplace presets and batch optimization.' },
  { id: 'developer-tools', name: 'Developer Tools', icon: 'code', blurb: 'Base64, data URIs, favicons, SVG optimization, placeholders, palettes, hashes and metadata.' }
]

// category id -> duplicate icons resolved at render time are fine; `repeat`
// and `zap` reuse existing icons from the icon set.
export function getCategory (id) {
  return CATEGORIES.find(c => c.id === id)
}
