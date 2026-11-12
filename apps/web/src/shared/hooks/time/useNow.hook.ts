import { useEffect, useState } from 'react'

// Labels change at minute granularity at most, so a per-second tick would only re-render.
const DEFAULT_TICK_MS = 15_000

export function useNow(tickMs = DEFAULT_TICK_MS): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs)
    return () => window.clearInterval(id)
  }, [tickMs])
  return now
}
