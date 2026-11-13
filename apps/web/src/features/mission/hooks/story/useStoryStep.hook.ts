import type { GuideStepId } from '@features/guide/types'
import { useCallback, useState } from 'react'

/** The steps played on the network, between the scene and the debrief. */
type PlayStep = 'see' | 'build' | 'watch'

export interface StoryStepInput {
  /** Names the mission's run; a new one starts its story over. */
  readonly key: string
  /** The game's phase: the scene is read before the mission begins, the debrief after it is shown. */
  readonly phase: 'incident' | 'play' | 'debrief'
  /** The objectives are all met right now. */
  readonly passed: boolean
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
 * phases); See it, Build it and Watch it are this screen's. Build it never gives way to Watch it
 * by itself: the command that meets the last objective also brings Build it's last beat, which a
 * jump would hide. The screen offers Watch it once every objective is met.
 */
export function useStoryStep({ key, phase, passed }: StoryStepInput): UseStoryStepResult {
  const [state, setState] = useState<State>({ key, play: passed ? 'watch' : 'see', reviewing: null })
  const current = state.key === key ? state : { key, play: 'see' as const, reviewing: null }
  const step: GuideStepId = phase === 'incident' ? 'scene' : phase === 'debrief' ? 'debrief' : current.play

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
