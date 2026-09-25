// Preset canvas sizes. Platforms change specs constantly, so these are data,
// not hard-coded claims — every preset stays editable in the UI.

export const SOCIAL_PRESETS = {
  instagram: [
    { id: 'ig-post', label: 'Square Post', width: 1080, height: 1080 },
    { id: 'ig-portrait', label: 'Portrait Post', width: 1080, height: 1350 },
    { id: 'ig-landscape', label: 'Landscape Post', width: 1080, height: 566 },
    { id: 'ig-story', label: 'Story', width: 1080, height: 1920 },
    { id: 'ig-reel', label: 'Reel Cover', width: 1080, height: 1920 },
    { id: 'ig-profile', label: 'Profile Picture', width: 320, height: 320 }
  ],
  youtube: [
    { id: 'yt-thumb', label: 'Video Thumbnail', width: 1280, height: 720 },
    { id: 'yt-banner', label: 'Channel Banner', width: 2048, height: 1152 },
    { id: 'yt-profile', label: 'Profile Image', width: 800, height: 800 }
  ],
  facebook: [
    { id: 'fb-post', label: 'Feed Post', width: 1200, height: 630 },
    { id: 'fb-cover', label: 'Page Cover', width: 820, height: 312 },
    { id: 'fb-profile', label: 'Profile Image', width: 360, height: 360 },
    { id: 'fb-story', label: 'Story', width: 1080, height: 1920 }
  ],
  linkedin: [
    { id: 'li-post', label: 'Feed Post', width: 1200, height: 627 },
    { id: 'li-cover', label: 'Company Cover', width: 1128, height: 191 },
    { id: 'li-profile', label: 'Profile Image', width: 400, height: 400 }
  ],
  x: [
    { id: 'x-post', label: 'Timeline Post', width: 1600, height: 900 },
    { id: 'x-header', label: 'Header Banner', width: 1500, height: 500 },
    { id: 'x-profile', label: 'Profile Image', width: 400, height: 400 }
  ],
  pinterest: [
    { id: 'pin-standard', label: 'Standard Pin (2:3)', width: 1000, height: 1500 },
    { id: 'pin-square', label: 'Square Pin', width: 1000, height: 1000 }
  ],
  whatsapp: [
    { id: 'wa-status', label: 'Status', width: 1080, height: 1920 },
    { id: 'wa-profile', label: 'Profile Image', width: 640, height: 640 }
  ]
}

export const MARKETPLACE_PRESETS = [
  { id: 'square-1000', label: 'Square 1000 px', width: 1000, height: 1000, bg: '#ffffff' },
  { id: 'square-1600', label: 'Square 1600 px', width: 1600, height: 1600, bg: '#ffffff' },
  { id: 'square-2000', label: 'Square 2000 px', width: 2000, height: 2000, bg: '#ffffff' },
  { id: 'wide-2000', label: 'Wide 2000×1500', width: 2000, height: 1500, bg: '#ffffff' }
]

export const ID_SIZES = [
  { id: 'passport-35x45', label: 'Passport 35×45 mm', mmW: 35, mmH: 45, px: { w: 413, h: 531 } },
  { id: 'us-2x2', label: 'US 2×2 in', mmW: 50.8, mmH: 50.8, px: { w: 600, h: 600 } },
  { id: 'visa-35x45', label: 'Visa 35×45 mm', mmW: 35, mmH: 45, px: { w: 413, h: 531 } },
  { id: 'chinese-33x48', label: 'China 33×48 mm', mmW: 33, mmH: 48, px: { w: 390, h: 567 } }
]

export const APP_ICON_SIZES_IOS = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024]
export const APP_ICON_SIZES_ANDROID = [36, 48, 72, 96, 144, 192, 512]
export const FAVICON_SIZES = [16, 32, 48]
export const PWA_ICON_SIZES = [192, 512]
export const APPLE_TOUCH_SIZE = 180
