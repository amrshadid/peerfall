import { describe, expect, it } from 'vitest'
import type { StampedMachineEvent } from '#types/definitions/event'
import { applyEventUpdate, EMPTY_EVENT_LOG } from '#utils/events/event-order.util'

const reply = (seq: number, timeMs: number): StampedMachineEvent => ({
  type: 'probe_received',
  probe: 'direct',
  sequence: seq,
  rttMs: 0.4,
  seq,
  timeMs,
})
const seqs = (events: readonly StampedMachineEvent[]) => events.map((event) => event.seq)

describe('the event log', () => {
  it('keeps events in the order they arrived and in the order they happened', () => {
    // A log line (seq 2) that was written before the two replies that arrived ahead of it.
    const log = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [reply(0, 100), reply(1, 150), reply(2, 120)] })
    expect(seqs(log.received)).toEqual([0, 1, 2])
    expect(seqs(log.events)).toEqual([0, 2, 1])
  })

  it('orders events with the same time by arrival', () => {
    const log = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [reply(0, 100), reply(1, 100), reply(2, 100)] })
    expect(seqs(log.events)).toEqual([0, 1, 2])
  })

  it('adds a later update after what it holds', () => {
    const first = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [reply(0, 100), reply(1, 200)] })
    const second = applyEventUpdate(first, { from: 2, events: [reply(2, 150), reply(3, 300)] })
    expect(seqs(second.received)).toEqual([0, 1, 2, 3])
    expect(seqs(second.events)).toEqual([0, 2, 1, 3])
  })

  it('drops what happened after the moment the Machine went back to', () => {
    const before = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [reply(0, 100), reply(1, 300), reply(2, 200)] })
    const restored = applyEventUpdate(before, { from: 1, events: [] })
    expect(seqs(restored.received)).toEqual([0])
    expect(seqs(restored.events)).toEqual([0])
    const again = applyEventUpdate(restored, { from: 1, events: [reply(1, 110)] })
    expect(seqs(again.events)).toEqual([0, 1])
  })

  it('returns the same log when an update changes nothing', () => {
    const log = applyEventUpdate(EMPTY_EVENT_LOG, { from: 0, events: [reply(0, 100)] })
    expect(applyEventUpdate(log, { from: 1, events: [] })).toBe(log)
  })
})
