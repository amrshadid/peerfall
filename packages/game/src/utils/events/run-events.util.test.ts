import { describe, expect, it } from 'vitest'
import { bfdBothEndsRun, FAULT_AT_MS, stamped } from '#test/index'
import { duringFault, eventsOf, faultWindow, inTimeOrder, probeReplies } from '#utils/events/run-events.util'

const FAULT = { link: ['a', 'c'] } as const

describe('inTimeOrder', () => {
  it("sorts by the Machine's clock: a log line arrives after later route and probe lines", () => {
    const events = bfdBothEndsRun()
    const arrivedLate = events.some((event, at) => (events[at + 1]?.timeMs ?? Number.POSITIVE_INFINITY) < event.timeMs)
    expect(arrivedLate).toBe(true)

    const times = inTimeOrder(events).map((event) => event.timeMs)
    expect(times).toEqual([...times].sort((first, second) => first - second))
    expect(events.map((event) => event.seq)).toEqual(events.map((_, at) => at))
  })

  it('keeps arrival order between events of the same moment', () => {
    const [first, second] = stamped([
      { type: 'probe_lost', probe: 'p', sequence: 1, atMs: 0 },
      { type: 'probe_lost', probe: 'p', sequence: 2, atMs: 0 },
    ])
    const ordered = inTimeOrder([second, first].flatMap((event) => (event ? [event] : [])))
    expect(ordered.map((event) => event.seq)).toEqual([0, 1])
  })
})

describe('faultWindow', () => {
  it('is null until the link is faulted', () => {
    expect(faultWindow([], FAULT)).toBeNull()
    expect(faultWindow(stamped([{ type: 'fault_injected', link: ['a', 'b'], atMs: 0 }]), FAULT)).toBeNull()
  })

  it('opens at the fault and closes when it is cleared', () => {
    const open = stamped([{ type: 'fault_injected', link: ['a', 'c'], atMs: 0 }])
    expect(faultWindow(open, FAULT)).toEqual({ atMs: FAULT_AT_MS, clearedAtMs: null })

    const window = faultWindow(
      stamped([
        { type: 'fault_injected', link: ['a', 'c'], atMs: 0 },
        { type: 'fault_cleared', link: ['a', 'c'], atMs: 4000 },
      ]),
      FAULT
    )
    expect(window).toEqual({ atMs: FAULT_AT_MS, clearedAtMs: FAULT_AT_MS + 4000 })
    expect(window && duringFault(window, FAULT_AT_MS)).toBe(false)
    expect(window && duringFault(window, FAULT_AT_MS + 4000)).toBe(true)
    expect(window && duringFault(window, FAULT_AT_MS + 4001)).toBe(false)
  })
})

describe('reading events by type', () => {
  it('narrows to one type, and to one probe', () => {
    const events = stamped([
      { type: 'probe_received', probe: 'a-to-c', sequence: 2, rttMs: 1, atMs: 50 },
      { type: 'probe_received', probe: 'b-to-c', sequence: 1, rttMs: 1, atMs: 20 },
      { type: 'probe_received', probe: 'a-to-c', sequence: 1, rttMs: 1, atMs: 0 },
      { type: 'probe_lost', probe: 'a-to-c', sequence: 3, atMs: 150 },
    ])
    expect(eventsOf(events, 'probe_lost').map((event) => event.sequence)).toEqual([3])
    expect(probeReplies(events, 'a-to-c').map((event) => event.sequence)).toEqual([1, 2])
  })
})
