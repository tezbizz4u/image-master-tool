# IMAGE MASTER TOOL

All your image tools in one place — a fast, private, browser-based image utility + editor platform.

**111 tools** across 11 categories: Quick Tools, a full layer-based Editor, Converters (JPG/PNG/WebP/AVIF/GIF/SVG/ICO), Compress & Optimize, Effects & Filters, Background Tools, Design Tools, Social Media presets, E-commerce, and Developer Tools — plus honestly-labeled integration-ready AI tools.

Every operation runs **locally in your browser**. No uploads, no accounts, no tracking of your images.

## Highlights

- **100% client-side** — images never leave your device
- **Universal upload** — drag & drop, paste, or browse; batch support with ZIP download
- **Real processing engine** — Web Worker-powered effects, pixel-verified tools
- **Honest AI** — integration-ready architecture, clearly labeled; no fake features
- **Instant search** with synonyms (`remove bg` → Remove Background)
- **Dark mode**, recents, favorites — stored locally only

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build
```

## Tech

Vite · Vanilla JS (ES modules) · Canvas 2D · Web Workers · JSZip (only runtime dependency)

## Privacy

Processing happens entirely in your browser using Canvas and WebCodecs APIs. Your images are never uploaded to any server. Preferences (theme, favorites, recents) are stored in localStorage on your device only.
