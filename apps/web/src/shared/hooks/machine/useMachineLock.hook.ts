import type { VmStatus } from '@peerfall/machine/types'
import type { MachineLock } from '@shared/types'
import { machineLockOf } from '@shared/utils/machine'
import { useState } from 'react'

/** Whether the terminal and Apply must wait for the Machine, and why; null while the shell is at its prompt. */
export function useMachineLock(status: VmStatus): MachineLock | null {
  const [seenReady, setSeenReady] = useState(status.phase === 'ready')
  if (status.phase === 'ready' && !seenReady) {
    setSeenReady(true)
  }
  return machineLockOf(status, seenReady)
}
