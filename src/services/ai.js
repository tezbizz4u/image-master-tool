// AI service integration layer.
//
// This module is the single integration point for AI-backed tools
// (upscaling, background removal via segmentation, inpainting, colorization,
// denoising, enhancement). By default NO provider is configured: every AI tool
// then reports itself as "integration-ready" instead of simulating results.
//
// To enable: implement AiProvider below and register it here, or set
// localStorage 'imt.aiEndpoint' to a POST {image: blob} -> {image: blob}
// compatible endpoint during development.

const LS_ENDPOINT = 'imt.aiEndpoint'

export const AI_TOOLS = {
  'ai-background-remover': {
    task: 'segmentation',
    label: 'Background removal (segmentation model)',
    localAlternative: { slug: 'transparent-background', label: 'Make Background Transparent (local color-key)' }
  },
  'ai-upscaler': {
    task: 'super-resolution',
    label: '2×/4× super-resolution',
    localAlternative: { slug: 'resize-image', label: 'Resize Image (high-quality smoothing)' }
  },
  'ai-enhancer': {
    task: 'restoration',
    label: 'Auto color/contrast/detail enhancement',
    localAlternative: { slug: 'adjust-colors', label: 'Adjust Colors (manual)' }
  },
  'ai-object-remover': {
    task: 'inpainting',
    label: 'Inpainting-based object removal',
    localAlternative: { slug: 'magic-eraser', label: 'Magic Eraser (manual brush)' }
  },
  'ai-colorize': {
    task: 'colorization',
    label: 'Black & white colorization',
    localAlternative: null
  },
  'ai-noise-reduction': {
    task: 'denoise',
    label: 'Learned denoising',
    localAlternative: { slug: 'noise-reduction', label: 'Noise Reduction (median filter, local)' }
  }
}

export function getProvider () {
  const endpoint = localStorage.getItem(LS_ENDPOINT)
  if (endpoint) {
    return {
      kind: 'endpoint',
      endpoint
    }
  }
  return null
}

export function isAvailable (toolSlug) {
  return getProvider() != null
}

// Runs the configured provider. Throws an AiUnavailableError when no provider
// is registered — callers must surface that honestly, never fake progress.
export async function runAi (toolSlug, imageBlob, onProgress = () => {}) {
  const provider = getProvider()
  if (!provider) {
    const err = new Error('AI_UNAVAILABLE')
    err.code = 'AI_UNAVAILABLE'
    throw err
  }
  onProgress({ stage: 'uploading' })
  const form = new FormData()
  form.append('image', imageBlob)
  form.append('task', AI_TOOLS[toolSlug]?.task || 'generic')
  const res = await fetch(provider.endpoint, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`AI_ENDPOINT_ERROR_${res.status}`)
  const blob = await res.blob()
  onProgress({ stage: 'done' })
  return blob
}

export class AiUnavailableError extends Error {
  constructor () {
    super('AI_UNAVAILABLE')
    this.code = 'AI_UNAVAILABLE'
  }
}
