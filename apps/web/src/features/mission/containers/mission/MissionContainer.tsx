import { useCheatSheet, usePanelSizes, useShowAllPanels } from '@app/store'
import { useSaveStatus } from '@features/chrome/hooks/save'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { useContent } from '@features/content/hooks/content'
import { waitReasonOf } from '@features/guide/utils/run'
import { MissionScreenPresentation } from '@features/mission/components/layout'
import { useStoryStep } from '@features/mission/hooks/story'
import type { MissionRunView } from '@features/mission/types'
import {
  MACHINE_STATUS,
  MISSION_PANEL_IDS,
  MISSION_STEPS,
  openPanelsKey,
  panelsFor,
} from '@features/mission/utils/layout'
import { panelsOfStep } from '@features/mission/utils/steps'
import { useShortcut } from '@features/shortcuts/hooks/keys'
import { formatSeconds } from '@features/timeline/utils/runs'
import { useTourScreen } from '@features/tour/hooks/tour'
import { useActiveMission, useHints, useMissionActions, useProgress } from '@peerfall/game/hooks'
import { useMachineStatus, useRouterSelection } from '@peerfall/machine/hooks'
import { type UseMissionRunResult, useMissionRun } from '@peerfall/missions/hooks'
import { APP_MANUAL } from '@shared/constants/app'
import { useMachineLock } from '@shared/hooks/machine'
import { useNow } from '@shared/hooks/time'
import { hrefOf } from '@shared/navigation'
import { ariaKeyShortcut, SHORTCUTS } from '@shared/utils/keyboard'
import { type ReactNode, useEffect, useState } from 'react'

export type MissionView = MissionRunView<UseMissionRunResult>

export interface MissionContainerProps {
  missionId: string
  /** The panels that need the mission's run are handed it; the others read the game and the Machine themselves. */
  guide: (view: MissionView) => ReactNode
  editor: (view: MissionView) => ReactNode
  terminal: (view: MissionView) => ReactNode
  topology: ReactNode
  timeline: ReactNode
  /** Laid over the workspace once the player opens it; handed the run for its Play it again. */
  debrief: (view: MissionView) => ReactNode
  /** Shown for an address that names no mission. */
  notFound: ReactNode
}

const MS_PER_SECOND = 1000
const CANNOT_OPEN = 'This mission could not be opened.'
const HINT_BINDING = SHORTCUTS.find((shortcut) => shortcut.id === 'hint')?.binding

const focusPanel = (id: string) => document.getElementById(id)?.focus()

/**
 * A mission, played: opens it at its incident, builds its network on the Machine, and lays the
 * panels out around the run. Leaving the page closes the mission.
 */
