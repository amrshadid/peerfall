import { useCheatSheet, usePanelSizes, useShowAllPanels } from '@app/store'
import { useSaveStatus } from '@features/chrome/hooks/save'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { useContent } from '@features/content/hooks/content'
import { hintsLeftOf, hintTargetOf, waitReasonOf } from '@features/guide/utils/run'
import { MissionScreenPresentation } from '@features/mission/components/layout'
import type { MissionRunView } from '@features/mission/types'
import {
  MACHINE_STATUS,
  MISSION_PANEL_IDS,
  MISSION_STEPS,
  openPanelsKey,
  panelsFor,
} from '@features/mission/utils/layout'
import { missionStepIndex, panelsOfStep } from '@features/mission/utils/steps'
import { useShortcut } from '@features/shortcuts/hooks/keys'
import { formatSeconds } from '@features/timeline/utils/runs'
import { useTourScreen } from '@features/tour/hooks/tour'
import { useActiveMission, useHints, useMissionActions, useProgress, useRunComparison } from '@peerfall/game/hooks'
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
  terminal: ReactNode
  topology: ReactNode
  timeline: ReactNode
  /** Laid over the workspace once the player opens it. */
  debrief: ReactNode
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
  const { start, begin, leave } = useMissionActions()
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
  const { baseline, repaired } = useRunComparison()
  const hints = useHints()
  const machine = useMachineStatus()
  const lock = useMachineLock(machine)
  const { router } = useRouterSelection()
  const chrome = useScreenChrome()
  const { sizes, setPanelSize } = usePanelSizes()
  const showAll = useShowAllPanels()
  const { openCheatSheet } = useCheatSheet()
  const { saveState, lastSavedAt } = useSaveStatus()
  const now = useNow()
  const [restartOpen, setRestartOpen] = useState(false)

  const phase = active.phase ?? 'incident'
  const stepIndex = missionStepIndex({
    phase,
    hasBaseline: baseline !== null,
    hasAttempt: repaired !== null,
    completed: active.isCompleted,
  })
  const panels = panelsFor(panelsOfStep(phase, stepIndex), showAll)
  // Each new step can open a panel, which gets its own tour stop once.
  useTourScreen('mission', mission ? openPanelsKey(panels) : 'opening')

  const verdict = run.verdict ?? active.verdict
  const hintTarget = phase === 'play' ? hintTargetOf(hints.objectives, verdict) : null
  const revealHint = () => {
    if (hintTarget !== null) {
      void hints.reveal(hintTarget)
    }
  }
  useShortcut('hint', revealHint, mission !== null && hintTarget !== null)
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
  const step = MISSION_STEPS[Math.min(stepIndex, MISSION_STEPS.length - 1)] ?? MISSION_STEPS[0]
  const view: MissionView = {
    run,
    step: step?.id ?? 'inspect',
    stepLabel: step?.label ?? '',
    onStartOver: () => setRestartOpen(true),
  }
  const target = hints.objectives.find((entry) => entry.objective.id === hintTarget)
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
          reviewing: null,
          // The only way back from the debrief is to the network; the loop's steps are not replayed.
          onReview: () => {
            if (phase === 'debrief') {
              begin()
            }
          },
          hintsLeft: hintsLeftOf(hints.objectives),
          // Offered, never pushed: after a run fell short and before this objective's first hint.
          hintOffered: lastRunFellShort && target !== undefined && target.revealed.length === 0,
          hintEnabled: hintTarget !== null,
          hintKeyShortcut: HINT_BINDING ? ariaKeyShortcut(HINT_BINDING) : '',
          onHint: revealHint,
          onRestart: () => setRestartOpen(true),
        },
        panels,
        slots: { guide: guide(view), terminal, editor: editor(view), topology, timeline },
        terminalLabel: router === null ? 'the Machine: select a router on the map' : `router ${router}`,
        terminalStatus: lock?.title ?? null,
        titleBlock: [
          {
            label: 'Drawing',
            value: `${mission.network.routers.length} routers, ${mission.network.links.length} links`,
          },
          { label: 'Probe', value: `${mission.probe.from} → ${mission.probe.destination}` },
          { label: 'Fault', value: `link ${mission.fault.link.join('–')} drops every packet` },
          { label: 'Recovery target', value: `under ${formatSeconds(mission.recoveryTargetMs / MS_PER_SECOND)}` },
        ],
        debrief: phase === 'debrief' ? debrief : null,
        restart: {
          open: restartOpen,
          unavailable: phase === 'play' ? waitReasonOf(run.phase) : 'The mission has not begun yet.',
          onConfirm: () => {
            setRestartOpen(false)
            void run.startOver()
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
