// Promise-based Web Worker client with round-robin pool (default 2 workers)
// so long operations don't queue behind previews.

let workers = []
let rr = 0
const pending = new Map()
let idCounter = 1

function ensureWorkers () {
  if (workers.length) return workers
  const n = Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 4) - 2))
  for (let i = 0; i < n; i++) {
    const w = new Worker(new URL('../workers/image.js', import.meta.url), { type: 'module' })
    w.onmessage = (e) => {
      const { id, ok, result, error } = e.data
      const p = pending.get(id)
      if (!p) return
      pending.delete(id)
      if (ok) p.resolve(result)
      else p.reject(new Error(error))
    }
    workers.push(w)
  }
  return workers
}

export function runWorker (op, payload, transfer = []) {
  const w = ensureWorkers()[rr++ % workers.length]
  const id = idCounter++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, op, payload }, transfer)
  })
}

export function terminateWorkers () {
  for (const w of workers) w.terminate()
  workers = []
  pending.clear()
}
