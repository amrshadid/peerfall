import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiveJudge } from '#utils/run/live-judge.util'

describe('live judging', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  /** A judging that takes `ms` and counts how often it started and how many ran at once. */
  function slowRun(ms: number) {
    const seen = { started: 0, atOnce: 0, most: 0 }
    const run = async () => {
      seen.started++
      seen.atOnce++
      seen.most = Math.max(seen.most, seen.atOnce)
      await new Promise((resolve) => setTimeout(resolve, ms))
      seen.atOnce--
    }
    return { seen, run }
  }

  it('waits for the typing to pause, then judges once', async () => {
    const { seen, run } = slowRun(10)
    const judge = createLiveJudge(run)
    judge.request(400)
    await vi.advanceTimersByTimeAsync(300)
    judge.request(400)
    await vi.advanceTimersByTimeAsync(300)
    expect(seen.started).toBe(0)
    await vi.advanceTimersByTimeAsync(200)
    expect(seen.started).toBe(1)
  })

  it('never judges twice at once: a request during a judging gives one more after it', async () => {
    const { seen, run } = slowRun(2000)
    const judge = createLiveJudge(run)
    judge.request(0)
    await vi.advanceTimersByTimeAsync(10)
    for (const _ of [1, 2, 3]) {
      judge.request(0)
      await vi.advanceTimersByTimeAsync(10)
    }
    expect(seen.started).toBe(1)
    await vi.advanceTimersByTimeAsync(5000)
    expect(seen.started).toBe(2)
    expect(seen.most).toBe(1)
  })

  it('forgets a request that was cancelled', async () => {
    const { seen, run } = slowRun(10)
    const judge = createLiveJudge(run)
    judge.request(400)
    judge.cancel()
    await vi.advanceTimersByTimeAsync(1000)
    expect(seen.started).toBe(0)
  })
})
