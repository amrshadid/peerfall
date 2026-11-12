import { useContent } from '@features/content/hooks/content'
import { GuidePresentation } from '@features/guide/components/guide'
import type { GuideAction } from '@features/guide/types'
import { titledMarkdown } from '@features/guide/utils/markdown'
import { guideObjectivesOf, probeNamesOf } from '@features/guide/utils/objectives'
import {
  type GuideStep,
  hintsLeftOf,
  hintTargetOf,
  revealedHintsOf,
  runStatusOf,
  taskOf,
  waitReasonOf,
} from '@features/guide/utils/run'
import { useShortcut } from '@features/shortcuts/hooks/keys'
import { shortcutLabelOf } from '@features/shortcuts/utils/keys'
import { useActiveMission, useHints, useMissionActions } from '@peerfall/game/hooks'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { useMemo } from 'react'

export interface GuideContainerProps {
  /** The mission's run on the Machine: where it is, what the last one showed, and how to start one. */
  run: Pick<UseMissionRunResult, 'phase' | 'errors' | 'verdict' | 'sendProbe' | 'runFault'>
  /** Where the player is in the mission loop. */
  step: GuideStep
  stepLabel: string
  /** Asks before the network goes back to how the mission found it. */
  onStartOver: () => void
}

const NOTE = 'Nothing is timed. Retry as often as you like.'
const NO_HINTS = { revealed: [], left: 0, onReveal: null } as const

/** The mission in words: its incident, then its objectives as the last run left them, hints and the run's actions. */
export function GuideContainer({ run, step, stepLabel, onStartOver }: GuideContainerProps) {
  const { mission, phase, verdict: lastAttempt, isCompleted } = useActiveMission()
  const content = useContent()
  const hints = useHints()
  const { begin, showDebrief } = useMissionActions()

  const text = mission ? (content.textsOf(mission.id)?.incident ?? '') : ''
  const incident = useMemo(() => titledMarkdown(text), [text])
  // A probe judges too, so the newest verdict is the run's; the saved one is only the last attempt.
  const verdict = run.verdict ?? lastAttempt
  const target = hintTargetOf(hints.objectives, verdict)

  const onward = phase === 'incident' ? begin : phase === 'play' && isCompleted ? showDebrief : null
  useShortcut('next-step', () => onward?.(), onward !== null)

  if (!mission || phase === null) {
    return null
  }

  const names = probeNamesOf(mission)
  const status = runStatusOf(run.phase, run.errors, mission, names)
  const report = {
    title: incident.title ?? mission.title,
    source: null,
    body: [],
    content: incident.blocks,
    folded: phase !== 'incident',
  }

  if (phase === 'incident') {
    return (
      <GuidePresentation
        stepLabel={stepLabel}
        incident={report}
        task={[]}
        objectives={[]}
        commands={[]}
        hints={NO_HINTS}
        note={null}
        status={status}
        actions={[
          { id: 'begin', label: 'Begin', kind: 'primary', keys: shortcutLabelOf('next-step'), onSelect: begin },
        ]}
      />
    )
  }

  const wait = waitReasonOf(run.phase)
  const firstRun = verdict === null
  const playing = phase === 'play'
  const actions: readonly GuideAction[] = playing
    ? [
        ...(isCompleted
          ? [
              {
                id: 'debrief',
                label: 'Read the debrief',
                kind: 'primary',
                keys: shortcutLabelOf('next-step'),
                onSelect: showDebrief,
              } as const,
            ]
          : []),
        {
          id: 'probe',
          label: 'Send probe',
          kind: !isCompleted && firstRun ? 'primary' : 'default',
          unavailable: wait,
          onSelect: () => void run.sendProbe(),
        },
        {
          id: 'fault',
          label: 'Break the link',
          kind: !isCompleted && !firstRun ? 'primary' : 'default',
          unavailable: wait,
          onSelect: () => void run.runFault(),
        },
        { id: 'start-over', label: 'Start over', kind: 'quiet', unavailable: wait, onSelect: onStartOver },
      ]
    : []

  return (
    <GuidePresentation
      stepLabel={stepLabel}
      incident={report}
      task={taskOf(step, mission, names)}
      objectives={guideObjectivesOf(mission, verdict)}
      commands={[]}
      hints={{
        revealed: revealedHintsOf(hints.objectives),
        left: hintsLeftOf(hints.objectives),
        onReveal: playing && target !== null ? () => void hints.reveal(target) : null,
        onCopy: (command) => void navigator.clipboard?.writeText(command),
      }}
      note={NOTE}
      status={status}
      actions={actions}
    />
  )
}
