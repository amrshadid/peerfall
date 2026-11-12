import { SW_FILE } from '@shared/utils/offline'
import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker, SERVICE_WORKER_FILE } from './service-worker.util'

describe('registerServiceWorker', () => {
  it("registers the build's worker for the app's base", async () => {
    const register = vi.fn(async () => ({}))
    await expect(registerServiceWorker('/peerfall/', { serviceWorker: { register } })).resolves.toBe(true)
    expect(register).toHaveBeenCalledWith('/peerfall/sw.js', { scope: '/peerfall/' })
  })

  it('does nothing where browsers have no service workers, and survives a refusal', async () => {
    await expect(registerServiceWorker('/', {})).resolves.toBe(false)
    const register = vi.fn(async () => {
      throw new Error('insecure context')
    })
    await expect(registerServiceWorker('/', { serviceWorker: { register } })).resolves.toBe(false)
  })

  it('names the file the build writes', () => {
    expect(SERVICE_WORKER_FILE).toBe(SW_FILE)
  })
})
