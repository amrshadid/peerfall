import { useAppStore } from '@app/store'
import type { ShortcutId } from '@shared/types'
import { useEffect, useRef } from 'react'

export function useShortcut(id: ShortcutId, handler: () => void, enabled = true): void {
  // The latest handler runs without re-registering, so a screen re-rendering never loses its key.
  const latest = useRef(handler)
  latest.current = handler

  useEffect(() => {
    if (!enabled) {
      return
    }
    const run = () => latest.current()
    const { registerShortcut, unregisterShortcut } = useAppStore.getState()
    registerShortcut(id, run)
    return () => unregisterShortcut(id, run)
  }, [id, enabled])
}
