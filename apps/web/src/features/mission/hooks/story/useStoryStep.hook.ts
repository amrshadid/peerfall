import type { GuideStepId } from '@features/guide/types'
import { useCallback, useEffect, useState } from 'react'

/** The steps played on the network, between the scene and the debrief. */
type PlayStep = 'see' | 'build' | 'watch'

export interface StoryStepInput {
  /** Names the mission's run; a new one starts its story over. */
  readonly key: string
  /** The game's phase: the scene is read before the mission begins, the debrief after it is shown. */
  readonly phase: 'incident' | 'play' | 'debrief'
  /** The objectives are all met right now. */
  readonly passed: boolean
  /** Build it's transcript has been shown to its end in this run. */
  readonly buildRead: boolean
}

export interface UseStoryStepResult {
  readonly step: GuideStepId
  /** A done step looked back at; null on the current one. */
  readonly reviewing: GuideStepId | null
  /** Looks back at a step, or returns from it when it is already shown. */
  readonly toggleReview: (step: GuideStepId) => void
  readonly review: (step: GuideStepId | null) => void
  /** Moves between the steps played on the network. */
  readonly goTo: (step: PlayStep) => void
}

interface State {
  readonly key: string
  readonly play: PlayStep
  readonly reviewing: GuideStepId | null
}

/**
 * Where the player is in the mission's story. The game keeps the scene and the debrief (its
 * phases); See it, Build it and Watch it are this screen's, and Build it gives way to Watch it by
 * itself once every objective is met, as Kernelfall's does. Not before Build it has been read to its
 * end, though: an objective met by its first command would skip everything Build it shows after it.
 */
export function useStoryStep({ key, phase, passed, buildRead }: StoryStepInput): UseStoryStepResult {
  const [state, setState] = useState<State>({ key, play: passed ? 'watch' : 'see', reviewing: null })
  const current = state.key === key ? state : { key, play: 'see' as const, reviewing: null }
  const step: GuideStepId = phase === 'incident' ? 'scene' : phase === 'debrief' ? 'debrief' : current.play

  useEffect(() => {
    if (passed && buildRead && phase === 'play') {
      setState((previous) =>
        previous.key === key && previous.play === 'watch' ? previous : { key, play: 'watch', reviewing: null }
      )
    }
  }, [passed, buildRead, phase, key])

  const goTo = useCallback((play: PlayStep) => setState({ key, play, reviewing: null }), [key])
  const review = useCallback(
    (reviewing: GuideStepId | null) =>
      setState((previous) => ({ ...(previous.key === key ? previous : { key, play: 'see' }), reviewing })),
    [key]
  )
  const toggleReview = useCallback(
    (target: GuideStepId) =>
      setState((previous) => {
        const from = previous.key === key ? previous : { key, play: 'see' as const, reviewing: null }
        return { ...from, reviewing: from.reviewing === target ? null : target }
      }),
    [key]
  )

  return { step, reviewing: current.reviewing === step ? null : current.reviewing, toggleReview, review, goTo }
}
