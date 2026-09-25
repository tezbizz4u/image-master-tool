// AI tools panel. Honesty policy (spec §39): when no AI backend is configured,
// tools show exactly what's needed and offer working local alternatives.
// Nothing is simulated — no fake progress bars, no placeholder results.
import { el } from '../core/utils.js'
import { icon } from '../core/icons.js'
import { AI_TOOLS, isAvailable, runAi, getProvider } from '../services/ai.js'
import { getTool } from '../data/registry.js'
import { toolCard } from '../components/tool-card.js'

export function aiToolPanel (tool) {
  const available = isAvailable(tool.slug)
  const meta = AI_TOOLS[tool.slug] || { label: tool.name, task: 'generic' }
  const alt = meta.localAlternative ? getTool(meta.localAlternative.slug) : null

  const statusBadge = available
    ? el('span', { class: 'badge batch', text: 'BACKEND CONNECTED' })
    : el('span', { class: 'badge pop', text: 'BACKEND REQUIRED' })

  const root = el('div')

  root.append(
    el('div', { class: 'tool-layout' },
      el('div', {},
        el('div', { class: 'panel' },
          el('div', { class: 'panel-title' },
            el('h2', { text: 'Processing' }),
            statusBadge
          ),
          available ? connectedUI(tool) : notConnectedUI(tool, meta, alt)
        )
      ),
      el('div', { class: 'tool-side' },
        el('div', { class: 'panel' },
          el('h2', {}, icon('info', 15), ' What this tool needs'),
          el('p', { class: 'muted mt-1', text: `Task type: ${meta.task}. ${available ? 'A model endpoint is configured in services/ai.js — your image will be sent there for processing and deleted after.' : 'A segmentation/generation model endpoint (self-hosted or API) must be registered in services/ai.js. Until then this tool stays disabled instead of pretending to work.'} ` })
        ),
        alt && el('div', { class: 'panel' },
          el('h2', { text: 'Works right now' }),
          el('p', { class: 'muted mb-2', text: `A local, non-AI alternative is fully functional today:` }),
          toolCard(alt, { showCategory: false })
        )
      )
    )
  )
  return root
}

function notConnectedUI (tool, meta, alt) {
  return el('div', {},
    el('div', { class: 'warn-box', text: 'This AI tool is integration-ready but has no model backend connected, so it is disabled. We don\'t simulate AI results — you\'ll never see a fake progress bar or a placeholder "enhanced" image here.' }),
    el('h2', { class: 'mt-3', text: 'How to enable it' }),
    el('div', { class: 'steps mt-2' },
      el('div', { class: 'step' }, el('div', {}, el('b', { text: 'Choose a provider' }), el('p', { text: 'Self-hosted (e.g. rembg, Real-ESRGAN, LaMa) or any HTTP API that accepts an image and returns one.' }))),
      el('div', { class: 'step' }, el('div', {}, el('b', { text: 'Register the endpoint' }), el('p', { text: 'In src/services/ai.js, implement getProvider() to return your endpoint URL (or set localStorage "imt.aiEndpoint" while developing).' }))),
      el('div', { class: 'step' }, el('div', {}, el('b', { text: 'The tool goes live' }), el('p', { text: 'Upload, progress and download use the same pipeline as every other tool. Until then, this page stays honest about being offline.' })))
    ),
    alt && el('div', { class: 'mt-3' },
      el('a', { class: 'btn btn-soft', href: `#/t/${alt.slug}` }, icon('zap', 15), `Use ${alt.name} now`))
  )
}

function connectedUI (tool) {
  const out = el('div')
  let blob = null
  const zone = el('div', { id: 'ai-zone' })
  import('../components/upload.js').then(({ createUploadZone }) => {
    zone.replaceChildren(createUploadZone({
      compact: true,
      label: 'Drop an image to process',
      sub: 'it will be sent to the configured model endpoint',
      onFiles: async (files) => {
        status.textContent = 'Uploading to model endpoint…'
        try {
          blob = await runAi(tool.slug, files[0], (p) => {
            status.textContent = p.stage === 'uploading' ? 'Uploading to model endpoint…' : 'Processing…'
          })
          status.textContent = 'Done — result ready below.'
          const url = URL.createObjectURL(blob)
          preview.replaceChildren(el('img', { src: url, alt: 'AI result', style: { maxWidth: '100%', borderRadius: '10px' } }))
          dl.disabled = false
        } catch (e) {
          status.textContent = 'The model endpoint couldn\'t process this image. Check the endpoint configuration in services/ai.js.'
        }
      }
    }))
  })
  const preview = el('div', { class: 'preview-box checker-bg mt-2' })
  const status = el('p', { class: 'muted mt-2', text: 'Waiting for an image.' })
  const dl = el('button', { class: 'btn btn-primary mt-2', disabled: true, onclick: () => blob && import('../core/utils.js').then(({ download }) => download(blob, `${tool.slug}-result.png`)) }, icon('download', 15), 'Download result')
  out.append(zone, status, preview, dl)
  return out
}

export function cleanup () { /* nothing persistent */ }
