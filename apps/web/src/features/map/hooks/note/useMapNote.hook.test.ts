// @vitest-environment jsdom

import type { MapNote, MapNotes } from '@features/map/types'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMapNote } from './useMapNote.hook'

const note = (title: string): MapNote => ({ title, text: '', facts: [] })

const NOTES: MapNotes = {
  stops: new Map([
    ['a', note('Stop A')],
    ['b', note('Stop B')],
  ]),
  regions: new Map(),
  chapters: new Map([
    ['first-router', note('First router')],
    ['exchange-routes', note('Exchange routes')],
  ]),
}

describe('useMapNote', () => {
  it('shows the stage in view until something is pointed at or focused', () => {
    const hook = renderHook(() => useMapNote(NOTES, 'first-router'))
    expect(hook.result.current.note?.title).toBe('First router')
    act(() => hook.result.current.point({ kind: 'chapter', id: 'exchange-routes' }))
    expect(hook.result.current.note?.title).toBe('Exchange routes')
    act(() => hook.result.current.point(null))
    expect(hook.result.current.note?.title).toBe('First router')
  })

  it('lets the last of pointer and focus win, and falls back to the other', () => {
    const hook = renderHook(() => useMapNote(NOTES, 'first-router'))
    act(() => hook.result.current.point({ kind: 'stop', key: 'a' }))
    act(() => hook.result.current.focus({ kind: 'stop', key: 'b' }))
    expect(hook.result.current.note?.title).toBe('Stop B')
    act(() => hook.result.current.point({ kind: 'chapter', id: 'exchange-routes' }))
    expect(hook.result.current.note?.title).toBe('Exchange routes')
    act(() => hook.result.current.point(null))
    expect(hook.result.current.note?.title).toBe('Stop B')
    act(() => hook.result.current.focus(null))
    expect(hook.result.current.note?.title).toBe('First router')
  })

  it('keeps its callbacks, so the memoized drawing never redraws for a note', () => {
    const hook = renderHook(() => useMapNote(NOTES, 'first-router'))
    const { point, focus } = hook.result.current
    act(() => point({ kind: 'stop', key: 'a' }))
    act(() => focus({ kind: 'stop', key: 'b' }))
    expect(hook.result.current.point).toBe(point)
    expect(hook.result.current.focus).toBe(focus)
  })
})