export function MissionContainer({
  missionId,
  guide,
  editor,
  terminal,
  topology,
  timeline,
  debrief,
  notFound,
}: MissionContainerProps) {
  const content = useContent()
  const definition = content.game.mission(missionId) ?? null
  const { isOpen } = useProgress()
  const { start, begin, showDebrief, leave } = useMissionActions()
  const active = useActiveMission()
  const [refused, setRefused] = useState<string | null>(null)

  // The save has to be loaded first: a mission started on an empty progress would be overwritten by it.
  useEffect(() => {
    if (!definition || !isOpen) {
      return
    }
    let left = false
    void start(definition.id).then((started) => {
      if (!left && !started.success) {
        setRefused(started.error?.message ?? CANNOT_OPEN)
      }
    })
    return () => {
      left = true
      leave()
    }
  }, [definition, isOpen, start, leave])

  const mission = active.mission?.id === missionId ? active.mission : null
  const run = useMissionRun(mission)
  const hints = useHints()
  const machine = useMachineStatus()
  const lock = useMachineLock(machine)
  const { router, select } = useRouterSelection()
  // A network starts with the terminal in the Machine's own shell, which belongs to no router: a
  // newcomer would type every command there, see nothing work and get no sign why. So the
  // terminal goes into the router the mission starts from (the probe's, else the first one) as
  // soon as its namespaces exist (settling comes right after they are built: waiting for ready let
  // the first commands land in the Machine's shell), and again after Start over brings that shell back.
  const firstRouter = mission?.probe?.from ?? mission?.network.routers[0]?.name ?? null
  const routersBuilt = run.phase === 'settling' || run.phase === 'ready'
  useEffect(() => {
    if (routersBuilt && router === null && firstRouter !== null) {
      void select(firstRouter)
    }
  }, [routersBuilt, router, firstRouter, select])
  const chrome = useScreenChrome()
  const { sizes, setPanelSize } = usePanelSizes()
  const showAll = useShowAllPanels()
  const { openCheatSheet } = useCheatSheet()
  const { saveState, lastSavedAt } = useSaveStatus()
  const now = useNow()
  const [restartOpen, setRestartOpen] = useState(false)

  const phase = active.phase ?? 'incident'
  // Every reset of the network starts the story's played steps over.
  const [runs, setRuns] = useState(0)
  const startedOver = runs > 0
  // After a reset the saved verdict describes a network that is gone.
  const verdict = run.verdict ?? (startedOver ? null : active.verdict)
  const storyKey = `${missionId}#${runs}`
  const passed = run.verdict?.passed ?? false
  const story = useStoryStep({ key: storyKey, phase, passed })
  const { step } = story
  const stepIndex = MISSION_STEPS.findIndex((entry) => entry.id === step)
  const panels = panelsFor(panelsOfStep(step, mission?.fault !== undefined), showAll)
  // Each new step can open a panel, which gets its own tour stop once.
  useTourScreen('mission', mission ? openPanelsKey(panels) : 'opening')

  const onNext =
    step === 'scene'
      ? () => {
          begin()
          story.goTo('see')
        }
      : step === 'see'
        ? () => story.goTo('build')
        : step === 'build' && passed
          ? () => story.goTo('watch')
          : step === 'watch'
            ? showDebrief
            : null
  useShortcut('next-step', () => onNext?.(), mission !== null && onNext !== null)
  // Hints are for the steps played on the network, one at a time: a nudge, the concept, the spot.
  const hintEnabled = phase === 'play' && hints.next !== null
  const revealHint = () => {
    if (hintEnabled) {
      void hints.reveal()
    }
  }
  useShortcut('hint', revealHint, mission !== null && hintEnabled)
  useShortcut('focus-guide', () => focusPanel(MISSION_PANEL_IDS.guide), mission !== null)
  useShortcut('focus-editor', () => focusPanel(MISSION_PANEL_IDS.editor), mission !== null && panels.editor)
  useShortcut('focus-network', () => focusPanel(MISSION_PANEL_IDS.network), mission !== null)

  if (!definition) {
    return notFound
  }
  if (refused !== null) {
    return (
      <MissionScreenPresentation
        layout={null}
        unavailable={{ reason: refused, titleHref: hrefOf({ name: 'title' }) }}
      />
    )
  }
  if (!mission) {
    return <MissionScreenPresentation layout={null} unavailable={null} />
  }

  const chapter = content.game.chapters.find((candidate) => candidate.id === mission.chapter)
  const number = content.game.missionsIn(mission.chapter).findIndex((candidate) => candidate.id === mission.id) + 1
  // The network is reset whenever the run allows it, the scene included: commands typed while
  // reading it already change the routers.
  const restartWait = waitReasonOf(run.phase)
  const startOver = () => {
    setRuns((count) => count + 1)
    void run.startOver()
  }
  const view: MissionView = {
    run,
    step,
    reviewing: story.reviewing,
    onEndReview: () => story.review(null),
    startedOver,
    onNext,
    onSkipToBuild:
      step === 'scene'
        ? () => {
            begin()
            story.goTo('build')
          }
        : null,
    onStartOver: () => setRestartOpen(true),
    // As Kernelfall's Replay level: the mission again on the network as it found it. While the
    // network is busy, the Start over dialog says why it has to wait.
    onPlayAgain: () => {
      if (restartWait !== null) {
        setRestartOpen(true)
        return
      }
      startOver()
      begin()
    },
  }
  const lastRunFellShort = verdict !== null && !verdict.passed

  return (
    <MissionScreenPresentation
      unavailable={null}
      layout={{
        chrome,
        panelSizes: { sizes, onResize: setPanelSize },
        page: `${mission.title}(${chapter?.stage ?? 0}.${number})`,
        volume: chapter ? `${APP_MANUAL} · ${chapter.title}` : APP_MANUAL,
        bar: {
          titleHref: hrefOf({ name: 'title' }),
          heading: mission.title,
          subheading: chapter ? `Stage ${chapter.stage} · ${chapter.title}` : '',
          steps: MISSION_STEPS,
          currentIndex: stepIndex,
          reviewing: story.reviewing,
          // A done step is looked at again in the Guide; progress is kept.
          onReview: (stepId) => {
            const target = MISSION_STEPS.find((entry) => entry.id === stepId)
            if (target && MISSION_STEPS.indexOf(target) < stepIndex) {
              story.toggleReview(target.id)
            }
          },
          hintsLeft: hints.left,
          // Offered, never pushed: in Build it, after a run fell short and before the first hint.
          hintOffered: step === 'build' && lastRunFellShort && hints.revealed.length === 0,
          hintEnabled,
          hintKeyShortcut: HINT_BINDING ? ariaKeyShortcut(HINT_BINDING) : '',
          onHint: revealHint,
          onRestart: () => setRestartOpen(true),
        },
        panels,
        slots: { guide: guide(view), terminal: terminal(view), editor: editor(view), topology, timeline },
        terminalLabel: router === null ? 'the Machine: select a router on the map' : `router ${router}`,
        terminalStatus: lock?.title ?? null,
        titleBlock: [
          {
            label: 'Drawing',
            value: `${mission.network.routers.length} routers, ${mission.network.links.length} links`,
          },
          // A mission states only what it has: one that breaks nothing has no fault and no target.
          ...(mission.probe ? [{ label: 'Probe', value: `${mission.probe.from} → ${mission.probe.destination}` }] : []),
          ...(mission.fault
            ? [{ label: 'Fault', value: `link ${mission.fault.link.join('–')} drops every packet` }]
            : []),
          ...(mission.recoveryTargetMs !== undefined
            ? [
                {
                  label: 'Recovery target',
                  value: `under ${formatSeconds(mission.recoveryTargetMs / MS_PER_SECOND)}`,
                },
              ]
            : []),
        ],
        debrief: phase === 'debrief' ? debrief(view) : null,
        restart: {
          open: restartOpen,
          unavailable: restartWait,
          onConfirm: () => {
            setRestartOpen(false)
            startOver()
          },
          onCancel: () => setRestartOpen(false),
        },
        status: {
          save: saveState,
          savedAgoMs: lastSavedAt === null ? null : now - lastSavedAt,
          machine: MACHINE_STATUS[machine.phase],
          onShortcuts: openCheatSheet,
        },
      }}
    />
  )
}
