import { useEffect, useRef } from 'react'
import { useVmStore } from '#store/vm.store'

/**
 * How many commands the player has finished at the terminal since the Machine started: each
 * return to a bash or vtysh prompt after an Enter. Only grows; a change means a command finished.
 */
export function useCommandsFinished(): number {
  return useVmStore((state) => state.commandsFinished)
}

/**
 * Calls `onFinished` each time a command the player typed has finished: the terminal is back at a
 * bash or vtysh prompt (`a:~# `, `a# `, `a(config-if)# `) after an Enter. `count` is the total so
 * far; several commands typed ahead of a running one may arrive as one call.
 */
export function useCommandFinished(onFinished: (count: number) => void): void {
  const latest = useRef(onFinished)
  latest.current = onFinished
  useEffect(
    () =>
      useVmStore.subscribe((state, previous) => {
        if (state.commandsFinished > previous.commandsFinished) {
          latest.current(state.commandsFinished)
        }
      }),
    []
  )
}
