import { useEffect } from 'react'

const PRIMARY_SELECTOR = '[data-primary]'

// Only while nothing but the page or its heading has focus, so a focused control keeps its own Enter.
export function useEnterActivatesPrimary(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const idle = document.activeElement === document.body || document.activeElement?.tagName === 'H1'
      if (event.key === 'Enter' && idle) {
        document.querySelector<HTMLElement>(PRIMARY_SELECTOR)?.click()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
