import type { MapNote, MapNotes, MapNoteTarget } from '@features/map/types'
import { noteOf, sameTarget } from '@features/map/utils/note'
import type { ChapterId } from '@peerfall/game/types'
import { useCallback, useState } from 'react'

export interface UseMapNoteResult {
  /** What the pointer or focus is on, else the stage in view. */
  readonly note: MapNote | undefined
  /** null when the pointer leaves. */
  readonly point: (target: MapNoteTarget | null) => void
  /** null on blur. */
  readonly focus: (target: MapNoteTarget | null) => void
}

interface Targets {
  readonly pointer: MapNoteTarget | null
  readonly focus: MapNoteTarget | null
  /** Whichever moved last wins, so a keyboard user isn't overruled by a resting mouse. */
  readonly latest: 'pointer' | 'focus'
}

const NONE: Targets = { pointer: null, focus: null, latest: 'pointer' }

export function useMapNote(notes: MapNotes, inView: ChapterId | null): UseMapNoteResult {
  const [targets, setTargets] = useState(NONE)

  // Stable and a no-op for the same target, so pointer moves neither re-render nor redraw.
  const point = useCallback(
    (target: MapNoteTarget | null) =>
      setTargets((current) =>
        sameTarget(current.pointer, target)
          ? current
          : { ...current, pointer: target, latest: target === null ? current.latest : 'pointer' }
      ),
    []
  )
  const focus = useCallback(
    (target: MapNoteTarget | null) =>
      setTargets((current) =>
        sameTarget(current.focus, target) ? current : { ...current, focus: target, latest: 'focus' }
      ),
    []
  )

  const first = targets.latest === 'focus' ? targets.focus : targets.pointer
  const second = targets.latest === 'focus' ? targets.pointer : targets.focus
  return { note: noteOf(first ?? second, notes, inView), point, focus }
}
