import { useContent } from '@features/content/hooks/content'
import { GuidePresentation } from '@features/guide/components/guide'
import type { GuideAction, GuidePace, GuideStepId } from '@features/guide/types'
import { guideObjectivesOf, probeNamesOf } from '@features/guide/utils/objectives'
import { runStatusOf, waitReasonOf } from '@features/guide/utils/run'
import {
  BUILD_NOTE,
  beatsOf,
  blocksFor,
  chipsOf,
  hintsOf,
  pacedGuideOf,
  skippedLeadOf,
  stepLabelOf,
} from '@features/guide/utils/story'
import { shortcutLabelOf } from '@features/shortcuts/utils/keys'
import { useActiveMission, useHints } from '@peerfall/game/hooks'
import { useMachineStatus, useTerminalCommand } from '@peerfall/machine/hooks'
import type { UseMissionRunResult } from '@peerfall/missions/hooks'
import { useMachineLock } from '@shared/hooks/machine'
import { hrefOf } from '@shared/navigation'
import { useMemo } from 'react'

export interface GuideContainerProps {
  /** The mission's run on the Machine: where it is, what it showed, and how to send a probe or break the link. */
  run: Pick<UseMissionRunResult, 'phase' | 'errors' | 'verdict' | 'sendProbe' | 'runFault'>
  step: GuideStepId
  reviewing: GuideStepId | null
  /** Ends a look back at a done step. */
  onEndReview: () => void
  /** The network was reset this visit: the verdict saved before it no longer applies. */
  startedOver: boolean
  /** Null while a question of the step waits for its answer, as well as where there is no way on. */
  onNext: (() => void) | null
  onSkipToBuild: (() => void) | null
  /** Build it was reached by skipping See it: the Guide says how to get where See it ends. */
  skippedSeeIt?: boolean
  /** How far into the current step's story the player is; the screen releases its pauses. */
  pace: GuidePace
  /** Asks before the network goes back to how the mission found it. */
  onStartOver: () => void
}

// The guide of a stage that names none: zebra, who guides the first ones.
const DEFAULT_GUIDE = 'zebra'

const NEXT_LABEL: Readonly<Partial<Record<GuideStepId, string>>> = {
  scene: 'Next: See it',
  see: 'Next: Build it',
  build: 'Next: Watch it',
  watch: 'Next: the debrief',
}

/**
 * The mission's story, paced by the player's commands: the command a beat asks for, finished at
 * the terminal, shows the next beat, and Continue always does. Then its objectives, ticking live,
 * its chips, hints and Codex cards, and the run's actions.
 */
export function GuideContainer({
  run,
  step,
  reviewing,
  onEndReview,
  startedOver,
  onNext,
  onSkipToBuild,
  skippedSeeIt = false,
  pace,
  onStartOver,
}: GuideContainerProps) {
  const { mission, phase, verdict: lastAttempt } = useActiveMission()
  const content = useContent()
  const hints = useHints()
  const command = useTerminalCommand()
  const lock = useMachineLock(useMachineStatus())
  const shown = reviewing ?? step

  const story = mission ? content.storyOf(mission.id)?.sections : undefined
  const beats = useMemo(() => beatsOf(blocksFor(shown, story)), [shown, story])
  const lead = useMemo(() => {
    if (!mission || !skippedSeeIt || reviewing !== null || step !== 'build') {
      return null
    }
    const routers = mission.network.routers.map((router) => router.name)
    const firstRouter = mission.probe?.from ?? routers[0] ?? null
    return skippedLeadOf(beatsOf(blocksFor('see', story)), beats, routers, firstRouter)
  }, [mission, skippedSeeIt, reviewing, step, story, beats])
  if (!mission || phase === null) {
    return null
  }

  // The live verdict is the run's; the saved one is the last the game recorded. Beside the debrief
  // the objectives are the passing play-through's: after a reload the network is built afresh, and
  // its live reading would show them unmet next to "Mission complete".
  const verdict =
    phase === 'debrief' && lastAttempt !== null ? lastAttempt : (run.verdict ?? (startedOver ? null : lastAttempt))
  const paced = pacedGuideOf(beats, pace, reviewing !== null)
  const wait = waitReasonOf(run.phase)
  const onNetwork = step === 'see' || step === 'build' || step === 'watch'
  const label = stepLabelOf(shown)
  // A chip's keys would land in a frozen terminal; a network being set up holds them for its new shell.
  const terminalTakesKeys = lock === null || lock.holdsKeys

  // The way on first, then what the mission can do to the network: no probe without traffic, no
  // link to break without a fault. Objectives are judged live, so there is nothing to submit.
  // A look back offers only the way back, as Kernelfall's Guide does.
  const actions: GuideAction[] = []
  if (reviewing !== null) {
    actions.push({ id: 'back', label: `Back to ${stepLabelOf(step)}`, kind: 'primary', onSelect: onEndReview })
  }
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
  if (onNetwork && reviewing === null) {
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
      lead={lead}
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
        by: content.game.chapters.find((chapter) => chapter.id === mission.chapter)?.guide ?? DEFAULT_GUIDE,
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
