import { CLARITY_DENIED, CLARITY_GRANTED, CLARITY_SCRIPT_ID, CLARITY_TAG_URL } from './clarity.constants'

type ClarityCall = ((command: string, ...args: unknown[]) => void) & { q?: unknown[][] }

/** `clarity` is Clarity's global: a queue until its tag loads, then the real API. */
export interface ClarityWindow {
  clarity?: ClarityCall
}

/** Whether this page has the tag; a page whose player never allowed it never has it. */
export function isClarityLoaded(doc: Document): boolean {
  return doc.getElementById(CLARITY_SCRIPT_ID) !== null
}

// Same as Clarity's official snippet: calls made before the tag arrives wait in `clarity.q`.
function clarityOf(win: ClarityWindow): ClarityCall {
  if (!win.clarity) {
    const queue: ClarityCall = (...args) => {
      queue.q = queue.q ?? []
      queue.q.push(args)
    }
    win.clarity = queue
  }
  return win.clarity
}

/** Adds the tag once and grants analytics storage only; called only after the player allows it. */
export function startClarity(id: string, win: ClarityWindow, doc: Document): void {
  const clarity = clarityOf(win)
  if (!isClarityLoaded(doc)) {
    const script = doc.createElement('script')
    script.id = CLARITY_SCRIPT_ID
    script.async = true
    script.src = `${CLARITY_TAG_URL}${encodeURIComponent(id)}`
    doc.head.appendChild(script)
  }
  clarity('consentv2', CLARITY_GRANTED)
}

/** Withdraws consent and stops recording; a page without the tag has nothing to stop. */
export function stopClarity(win: ClarityWindow, doc: Document): void {
  if (!isClarityLoaded(doc)) {
    return
  }
  const clarity = clarityOf(win)
  // Denied alone would keep recording without cookies; stop ends the recording for this page.
  clarity('consentv2', CLARITY_DENIED)
  clarity('stop')
}
