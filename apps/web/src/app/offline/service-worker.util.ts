import { logger } from '@peerfall/core/utils'

// SW_FILE, written out: importing the worker's constants would make the build share a chunk with it.
export const SERVICE_WORKER_FILE = 'sw.js'

// SW_WARM_MESSAGE, written out for the same reason.
export const WARM_IMAGE_MESSAGE = 'peerfall:warm-vm-image'

/** The part of `navigator` registration needs, so tests can pass their own. */
export interface ServiceWorkerHost {
  readonly serviceWorker?: {
    register(url: string, options: { scope: string }): Promise<unknown>
    readonly controller?: { postMessage(message: unknown): void } | null
  }
}

/**
 * Asks the offline worker to cache the rest of the Linux image in the background, so missions not
 * played yet start offline too. Sent once a network is up, never while the Machine boots, which
 * needs the bandwidth. Without a worker (development, or no support) it does nothing.
 */
export function warmOfflineImage(host: ServiceWorkerHost = navigator): void {
  host.serviceWorker?.controller?.postMessage(WARM_IMAGE_MESSAGE)
}

// A failed registration only costs offline play, so it's logged, never shown.
export async function registerServiceWorker(base: string, host: ServiceWorkerHost = navigator): Promise<boolean> {
  if (!host.serviceWorker) {
    return false
  }
  try {
    await host.serviceWorker.register(`${base}${SERVICE_WORKER_FILE}`, { scope: base })
    return true
  } catch (error) {
    logger.warn('The offline worker did not register; the game needs the network to start.', error)
    return false
  }
}
