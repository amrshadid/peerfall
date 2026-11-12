import { type KeyboardEvent, useCallback, useRef } from 'react'

const NEXT_KEYS: readonly string[] = ['ArrowRight', 'ArrowDown']
const PREVIOUS_KEYS: readonly string[] = ['ArrowLeft', 'ArrowUp']

export interface RouterFocus {
  /** Remembers each router's button, so a key can move focus to it. */
  readonly register: (name: string) => (element: HTMLButtonElement | null) => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
}

/** Arrow keys walk the routers in the network's order and wrap; Home and End jump to its ends. Tab still reaches each one. */
export function useRouterFocus(names: readonly string[]): RouterFocus {
  const buttons = useRef(new Map<string, HTMLButtonElement>())

  const register = useCallback(
    (name: string) => (element: HTMLButtonElement | null) => {
      if (element) {
        buttons.current.set(name, element)
      } else {
        buttons.current.delete(name)
      }
    },
    []
  )

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const current = names.findIndex((name) => buttons.current.get(name) === document.activeElement)
      if (current === -1 || names.length === 0) {
        return
      }
      let next: number
      if (NEXT_KEYS.includes(event.key)) {
        next = (current + 1) % names.length
      } else if (PREVIOUS_KEYS.includes(event.key)) {
        next = (current - 1 + names.length) % names.length
      } else if (event.key === 'Home') {
        next = 0
      } else if (event.key === 'End') {
        next = names.length - 1
      } else {
        return
      }
      event.preventDefault()
      const name = names[next]
      if (name !== undefined) {
        buttons.current.get(name)?.focus()
      }
    },
    [names]
  )

  return { register, onKeyDown }
}
