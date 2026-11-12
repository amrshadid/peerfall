// @vitest-environment jsdom
import type { VmStatus } from '@peerfall/machine/types'
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useMachineLock } from './useMachineLock.hook'

afterEach(cleanup)

const status = (phase: VmStatus['phase']): VmStatus => ({ phase, detail: null })

describe('useMachineLock', () => {
  it('locks until the Machine is ready, then remembers it has been', () => {
    const { result, rerender } = renderHook(({ current }) => useMachineLock(current), {
      initialProps: { current: status('setting-up') },
    })
    expect(result.current?.holdsKeys).toBe(false)

    rerender({ current: status('ready') })
    expect(result.current).toBeNull()

    // A second mission's setup: the shell exists now, so the keys wait for it.
    rerender({ current: status('setting-up') })
    expect(result.current?.holdsKeys).toBe(true)
  })
})
