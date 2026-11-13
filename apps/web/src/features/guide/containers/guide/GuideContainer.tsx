import { useContent } from '@features/content/hooks/content'
import { GuidePresentation } from '@features/guide/components/guide'
import { useGuidePace } from '@features/guide/hooks/pace'
import type { GuideAction, GuideStepId } from '@features/guide/types'
import { guideObjectivesOf, probeNamesOf } from '@features/guide/utils/objectives'
import { runStatusOf, waitReasonOf } from '@features/guide/utils/run'
import {
  BUILD_NOTE,
  beatsOf,
  blocksFor,
  chipsOf,
  hintsOf,
  pacedGuideOf,
  stepLabelOf,
} from '@features/guide/utils/story'
import { shortcutLabelOf } from '@features/shortcuts/utils/keys'
import { useActiveMission, useHints } from '@peerfall/game/hooks'
import { useCommandFinished, useMachineStatus, useTerminalCommand } from '@peerfall/machine/hooks'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { useMachineLock } from '@shared/hooks/machine'
import { hrefOf } from '@shared/navigation'
import { useEffect, useMemo } from 'react'

export interface GuideContainerProps {
  /** The mission's run on the Machine: where it is, what it showed, and how to send a probe or break the link. */
  run: Pick<UseMissionRunResult, 'phase' | 'errors' | 'verdict' | 'sendProbe' | 'runFault'>
  step: GuideStepId
  reviewing: GuideStepId | null
  onNext: (() => void) | null
  onSkipToBuild: (() => void) | null
  /** Asks before the network goes back to how the mission found it. */
  onStartOver: () => void
  /** Called once Build it's transcript is shown to its end. */
  onBuildRead: () => void
}

const NEXT_LABEL: Readonly<Partial<Record<GuideStepId, string>>> = {
  scene: 'Next: See it',
  see: 'Next: Build it',
  build: 'Next: Watch it',
  watch: 'Next: the debrief',
}

/**
 * The mission's story, paced by the player's commands: each one finished at the terminal shows the
 * next beat. Then its objectives, ticking live, its chips, hints and Codex cards, and the run's actions.
 */
export function GuideContainer({
  run,
  step,
  reviewing,
  onNext,
  onSkipToBuild,
  onStartOver,
  onBuildRead,
}: GuideContainerProps) {
  const { mission, phase, verdict: lastAttempt } = useActiveMission()
  const content = useContent()
  const hints = useHints()
  const command = useTerminalCommand()
  const lock = useMachineLock(useMachineStatus())
  const shown = reviewing ?? step
  const pace = useGuidePace(`${mission?.id ?? ''}#${shown}`)
  useCommandFinished(pace.advance)

  const story = mission ? content.storyOf(mission.id)?.sections : undefined
  const beats = useMemo(() => beatsOf(blocksFor(shown, story)), [shown, story])
  const paced = pacedGuideOf(beats, pace, reviewing !== null)
  // The story waits for this before Build it gives way to Watch it.
  const buildRead = step === 'build' && reviewing === null && paced.finished
  useEffect(() => {
    if (buildRead) {
      onBuildRead()
    }
  }, [buildRead, onBuildRead])

  if (!mission || phase === null) {
    return null
  }

  // The live verdict is the run's; the saved one is the last the game recorded.
  const verdict = run.verdict ?? lastAttempt
  const wait = waitReasonOf(run.phase)
  const onNetwork = step === 'see' || step === 'build' || step === 'watch'
  const label = stepLabelOf(shown)
  // A chip's keys would land in a frozen terminal; a network being set up holds them for its new shell.
  const terminalTakesKeys = lock === null || lock.holdsKeys

  // The way on first, then what the mission can do to the network: no probe without traffic, no
  // link to break without a fault. Objectives are judged live, so there is nothing to submit.
  const actions: GuideAction[] = []
  if (onNext !== null && reviewing === null) {
    actions.push({
      id: 'next',
      label: NEXT_LABEL[step] ?? 'Next',
      kind: 'primary',
      keys: shortcutLabelOf('next-step'),
      onSelect: onNext,
    })
  }
  if (onSkipToBuild !== null && reviewing === null) {
    actions.push({ id: 'skip', label: 'Skip to Build it', kind: 'quiet', onSelect: onSkipToBuild })
  }
  if (onNetwork) {
    if (mission.probe) {
      actions.push({
        id: 'probe',
        label: 'Send probe',
        kind: 'default',
        unavailable: wait,
        onSelect: () => void run.sendProbe(),
      })
    }
    if (mission.fault) {
      actions.push({
        id: 'fault',
        label: 'Break the link',
        kind: 'default',
        unavailable: wait,
        onSelect: () => void run.runFault(),
      })
    }
    actions.push({ id: 'start-over', label: 'Start over', kind: 'quiet', unavailable: wait, onSelect: onStartOver })
  }

  return (
    <GuidePresentation
      stepLabel={label}
      reviewNote={reviewing ? `Looking again at ${label}. Your progress is kept.` : null}
      beats={paced.beats}
      onContinue={paced.onContinue}
      showObjectives={reviewing !== null || shown !== 'scene'}
      objectives={guideObjectivesOf(mission, verdict)}
      chips={
        (step === 'see' || step === 'build') && reviewing === null
          ? chipsOf(mission.chips, terminalTakesKeys ? command.run : null)
          : []
      }
      hints={{
        revealed: hintsOf(hints.revealed, hints.revealed.length),
        left: hints.left,
        onReveal: onNetwork && hints.next !== null ? () => void hints.reveal() : null,
        onCopy: (text) => void navigator.clipboard?.writeText(text),
      }}
      codex={mission.codex.map((card) => ({
        id: card.id,
        term: card.term,
        // Over the mission, not the Codex screen: reading a card never leaves the mission.
        href: hrefOf({ name: 'mission', missionId: mission.id, card: card.id }),
      }))}
      codexOpen={reviewing !== null || shown === 'watch' || shown === 'debrief'}
      note={step === 'build' && reviewing === null ? BUILD_NOTE : null}
      status={runStatusOf(run.phase, run.errors, mission, probeNamesOf(mission))}
      actions={actions}
    />
  )
}
