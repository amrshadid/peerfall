/** Runs live judging when asked, one at a time, after things have been quiet for a moment. */
export interface LiveJudge {
  /**
   * Asks for a judging `delayMs` from now; a later request moves it later. A request while one
   * runs gives one more run after it, never two at once.
   */
  readonly request: (delayMs: number) => void
  /** Forgets what was asked and not started yet. One that already runs finishes. */
  readonly cancel: () => void
}

/**
 * Commands typed quickly each ask for a judging: they collapse into one read of the Machine once
 * the typing pauses, and a read is never started while another is still running.
 */
export function createLiveJudge(run: () => Promise<void>): LiveJudge {
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let again = false
  const start = async () => {
    timer = null
    if (running) {
      again = true
      return
    }
    running = true
    try {
      await run()
    } finally {
      running = false
      if (again) {
        again = false
        void start()
      }
    }
  }
  return {
    request: (delayMs) => {
      if (timer !== null) {
        clearTimeout(timer)
      }
      timer = setTimeout(() => void start(), delayMs)
    },
    cancel: () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      again = false
    },
  }
}
