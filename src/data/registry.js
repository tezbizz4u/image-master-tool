// Central tool registry. Single source of truth that drives navigation,
// category pages, search, related tools, SEO metadata and the sitemap.
//
// Status semantics (honesty policy — no fake features):
//   ok      → fully functional in the browser today
//   ai      → integration-ready architecture; needs an AI backend to work
//   server  → needs a server component the browser cannot provide honestly
// Tools with status 'ai'/'server' clearly say so and never simulate results.

export const TOOLS = [
  // ===================== QUICK TOOLS =====================
  { slug: 'resize-image', name: 'Resize Image', category: 'quick-tools', icon: 'maximize-2', desc: 'Resize images to exact pixel dimensions or a percentage — scale by width, height, or fit within a box.', long: 'Resize any image to exact pixel dimensions or scale it proportionally with high-quality progressive resampling. Choose a target width or height and the other side follows automatically to keep the aspect ratio intact, or set both dimensions for an exact fit. Works with JPG, PNG, WebP, GIF, BMP and more — entirely in your browser.', keywords: ['resize', 'scale', 'dimensions', 'image size', 'shrink', 'enlarge', 'change size', 'make image smaller', 'change image size'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp', 'avif'], batch: true, popular: true, status: 'ok' },
  { slug: 'crop-image', name: 'Crop Image', category: 'quick-tools', icon: 'crop', desc: 'Crop images visually with aspect-ratio presets or a freehand selection area.', long: 'Crop images visually with a draggable selection and optional aspect-ratio locks (1:1, 4:3, 16:9 and custom). Perfect for framing shots, trimming edges or preparing images for specific layouts.', keywords: ['crop', 'trim', 'cut', 'cutout', 'frame', 'aspect ratio'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: false, popular: true, status: 'ok' },
  { slug: 'rotate-image', name: 'Rotate Image', category: 'quick-tools', icon: 'rotate-cw', desc: 'Rotate images by 90°, 180°, 270° or any custom angle with auto-crop.', long: 'Rotate images by quarter turns or any custom angle. Straighten tilted photos with fine-grained control and optional auto-crop to remove the empty corners.', keywords: ['rotate', 'turn', 'straighten', 'tilt', 'angle', 'orientation'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: true, popular: false, status: 'ok' },
  { slug: 'flip-image', name: 'Flip Image', category: 'quick-tools', icon: 'flip-h', desc: 'Mirror images horizontally or vertically in one click.', long: 'Flip (mirror) images horizontally or vertically — useful for fixing selfies, creating symmetrical compositions or preparing artwork.', keywords: ['flip', 'mirror', 'reverse', 'reflect'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: true, popular: false, status: 'ok' },
  { slug: 'compress-image', name: 'Compress Image', category: 'quick-tools', icon: 'package', desc: 'Reduce image file size with visual quality control and live before/after stats.', long: 'Shrink image file sizes dramatically while keeping them looking great. Control quality with a slider, optionally resize, and see exactly how many bytes you saved before downloading.', keywords: ['compress', 'reduce size', 'smaller file', 'optimize', 'shrink', 'make image smaller'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'convert-image', name: 'Convert Image', category: 'quick-tools', icon: 'repeat', desc: 'Convert between JPG, PNG, WebP and AVIF with quality control and transparency handling.', long: 'Convert images between all popular formats — JPG, PNG, WebP and AVIF — with quality control and smart transparency handling (white or custom matte for formats without alpha).', keywords: ['convert', 'change format', 'jpg to png', 'png to jpg', 'webp', 'avif', 'file type'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp', 'avif'], batch: true, popular: true, status: 'ok' },
  { slug: 'change-dimensions', name: 'Change Dimensions', category: 'quick-tools', icon: 'ruler', desc: 'Set exact width × height in pixels with stretch, cover or contain strategies.', long: 'Set exact pixel dimensions with three fit strategies: stretch (ignore ratio), cover (fill and crop) or contain (fit inside with padding). Great for form fields and platforms that demand exact sizes.', keywords: ['dimensions', 'exact size', 'width height', 'stretch', 'cover', 'fit'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: true, popular: false, status: 'ok' },
  { slug: 'change-aspect-ratio', name: 'Change Aspect Ratio', category: 'quick-tools', icon: 'crop', desc: 'Crop or pad images to a new aspect ratio without manual math.', long: 'Change an image\'s aspect ratio by cropping the excess or padding with a color of your choice — 1:1, 4:3, 16:9, 3:2, 9:16 and fully custom ratios.', keywords: ['aspect ratio', 'ratio', 'crop to', 'pad', 'letterbox'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: true, popular: false, status: 'ok' },
  { slug: 'change-quality', name: 'Change Image Quality', category: 'quick-tools', icon: 'sliders', desc: 'Re-encode images at a specific quality level for JPG, WebP and AVIF.', long: 'Re-encode lossy formats (JPG, WebP, AVIF) at an exact quality level — handy for meeting upload limits or matching an existing library.', keywords: ['quality', 're-encode', 'jpg quality', 'webp quality'], formats: ['jpg', 'webp', 'avif', 'png'], batch: true, popular: false, status: 'ok' },
  { slug: 'change-dpi', name: 'Change DPI', category: 'quick-tools', icon: 'hash', desc: 'Set the DPI metadata (PPI) of JPG and PNG images for print workflows.', long: 'Change the stored DPI/PPI value of JPG and PNG files. This adjusts the physical print size without touching a single pixel — ideal for print-shop submissions that require 300 DPI.', keywords: ['dpi', 'ppi', 'print', 'resolution', '300 dpi'], formats: ['jpg', 'png'], batch: true, popular: false, status: 'ok' },
  { slug: 'image-info', name: 'Image Information', category: 'quick-tools', icon: 'info', desc: 'Inspect dimensions, format, file size, color depth and technical details.', long: 'Get a complete technical readout of any image: dimensions, format, file size, megapixels, aspect ratio, color type and more — without opening an editor.', keywords: ['image info', 'details', 'properties', 'dimensions', 'file size', 'inspect'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp', 'svg', 'avif'], batch: false, popular: false, status: 'ok' },
  { slug: 'metadata-viewer', name: 'Metadata Viewer', category: 'quick-tools', icon: 'file', desc: 'View all embedded metadata: EXIF, GPS, camera settings and software tags.', long: 'Inspect every metadata block inside a file — EXIF camera data, GPS coordinates, timestamps, software tags and PNG text chunks. Nothing leaves your browser.', keywords: ['metadata', 'exif', 'gps', 'camera data', 'view metadata'], formats: ['jpg', 'png', 'webp', 'gif'], batch: false, popular: false, status: 'ok' },
  { slug: 'remove-metadata', name: 'Remove Metadata', category: 'quick-tools', icon: 'eye-off', desc: 'Strip EXIF, GPS and all privacy-sensitive metadata from images.', long: 'Strip EXIF, GPS coordinates, camera serials and other metadata from images before sharing them. Pixel data is untouched; output is a clean re-encode with metadata dropped.', keywords: ['remove metadata', 'strip exif', 'privacy', 'gps removal', 'clean image'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'exif-viewer', name: 'EXIF Viewer', category: 'quick-tools', icon: 'camera', desc: 'Read EXIF data: camera, lens, exposure, ISO, focal length and timestamps.', long: 'Read full EXIF records — camera make and model, lens, aperture, shutter speed, ISO, focal length, flash and capture time — decoded entirely on your device.', keywords: ['exif', 'camera data', 'lens', 'iso', 'shutter', 'photo details'], formats: ['jpg', 'tiff', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'exif-remover', name: 'EXIF Remover', category: 'quick-tools', icon: 'shield', desc: 'Remove EXIF data from photos while keeping full visual quality.', long: 'Remove EXIF blocks from photos with an option to keep or drop other metadata. Ideal for photographers publishing work publicly.', keywords: ['exif remover', 'strip exif', 'remove exif', 'photo privacy'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'color-picker', name: 'Image Color Picker', category: 'quick-tools', icon: 'pipette', desc: 'Pick colors from any point of an image with zoomed loupe precision.', long: 'Hover over your image to pick exact colors with a magnified loupe, then copy HEX, RGB or HSL values. Recently picked colors are kept in a palette.', keywords: ['color picker', 'pick color', 'eyedropper', 'hex', 'rgb'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: false, popular: true, status: 'ok' },
  { slug: 'palette-generator', name: 'Palette Generator', category: 'quick-tools', icon: 'palette', desc: 'Extract dominant colors and build palettes from any image.', long: 'Generate color palettes from images using median-cut quantization. Get dominant, vibrant and muted swatches with HEX codes, ready to copy for design work.', keywords: ['palette', 'color scheme', 'dominant colors', 'extract colors', 'swatches'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: false, popular: false, status: 'ok' },
  { slug: 'add-watermark', name: 'Add Watermark', category: 'quick-tools', icon: 'drop', desc: 'Overlay text or an image watermark with position, opacity and tiling control.', long: 'Protect your images with text or logo watermarks. Choose position on a 9-point grid, adjust size, rotation, opacity and optional tiled pattern — all processed locally.', keywords: ['watermark', 'logo overlay', 'copyright', 'brand image', 'protect photos'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'add-text', name: 'Add Text to Image', category: 'quick-tools', icon: 'type', desc: 'Place text on images with font, size, color, stroke, shadow and rotation control.', long: 'Add text to any image with full typography control: font family, size, weight, color, outline, shadow, alignment and rotation. Drag-free numeric placement keeps it precise.', keywords: ['add text', 'caption', 'write on image', 'typography', 'text overlay'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'add-border', name: 'Add Border', category: 'quick-tools', icon: 'square', desc: 'Add solid, colored or polaroid-style borders around images.', long: 'Frame images with solid borders in any color and thickness, with optional rounded corners and an outer padding style reminiscent of a polaroid frame.', keywords: ['border', 'frame', 'outline', 'edge', 'polaroid'], formats: ['jpg', 'png', 'webp', 'gif'], batch: true, popular: false, status: 'ok' },
  { slug: 'round-corners', name: 'Round Corners', category: 'quick-tools', icon: 'circle', desc: 'Round image corners with adjustable radius and transparent output.', long: 'Give images rounded corners with a precise radius control. Output is PNG or WebP so the corners stay transparent.', keywords: ['rounded corners', 'radius', 'rounded', 'circle crop'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'merge-images', name: 'Image Merger', category: 'quick-tools', icon: 'layers', desc: 'Combine images side-by-side or stacked vertically with spacing control.', long: 'Merge multiple images into one — horizontally, vertically or in a grid — with configurable spacing, background color and alignment.', keywords: ['merge', 'combine', 'join', 'stitch', 'concatenate'], formats: ['jpg', 'png', 'webp', 'gif'], batch: false, popular: true, status: 'ok' },
  { slug: 'split-image', name: 'Image Splitter', category: 'quick-tools', icon: 'grid', desc: 'Slice images into tiles or grid pieces for puzzles and carousels.', long: 'Split an image into equal tiles (2×2, 3×3, custom grids) or vertical slices for Instagram carousel posts. Download pieces individually or as a ZIP.', keywords: ['split', 'slice', 'tiles', 'grid pieces', 'carousel'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'image-to-pdf', name: 'Image to PDF', category: 'quick-tools', icon: 'file', desc: 'Combine images into a single multi-page PDF, fully client-side.', long: 'Turn one or more images into a multi-page PDF with page size and orientation control. The PDF is assembled byte-by-byte in your browser — no uploads.', keywords: ['image to pdf', 'jpg to pdf', 'png to pdf', 'pdf', 'document'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: true, popular: true, status: 'ok' },

  // ===================== EDITOR =====================
  { slug: 'image-editor', name: 'Image Editor', category: 'editor', icon: 'sliders', desc: 'Full layered editor: crop, draw, text, shapes, adjustments, filters, history.', long: 'A serious browser-based editor with layers, drawing tools, text, shapes, live adjustments, filters, zoom/pan canvas, undo history and multi-format export. Everything runs locally.', keywords: ['editor', 'photo editor', 'layers', 'draw', 'annotate', 'photoshop alternative'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: false, popular: true, status: 'ok', featured: true },

  // ===================== AI TOOLS =====================
  { slug: 'ai-background-remover', name: 'AI Background Remover', category: 'ai-tools', icon: 'scissors', desc: 'Segmentation-based background removal. Integration-ready — connect a model endpoint.', long: 'Remove backgrounds with a person/product segmentation model. This tool ships as an integration-ready module: plug in a compatible endpoint (self-hosted or API) in services/ai and it goes live. A local non-AI alternative (color-key removal) is available today in Background Tools.', keywords: ['ai background remover', 'remove bg ai', 'cutout', 'segmentation'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ai' },
  { slug: 'ai-upscaler', name: 'AI Image Upscaler', category: 'ai-tools', icon: 'maximize-2', desc: 'Super-resolution upscaling (2×/4×). Integration-ready — needs a model endpoint.', long: 'Enlarge images with super-resolution models for sharper results than plain interpolation. Ships integration-ready: connect an endpoint in services/ai to enable. A high-quality local resampler (progressive halving with smooth interpolation) is available under Quick Tools — it enlarges cleanly but does not invent detail the way a real SR model does.', keywords: ['ai upscale', 'super resolution', 'enlarge', 'enhance resolution'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ai' },
  { slug: 'ai-enhancer', name: 'AI Image Enhancer', category: 'ai-tools', icon: 'wand', desc: 'One-click AI enhancement of color, contrast and detail. Integration-ready.', long: 'Automatically improve color, contrast and fine detail with a restoration model. Integration-ready — no results are simulated. For immediate needs, use Adjust Colors or Sharpen in Effects.', keywords: ['ai enhance', 'auto enhance', 'improve photo', 'restore'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ai' },
  { slug: 'ai-object-remover', name: 'AI Object Remover', category: 'ai-tools', icon: 'eraser', desc: 'Inpainting-based object removal. Integration-ready — needs a model endpoint.', long: 'Brush over unwanted objects and let an inpainting model fill the gap realistically. Integration-ready via services/ai — we never fake progress bars. A manual clone/patch workflow exists in the Editor.', keywords: ['ai object remover', 'inpaint', 'remove object', 'erase object'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ai' },
  { slug: 'ai-colorize', name: 'AI Colorization', category: 'ai-tools', icon: 'palette', desc: 'Colorize black-and-white photos with a learned model. Integration-ready.', long: 'Bring black-and-white photos to life with a colorization model. Integration-ready — connect your provider in services/ai. No simulated results, ever.', keywords: ['colorize', 'colorize photo', 'black and white to color'], formats: ['jpg', 'png'], batch: false, popular: false, status: 'ai' },
  { slug: 'ai-noise-reduction', name: 'AI Noise Reduction', category: 'ai-tools', icon: 'wind', desc: 'Denoise high-ISO photos with a learned prior. Integration-ready.', long: 'Remove sensor noise while preserving detail using a denoising network. Integration-ready — a classic (non-AI) denoise is available in Effects & Filters today.', keywords: ['denoise', 'noise reduction', 'clean photo', 'grain removal'], formats: ['jpg', 'png'], batch: false, popular: false, status: 'ai' },

  // ===================== CONVERTERS =====================
  { slug: 'jpg-to-png', name: 'JPG to PNG', category: 'converters', icon: 'image', desc: 'Convert JPG photos to lossless PNG with transparency matte options.', long: 'Convert JPG images to PNG — lossless and fully offline. Useful when you need alpha support, crisp graphics or lossless re-editing.', keywords: ['jpg to png', 'jpeg to png', 'convert jpg', '.jpg .png'], formats: ['jpg'], batch: true, popular: true, status: 'ok' },
  { slug: 'png-to-jpg', name: 'PNG to JPG', category: 'converters', icon: 'image', desc: 'Convert PNG to JPG with background color for transparency and quality control.', long: 'Convert PNG images to smaller JPG files. Choose the matte color used behind transparent areas and control output quality.', keywords: ['png to jpg', 'convert png', '.png .jpg'], formats: ['png'], batch: true, popular: true, status: 'ok' },
  { slug: 'jpg-to-webp', name: 'JPG to WebP', category: 'converters', icon: 'globe', desc: 'Convert JPG to WebP for smaller, web-optimized files.', long: 'Convert JPG photos to WebP — typically 25–35% smaller at comparable quality, with optional lossless mode.', keywords: ['jpg to webp', 'jpeg to webp', 'webp converter'], formats: ['jpg'], batch: true, popular: true, status: 'ok' },
  { slug: 'png-to-webp', name: 'PNG to WebP', category: 'converters', icon: 'globe', desc: 'Convert PNG to WebP keeping full transparency.', long: 'Convert PNG images to WebP while preserving alpha transparency — great for logos, icons and UI assets.', keywords: ['png to webp', 'transparent webp'], formats: ['png'], batch: true, popular: true, status: 'ok' },
  { slug: 'webp-to-jpg', name: 'WebP to JPG', category: 'converters', icon: 'image', desc: 'Convert WebP images to universally-supported JPG.', long: 'Convert WebP files to JPG for maximum compatibility with older apps, CMSs and devices.', keywords: ['webp to jpg', 'webp converter', 'google webp'], formats: ['webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'webp-to-png', name: 'WebP to PNG', category: 'converters', icon: 'image', desc: 'Convert WebP to lossless PNG with transparency intact.', long: 'Convert WebP images to PNG without losing transparency — handy for editing workflows that prefer PNG.', keywords: ['webp to png', 'webp png converter'], formats: ['webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'to-avif', name: 'Convert to AVIF', category: 'converters', icon: 'zap', desc: 'Convert JPG/PNG/WebP to next-gen AVIF where your browser supports encoding.', long: 'Convert images to AVIF, the most efficient common format. Uses your browser\'s native AVIF encoder when available; we tell you honestly if it isn\'t.', keywords: ['avif', 'convert to avif', 'next-gen format'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'avif-to-jpg', name: 'AVIF to JPG', category: 'converters', icon: 'image', desc: 'Convert AVIF images to JPG — requires a browser that decodes AVIF.', long: 'Convert AVIF photos to JPG using your browser\'s AVIF decoder (Chrome, Edge, Firefox 93+). Decode capability is checked up-front.', keywords: ['avif to jpg', 'avif converter'], formats: ['avif'], batch: true, popular: false, status: 'ok' },
  { slug: 'heic-to-jpg', name: 'HEIC to JPG', category: 'converters', icon: 'smartphone', desc: 'Convert iPhone HEIC photos — requires Safari or a HEIC-capable browser.', long: 'Convert HEIC/HEIF photos (iPhone default) to JPG. Browsers vary: Safari decodes HEIC natively; on other browsers this tool honestly reports when decoding isn\'t possible and suggests alternatives.', keywords: ['heic to jpg', 'heif', 'iphone photo', 'apple format'], formats: ['heic'], batch: true, popular: true, status: 'ok' },
  { slug: 'tiff-to-jpg', name: 'TIFF to JPG', category: 'converters', icon: 'file', desc: 'Convert TIFF scans to JPG — requires a TIFF-capable browser (Safari).', long: 'Convert TIFF images to JPG. TIFF decode support depends on the browser (Safari handles it; most others don\'t) — capability is detected and communicated clearly.', keywords: ['tiff to jpg', 'tif converter', 'scan'], formats: ['tiff'], batch: true, popular: false, status: 'ok' },
  { slug: 'bmp-to-jpg', name: 'BMP to JPG', category: 'converters', icon: 'file', desc: 'Convert legacy BMP bitmaps to modern JPG or PNG.', long: 'Convert old-school BMP bitmaps to compact JPG (photos) or PNG (graphics) with a single click.', keywords: ['bmp to jpg', 'bitmap converter'], formats: ['bmp'], batch: true, popular: false, status: 'ok' },
  { slug: 'gif-to-png', name: 'GIF to PNG', category: 'converters', icon: 'frames', desc: 'Convert static GIFs to PNG, or extract any frame of an animated GIF.', long: 'Convert GIF images to PNG. For animated GIFs, scrub through frames and export any single frame at full resolution.', keywords: ['gif to png', 'gif frame extract', 'gif converter'], formats: ['gif'], batch: true, popular: false, status: 'ok' },
  { slug: 'gif-to-webp', name: 'GIF to animated WebP', category: 'converters', icon: 'frames', desc: 'Convert animated GIFs to animated WebP where the browser supports it.', long: 'Re-encode animated GIFs as animated WebP (usually much smaller). Encoding support is detected per-browser with a clear fallback message.', keywords: ['gif to webp', 'animated webp'], formats: ['gif'], batch: true, popular: false, status: 'ok' },
  { slug: 'svg-to-png', name: 'SVG to PNG', category: 'converters', icon: 'code', desc: 'Rasterize SVG vectors to PNG at any scale, 1× to 8×.', long: 'Render SVG files to crisp PNG at any scale from 1× to 8× with transparent background — perfect for exporting icons and logos.', keywords: ['svg to png', 'vector to png', 'rasterize'], formats: ['svg'], batch: true, popular: true, status: 'ok' },
  { slug: 'svg-to-jpg', name: 'SVG to JPG', category: 'converters', icon: 'code', desc: 'Render SVG vectors to JPG with configurable background.', long: 'Rasterize SVG files to JPG with a white or custom background (JPG has no transparency), at your chosen scale.', keywords: ['svg to jpg', 'svg rasterize'], formats: ['svg'], batch: true, popular: false, status: 'ok' },
  { slug: 'favicon-generator', name: 'Favicon Generator', category: 'converters', icon: 'star', desc: 'Generate favicon.ico plus all modern PWA icon sizes from one image.', long: 'Create a complete favicon set: a real multi-size .ico file (16/32/48), apple-touch-icon (180), and standard PWA PNGs (192/512) — all generated locally.', keywords: ['favicon', 'ico', 'app icon', 'pwa icons', 'website icon'], formats: ['png', 'jpg', 'webp', 'svg'], batch: false, popular: true, status: 'ok' },

  // ===================== COMPRESS & OPTIMIZE =====================
  { slug: 'compress-jpg', name: 'JPG Compressor', category: 'compress', icon: 'package', desc: 'Compress JPG files with fine quality control and optional progressive encoding.', long: 'Compress JPGs with a quality slider, progressive encoding and chroma-subsampling control. See exact savings before you download.', keywords: ['compress jpg', 'jpeg compressor', 'reduce jpg size'], formats: ['jpg'], batch: true, popular: true, status: 'ok' },
  { slug: 'compress-png', name: 'PNG Compressor', category: 'compress', icon: 'package', desc: 'Compress PNG via smart quantization or lossless re-encode.', long: 'Shrink PNGs two ways: lossless re-encode (zlib level) or color quantization to 256 colors for massive savings on graphics.', keywords: ['compress png', 'reduce png size', 'png optimizer'], formats: ['png'], batch: true, popular: true, status: 'ok' },
  { slug: 'compress-webp', name: 'WebP Compressor', category: 'compress', icon: 'package', desc: 'Re-encode WebP at lower quality or lossless with effort control.', long: 'Re-encode WebP images at your chosen quality — or try lossless mode — with before/after size comparison.', keywords: ['compress webp', 'webp optimizer'], formats: ['webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'batch-compress', name: 'Batch Compressor', category: 'compress', icon: 'layers', desc: 'Drop dozens of files, compress them all, download everything as a ZIP.', long: 'Compress entire folders of images at once. Per-file status, total savings summary and one-click ZIP download.', keywords: ['batch compress', 'bulk compress', 'compress multiple', 'compress folder'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'target-file-size', name: 'Target File Size', category: 'compress', icon: 'target', desc: 'Compress an image to hit an exact file size (e.g. under 100 KB).', long: 'Set a maximum file size and the tool binary-searches the best quality that fits — perfect for upload forms with strict limits.', keywords: ['target size', 'exact size', 'under 100kb', 'file size limit', 'compress to size'], formats: ['jpg', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'image-optimizer', name: 'Image Optimizer', category: 'compress', icon: 'zap', desc: 'One-click web optimization: best-format choice, resize and metadata strip.', long: 'Automatic web optimization: picks the smallest format per image (JPG/WebP), optionally caps dimensions, strips metadata and reports total page-weight savings.', keywords: ['optimize', 'web optimize', 'page speed', 'performance'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'resize-compress', name: 'Resize + Compress', category: 'compress', icon: 'sliders', desc: 'Scale down and compress in one pass — ideal for email and uploads.', long: 'The two-step combo: resize to a max dimension and compress with quality control in a single operation, with full before/after stats.', keywords: ['resize and compress', 'shrink image', 'email size'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },

  // ===================== EFFECTS & FILTERS =====================
  { slug: 'blur-image', name: 'Blur Image', category: 'effects', icon: 'droplet', desc: 'Apply Gaussian blur with radius and edge control.', long: 'Apply a true Gaussian blur with adjustable radius. Useful for backgrounds, obscuring info, or soft-focus looks.', keywords: ['blur', 'gaussian blur', 'soft focus', 'censor'], formats: ['jpg', 'png', 'webp', 'gif'], batch: true, popular: true, status: 'ok' },
  { slug: 'motion-blur', name: 'Motion Blur', category: 'effects', icon: 'wind', desc: 'Add directional motion blur with angle and distance control.', long: 'Simulate camera movement with angle-controlled linear blur — great for speed effects on product or sports shots.', keywords: ['motion blur', 'speed effect', 'directional blur'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'pixelate', name: 'Pixelate Image', category: 'effects', icon: 'grid', desc: 'Censor or stylize with mosaic pixelation at any block size.', long: 'Apply mosaic pixelation with adjustable block size — classic censor effect or retro 8-bit styling.', keywords: ['pixelate', 'mosaic', 'censor', '8-bit', 'retro pixels'], formats: ['jpg', 'png', 'webp', 'gif'], batch: true, popular: true, status: 'ok' },
  { slug: 'sharpen-image', name: 'Sharpen Image', category: 'effects', icon: 'triangle', desc: 'Unsharp-mask sharpening with amount and radius control.', long: 'Bring out detail with unsharp-mask sharpening. Tune amount and radius; over-sharpening halos are visible in the live preview.', keywords: ['sharpen', 'unsharp mask', 'detail', 'crisp'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'add-noise', name: 'Add Noise & Grain', category: 'effects', icon: 'hash', desc: 'Film grain, monochrome noise or color noise with amount control.', long: 'Add photographic grain or digital noise — monochrome or color — with amount control. Useful for texture and dithering.', keywords: ['noise', 'grain', 'film grain', 'texture'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'vignette', name: 'Vignette Effect', category: 'effects', icon: 'circle', desc: 'Darken (or lighten) edges with size and softness control.', long: 'Draw the eye to your subject with adjustable edge darkening — or a bright dreamy inverse vignette.', keywords: ['vignette', 'edges', 'darken corners', 'focus'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'glitch-effect', name: 'Glitch Effect', category: 'effects', icon: 'zap', desc: 'RGB channel shifts, scanlines and slice displacement for cyber looks.', long: 'Create cyber/glitch art: RGB channel separation, horizontal slice displacement, scanlines and block noise — all parameterized.', keywords: ['glitch', 'cyber', 'vhs', 'datamosh', 'distortion'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'posterize', name: 'Posterize', category: 'effects', icon: 'layers', desc: 'Reduce color depth to a poster-like limited palette.', long: 'Flatten images into a limited number of tone levels per channel for a silkscreen/poster look.', keywords: ['posterize', 'poster effect', 'color depth', 'flat colors'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'solarize', name: 'Solarize', category: 'effects', icon: 'sun', desc: 'Sabattier-style partial color inversion effect.', long: 'Apply the classic solarization (Sabattier) effect — partial tone inversion that creates dramatic silver-print looks.', keywords: ['solarize', 'sabattier', 'invert', 'analog effect'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'duotone', name: 'Duotone Effect', category: 'effects', icon: 'contrast', desc: 'Map image tones to a two-color gradient you choose.', long: 'Convert any photo to a two-tone duotone — pick shadow and highlight colors for brand-aligned graphics.', keywords: ['duotone', 'two tone', 'brand colors', 'gradient map'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'sketch-effect', name: 'Pencil Sketch', category: 'effects', icon: 'pen', desc: 'Turn photos into graphite-style pencil sketches.', long: 'Convert photos to pencil-sketch artwork using edge detection and Dodge blending, with intensity and paper-tone control.', keywords: ['sketch', 'pencil', 'drawing effect', 'line art'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'oil-painting', name: 'Oil Painting', category: 'effects', icon: 'brush', desc: 'Kuwahara-filter painterly effect with brush-size control.', long: 'Apply a Kuwahara-filter oil-painting effect with adjustable brush size — painterly flattening that keeps edges crisp.', keywords: ['oil painting', 'painterly', 'kuwahara', 'art effect'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'cartoon-effect', name: 'Cartoon Effect', category: 'effects', icon: 'wand', desc: 'Posterized color + edge outlines for a comic-book look.', long: 'Combine bilateral-style smoothing, posterization and dark edge outlines for a comic/cartoon rendering of any photo.', keywords: ['cartoon', 'comic', 'toon', 'comic book'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'edge-detect', name: 'Edge Detection', category: 'effects', icon: 'crosshair', desc: 'Sobel/Canny-style edge maps for outlines and analysis.', long: 'Generate Sobel edge maps — white lines on black — with strength control. Useful for analysis, stencils and line-art.', keywords: ['edge detection', 'sobel', 'outline', 'contour'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'emboss', name: 'Emboss', category: 'effects', icon: 'hexagon', desc: '3D emboss/stamp effect with depth and light-angle control.', long: 'Give images a chiselled emboss look with adjustable depth and lighting direction.', keywords: ['emboss', 'stamp', 'relief', '3d effect'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'adjust-colors', name: 'Adjust Colors', category: 'effects', icon: 'sliders', desc: 'Brightness, contrast, saturation, temperature, tint, gamma and more.', long: 'Full manual color control: brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, vibrance, gamma and clarity — with live preview.', keywords: ['adjust colors', 'brightness', 'contrast', 'saturation', 'color correction'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'grayscale', name: 'Black & White', category: 'effects', icon: 'contrast', desc: 'Convert to grayscale with luminance-preserving conversion.', long: 'Convert photos to black & white with proper luminance weighting (not a naive average), plus contrast fine-tuning.', keywords: ['grayscale', 'black and white', 'b&w', 'monochrome'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'sepia', name: 'Sepia Effect', category: 'effects', icon: 'clock', desc: 'Classic warm sepia toning with strength control.', long: 'Apply vintage sepia toning with adjustable strength — from subtle warm cast to full antique.', keywords: ['sepia', 'vintage', 'old photo', 'brown tone'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'color-overlay', name: 'Color Overlay', category: 'effects', icon: 'droplet', desc: 'Tint images with a solid color at chosen blend opacity.', long: 'Lay a translucent color wash over images — pick any color and opacity for mood, branding or text-background prep.', keywords: ['color overlay', 'tint', 'color wash', 'blend'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },

  // ===================== BACKGROUND TOOLS =====================
  { slug: 'transparent-background', name: 'Make Background Transparent', category: 'background', icon: 'scissors', desc: 'Color-key background removal with tolerance, edge feathering — truly local.', long: 'Make a background transparent by clicking a color to key out, with tolerance and edge-feather control. A genuine local algorithm (flood-fill from the edges + color distance) — no AI claim, no upload.', keywords: ['transparent background', 'remove background', 'delete background', 'alpha', 'cutout'], formats: ['png', 'jpg', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'background-color', name: 'Change Background Color', category: 'background', icon: 'droplet', desc: 'Swap the background for any solid color using color-key selection.', long: 'Replace the background with any solid color. Works hand-in-hand with color-key selection — pick the background, choose the new color, done.', keywords: ['background color', 'change background', 'white background', 'solid background'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'background-image', name: 'Add Background Image', category: 'background', icon: 'layers', desc: 'Composite a foreground onto another photo with scale and position control.', long: 'Place your image over another photo as the new background — scale, position and optional soft-edge blending for a clean composite.', keywords: ['background image', 'replace background', 'composite', 'photo background'], formats: ['png', 'jpg', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'gradient-background', name: 'Gradient Background', category: 'background', icon: 'wand', desc: 'Put images on smooth two-color gradients with angle control.', long: 'Composite your image over a two-color linear gradient with angle control — a fast, tasteful backdrop for products and profiles.', keywords: ['gradient background', 'two color', 'backdrop'], formats: ['png', 'jpg', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'blur-background', name: 'Blur Background', category: 'background', icon: 'droplet', desc: 'Blur the keyed background while keeping the subject sharp.', long: 'Keep your subject crisp while the keyed background goes silky-blur. Radius and subject-edge feathering are adjustable.', keywords: ['blur background', 'bokeh', 'portrait blur'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'magic-eraser', name: 'Magic Eraser', category: 'background', icon: 'eraser', desc: 'Brush-erase regions to transparency with size and softness control.', long: 'Paint over areas to erase them to transparency with adjustable brush size, softness and a quick background-flood option. Fully manual — and fully honest.', keywords: ['magic eraser', 'erase', 'remove object', 'brush erase'], formats: ['png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'product-white-background', name: 'Product White Background', category: 'background', icon: 'square', desc: 'E-commerce ready: clean white background with soft shadow option.', long: 'Give product photos a marketplace-ready pure white (#FFFFFF) background, with optional soft ground shadow for depth.', keywords: ['white background', 'product photo', 'marketplace', 'amazon background'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },

  // ===================== DESIGN TOOLS =====================
  { slug: 'meme-generator', name: 'Meme Generator', category: 'design', icon: 'megaphone', desc: 'Classic top/bottom impact text, custom fonts and image position.', long: 'The classic meme maker: top and bottom text, uppercase transform, stroke outline, font size and drag-free positioning. Exports PNG or JPG.', keywords: ['meme', 'impact font', 'meme maker', 'funny caption'], formats: ['jpg', 'png', 'webp', 'gif'], batch: false, popular: true, status: 'ok' },
  { slug: 'quote-image', name: 'Quote Image Maker', category: 'design', icon: 'type', desc: 'Turn quotes into shareable images with author and styling presets.', long: 'Create polished quote cards: wrapped text, author attribution, background color/gradient presets and padding control.', keywords: ['quote image', 'quote card', 'text image', 'shareable quote'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'collage-maker', name: 'Collage Maker', category: 'design', icon: 'layout', desc: 'Grid collages with gap, radius and background control for up to 9 photos.', long: 'Combine 2–9 photos into clean grid collages with adjustable gap, corner radius, background color and outer padding.', keywords: ['collage', 'photo grid', 'photo layout', 'combine photos'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'photo-frame', name: 'Photo Frame', category: 'design', icon: 'square', desc: 'Styled frames: polaroid, film strip, rounded and shadow cards.', long: 'Dress photos in styled frames — polaroid with caption, film strip, rounded card with shadow — rendered at export resolution.', keywords: ['photo frame', 'polaroid', 'film strip', 'border styles'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'before-after', name: 'Before/After Image', category: 'design', icon: 'contrast', desc: 'Compose side-by-side or slider-style before/after comparison images.', long: 'Build before/after composites: side-by-side with labels or an exported slider image — ideal for showcasing edits and results.', keywords: ['before after', 'comparison', 'side by side', 'slider image'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'watermark-maker', name: 'Watermark Maker', category: 'design', icon: 'drop', desc: 'Design reusable text watermarks and save them locally for reuse.', long: 'Create watermark designs (text, font, color, opacity, layout) and save them to local storage so every future watermarking session starts from your brand.', keywords: ['watermark maker', 'brand watermark', 'reusable watermark'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'id-photo-maker', name: 'ID Photo Maker', category: 'design', icon: 'user', desc: 'Crop to ID/passport proportions with guides and print sheet layout.', long: 'Crop portraits to standard ID sizes (35×45 mm and friends) with head-position guides, plus an optional 10-up 10×15 cm print sheet layout.', keywords: ['id photo', 'passport photo', 'visa photo', 'biometric'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'profile-picture-maker', name: 'Profile Picture Maker', category: 'design', icon: 'camera', desc: 'Square crop with circular preview, zoom and background fill.', long: 'Make profile pictures: square crop with circular mask preview, zoom/pan of your photo, and a colored or blurred background fill.', keywords: ['profile picture', 'avatar maker', 'circular crop', 'pfp'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },

  // ===================== SOCIAL MEDIA =====================
  { slug: 'instagram-resizer', name: 'Instagram Resizer', category: 'social-media', icon: 'camera', desc: 'Post, portrait, landscape, story, reel and profile sizes — configurable.', long: 'Crop/resize for Instagram: square post (1080), portrait (1080×1350), landscape (1080×566), story/reel (1080×1920) and profile circle (320). All presets stay editable because platforms change specs.', keywords: ['instagram', 'ig post', 'instagram story', 'ig resize', 'reel cover'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'youtube-resizer', name: 'YouTube Resizer', category: 'social-media', icon: 'monitor', desc: 'Thumbnail 1280×720, banner 2048×1152 and profile 800×800 presets.', long: 'Prepare YouTube assets: thumbnail (1280×720, under-2MB-friendly via quality control), channel banner (2048×1152 safe-area preview) and profile (800×800).', keywords: ['youtube thumbnail', 'channel art', 'banner', 'yt resize'], formats: ['jpg', 'png', 'webp'], batch: false, popular: true, status: 'ok' },
  { slug: 'facebook-resizer', name: 'Facebook Resizer', category: 'social-media', icon: 'globe', desc: 'Post, cover, profile and story presets with fit control.', long: 'Facebook-ready crops: feed post (1200×630), cover (820×312), profile (176 shown, 360+ export) and story (1080×1920) with cover/contain fit options.', keywords: ['facebook', 'fb cover', 'fb post', 'facebook resize'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'linkedin-resizer', name: 'LinkedIn Resizer', category: 'social-media', icon: 'bag', desc: 'Post, company cover and profile image presets.', long: 'LinkedIn crops: feed post (1200×627), company page cover (1128×191) and profile photo (400×400 export).', keywords: ['linkedin', 'linkedin banner', 'linkedin post'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'twitter-resizer', name: 'X / Twitter Resizer', category: 'social-media', icon: 'megaphone', desc: 'Post 16:9, header 1500×500 and profile 400×400 presets.', long: 'X (Twitter) crops: timeline post (1600×900), header banner (1500×500) and profile (400×400), with fit and fill controls.', keywords: ['twitter', 'x header', 'tweet image', 'twitter banner'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'pinterest-resizer', name: 'Pinterest Resizer', category: 'social-media', icon: 'bookmark', desc: 'Standard pin 1000×1500 (2:3) with zoom/pan fit control.', long: 'Pinterest pins at the recommended 2:3 ratio (1000×1500) with zoom/position control so the important part of your image always survives the crop.', keywords: ['pinterest', 'pin size', 'pin maker'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'whatsapp-resizer', name: 'WhatsApp Resizer', category: 'social-media', icon: 'smartphone', desc: 'Status 1080×1920 and profile 640×640 presets.', long: 'WhatsApp status (1080×1920) and profile picture (640×640) crops with zoom/pan and quality control to stay lean on mobile data.', keywords: ['whatsapp', 'status size', 'dp size', 'whatsapp dp'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'custom-social-resize', name: 'Custom Social Resize', category: 'social-media', icon: 'ruler', desc: 'Any platform, any size: exact dimensions with fit strategies.', long: 'A size-agnostic resizer for any platform: exact width/height, stretch/cover/contain strategies, background fill color and export format — because platforms change specs constantly.', keywords: ['custom size', 'any platform', 'social media size', 'resize for'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },

  // ===================== E-COMMERCE =====================
  { slug: 'product-image-resize', name: 'Product Image Resize', category: 'ecommerce', icon: 'ruler', desc: 'Square marketplace-ready sizes (1000/1600/2000 px) with white padding.', long: 'Resize product shots to marketplace-friendly squares (1000, 1600, 2000 px) with optional white padding and contain-fit — no stretched products.', keywords: ['product resize', 'marketplace size', 'square product image'], formats: ['jpg', 'png', 'webp'], batch: true, popular: true, status: 'ok' },
  { slug: 'product-image-compressor', name: 'Product Image Compressor', category: 'ecommerce', icon: 'package', desc: 'Compress catalog images in batch while keeping them crisp.', long: 'Batch-compress product catalogs with a quality sweet-spot default tuned for product photography, plus per-file results and ZIP download.', keywords: ['product compress', 'catalog optimize', 'ecommerce compress'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'product-shadow', name: 'Product Shadow', category: 'ecommerce', icon: 'circle', desc: 'Add realistic soft drop shadows beneath product cutouts.', long: 'Add soft, realistic drop shadows under products (works best on transparent cutouts): angle, distance, blur and opacity control.', keywords: ['product shadow', 'drop shadow', 'reflection'], formats: ['png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'marketplace-converter', name: 'Marketplace Converter', category: 'ecommerce', icon: 'bag', desc: 'Convert product images to marketplace-preferred formats in batch.', long: 'Convert whole batches to the format your channel prefers (JPG for most marketplaces; PNG where transparency matters) with sensible quality defaults — kept configurable, not hard-coded claims.', keywords: ['marketplace format', 'convert products', 'ecommerce converter'], formats: ['jpg', 'png', 'webp'], batch: true, popular: false, status: 'ok' },
  { slug: 'product-thumbnail', name: 'Product Thumbnail Maker', category: 'ecommerce', icon: 'grid', desc: 'Generate thumbnail sets (multiple sizes) from one product image.', long: 'Generate a full thumbnail set — 100/250/500 px grid thumbs plus a zoom-size image — from a single product photo, downloaded individually or as ZIP.', keywords: ['thumbnail maker', 'product thumbs', 'gallery sizes'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },

  // ===================== DEVELOPER TOOLS =====================
  { slug: 'image-to-base64', name: 'Image to Base64', category: 'developer-tools', icon: 'code', desc: 'Encode images as Base64 strings or data URIs, with size warnings.', long: 'Convert any image to a Base64 string or data URI, with a size advisory (data URIs cost ~33% overhead). Copy button included.', keywords: ['base64', 'data uri', 'encode', 'inline image', 'css background'], formats: ['jpg', 'png', 'webp', 'gif', 'svg'], batch: false, popular: true, status: 'ok' },
  { slug: 'base64-to-image', name: 'Base64 to Image', category: 'developer-tools', icon: 'code', desc: 'Decode Base64/data-URI text back into a downloadable image.', long: 'Paste Base64 or a data URI and get the decoded image back with preview, format detection and download.', keywords: ['base64 to image', 'decode base64', 'data uri to image'], formats: ['png', 'jpg', 'webp', 'gif'], batch: false, popular: false, status: 'ok' },
  { slug: 'svg-optimizer', name: 'SVG Optimizer', category: 'developer-tools', icon: 'code', desc: 'Minify SVGs: strip metadata, round numbers, remove comments.', long: 'Minify SVG markup: remove comments/metadata/editor cruft, collapse whitespace and round path numbers to reduce size — with before/after stats.', keywords: ['svg optimizer', 'minify svg', 'clean svg', 'svgo'], formats: ['svg'], batch: false, popular: false, status: 'ok' },
  { slug: 'svg-preview', name: 'SVG Preview', category: 'developer-tools', icon: 'eye', desc: 'Preview SVG code safely (sanitized) at multiple sizes.', long: 'Render SVG markup in a sanitized sandbox at 16–256 px sizes to check how icons scale, with light/dark background toggle.', keywords: ['svg preview', 'view svg', 'svg renderer'], formats: ['svg'], batch: false, popular: false, status: 'ok' },
  { slug: 'app-icon-generator', name: 'App Icon Generator', category: 'developer-tools', icon: 'smartphone', desc: 'Generate full iOS/Android icon size sets from one 1024 master.', long: 'Generate complete mobile icon sets (iOS sizes from 20 to 1024, Android launcher/mdpi→xxxhdpi) from one square master — downloaded as ZIP.', keywords: ['app icon', 'ios icons', 'android icons', 'icon set'], formats: ['png'], batch: false, popular: false, status: 'ok' },
  { slug: 'og-image-generator', name: 'OG Image Generator', category: 'developer-tools', icon: 'globe', desc: 'Compose 1200×630 social-share images with text over image or color.', long: 'Create Open Graph share images (1200×630): title/description text over your image or a solid/gradient background, with safe-zone preview.', keywords: ['og image', 'open graph', 'social preview', 'share image'], formats: ['jpg', 'png', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'placeholder-generator', name: 'Placeholder Generator', category: 'developer-tools', icon: 'grid', desc: 'Generate solid/gradient placeholder images at any size.', long: 'Create placeholder images (solid or two-color gradient, optional dimensions text) at any size — handy for mockups and tests.', keywords: ['placeholder image', 'dummy image', 'mockup image'], formats: ['png', 'jpg', 'webp'], batch: false, popular: false, status: 'ok' },
  { slug: 'dominant-color', name: 'Dominant Color Finder', category: 'developer-tools', icon: 'palette', desc: 'Extract the dominant color and full palette as HEX/RGB/CSS variables.', long: 'Compute the dominant color plus a ranked palette, output as HEX, RGB and ready-to-paste CSS custom properties.', keywords: ['dominant color', 'primary color', 'css variables', 'palette'], formats: ['jpg', 'png', 'webp', 'gif'], batch: false, popular: false, status: 'ok' },
  { slug: 'image-hash', name: 'Image Hash (pHash)', category: 'developer-tools', icon: 'hash', desc: 'Perceptual hash (64-bit pHash) for duplicate/similarity detection.', long: 'Compute a 64-bit perceptual hash (pHash) — similar images produce similar hashes, perfect for near-duplicate detection. Also shows MD5 of the file bytes.', keywords: ['perceptual hash', 'phash', 'duplicate detection', 'image fingerprint'], formats: ['jpg', 'png', 'webp', 'gif', 'bmp'], batch: true, popular: false, status: 'ok' },
  { slug: 'css-background-generator', name: 'CSS Background Generator', category: 'developer-tools', icon: 'layout', desc: 'Get CSS for your image: data-URI background, size and repeat rules.', long: 'Produce ready-to-paste CSS: data-URI background-image, background-size, position and repeat rules tuned for your target (icon, hero, tile).', keywords: ['css background', 'background image css', 'data uri css'], formats: ['jpg', 'png', 'webp', 'svg'], batch: false, popular: false, status: 'ok' }
]

// ---------- Search synonyms: user phrasing → tool slugs ----------
export const SYNONYMS = {
  'remove bg': ['ai-background-remover', 'transparent-background'],
  'remove background': ['ai-background-remover', 'transparent-background'],
  'delete background': ['transparent-background'],
  'make image smaller': ['compress-image', 'resize-image', 'resize-compress'],
  'change image size': ['resize-image', 'change-dimensions'],
  'make photo smaller': ['compress-image', 'resize-compress'],
  'shrink image': ['compress-image', 'resize-compress'],
  'shrink file': ['compress-image', 'target-file-size'],
  'under 100kb': ['target-file-size'],
  'file too big': ['compress-image', 'target-file-size', 'resize-compress'],
  'jpg': ['convert-image', 'jpg-to-png', 'png-to-jpg', 'compress-jpg'],
  'png': ['convert-image', 'png-to-jpg', 'jpg-to-png', 'compress-png'],
  'webp': ['convert-image', 'jpg-to-webp', 'webp-to-jpg'],
  'pdf': ['image-to-pdf'],
  'mirror': ['flip-image'],
  'turn': ['rotate-image'],
  'watermark': ['add-watermark', 'watermark-maker'],
  'caption': ['add-text', 'meme-generator'],
  'logo': ['add-watermark', 'watermark-maker'],
  ' passport': ['id-photo-maker'],
  'dp': ['whatsapp-resizer', 'profile-picture-maker'],
  'pfp': ['profile-picture-maker'],
  'thumbnail': ['youtube-resizer', 'product-thumbnail'],
  'favicon': ['favicon-generator'],
  'app icon': ['app-icon-generator', 'favicon-generator'],
  'metadata': ['metadata-viewer', 'remove-metadata'],
  'exif': ['exif-viewer', 'exif-remover'],
  'crop circle': ['profile-picture-maker', 'round-corners'],
  'circle crop': ['profile-picture-maker', 'round-corners'],
  'dark mode image': ['adjust-colors'],
  'photo to cartoon': ['cartoon-effect'],
  'cartoonize': ['cartoon-effect'],
  'blur photo': ['blur-image'],
  'pixelate': ['pixelate'],
  'black and white': ['grayscale'],
  'monochrome': ['grayscale'],
  'white background product': ['product-white-background'],
  'amazon': ['product-image-resize', 'product-white-background'],
  'shopify': ['product-image-resize', 'product-image-compressor'],
  'base64': ['image-to-base64', 'base64-to-image'],
  'stitch': ['merge-images'],
  'join images': ['merge-images'],
  'cut image': ['crop-image', 'split-image'],
  'instagram story size': ['instagram-resizer'],
  'youtube thumbnail size': ['youtube-resizer']
}

// ---------- Registry helpers ----------

export function getTool (slug) {
  return TOOLS.find(t => t.slug === slug)
}

export function toolsByCategory (categoryId) {
  return TOOLS.filter(t => t.category === categoryId)
}

export function popularTools () {
  return TOOLS.filter(t => t.popular)
}

export function featuredTools () {
  return TOOLS.filter(t => t.featured)
}

function normalize (str) {
  return String(str).toLowerCase().trim()
}

function levenshtein (a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  const m = a.length; const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

// Search across names, keywords, synonyms, descriptions, formats and categories.
// Typo-tolerant via Levenshtein on name words.
export function searchTools (query, { limit = 12 } = {}) {
  const q = normalize(query)
  if (!q) return []
  const words = q.split(/\s+/)
  const scored = new Map()

  const add = (tool, score) => {
    scored.set(tool.slug, Math.max(scored.get(tool.slug) || 0, score))
  }

  for (const tool of TOOLS) {
    const name = normalize(tool.name)
    let score = 0
    if (name === q) score = 120
    else if (name.startsWith(q)) score = 100
    else if (name.includes(q)) score = 80
    if (!score) {
      for (const kw of tool.keywords) {
        const k = normalize(kw)
        if (k === q) { score = Math.max(score, 90); break }
        if (k.includes(q) || q.includes(k)) score = Math.max(score, 70)
      }
    }
    if (!score) {
      for (const fmt of tool.formats) {
        if (q.includes(fmt) || fmt.includes(q)) { score = Math.max(score, 65); break }
      }
    }
    if (!score && normalize(tool.desc).includes(q)) score = 40
    if (!score) {
      // Word-level fallback: skip generic stopwords so queries like
      // "make image smaller" match on the distinctive words, not "image".
      const STOP = new Set(['image', 'images', 'photo', 'photos', 'img', 'picture', 'the', 'a', 'an', 'to', 'for', 'of', 'my', 'make', 'file', 'an'])
      for (const w of words) {
        if (STOP.has(w)) continue
        for (const nw of name.split(/\s+/)) {
          if (nw.startsWith(w)) score = Math.max(score, 55)
          else if (nw.length > 4 && w.length > 4 && levenshtein(nw, w) <= 2) score = Math.max(score, 45)
        }
      }
    }
    if (score) add(tool, score + (tool.popular ? 3 : 0) + (tool.featured ? 2 : 0))
  }

  for (const [phrase, slugs] of Object.entries(SYNONYMS)) {
    if (q.includes(normalize(phrase)) || normalize(phrase).includes(q)) {
      for (const slug of slugs) {
        const tool = getTool(slug)
        if (tool) add(tool, phrase === q ? 95 : 60)
      }
    }
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => getTool(slug))
}

export function relatedTools (tool, limit = 4) {
  return TOOLS
    .filter(t => t.slug !== tool.slug)
    .map(t => {
      let s = 0
      if (t.category === tool.category) s += 5
      const kwOverlap = t.keywords.filter(k => tool.keywords.includes(k)).length
      s += kwOverlap * 3
      const fmtOverlap = t.formats.filter(f => tool.formats.includes(f)).length
      s += fmtOverlap
      if (t.popular) s += 1
      return [t, s]
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([t]) => t)
}
