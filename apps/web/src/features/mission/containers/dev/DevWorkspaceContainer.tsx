import { useCheatSheet, usePanelSizes, useShowAllPanels } from '@app/store'
import { useScreenChrome } from '@features/chrome/hooks/screen'
import { DebriefPresentation } from '@features/debrief/components/debrief'
import { CodeEditorPresentation } from '@features/editor/components/editor'
import type { EditorFile } from '@features/editor/types'
import { GuidePresentation } from '@features/guide/components/guide'
import { MissionScreenPresentation } from '@features/mission/components/layout'
import type { MissionPanels } from '@features/mission/types'
import {
  MACHINE_STATUS,
  MISSION_PANEL_IDS,
  MISSION_STEPS,
  openPanelsKey,
  panelsFor,
} from '@features/mission/utils/layout'
import { useShortcut } from '@features/shortcuts/hooks/keys'
import { shortcutLabelOf } from '@features/shortcuts/utils/keys'
import type { TerminalView } from '@features/terminal/hooks/view'
import { TimelinePresentation } from '@features/timeline/components/timeline'
import { RUN_LABELS, timelineRunOf } from '@features/timeline/utils/runs'
import { TopologyPresentation } from '@features/topology/components/topology'
import { linkStatesOf } from '@features/topology/utils/layout'
import { useTourScreen } from '@features/tour/hooks/tour'
import type { VmPhase } from '@peerfall/machine/types'
import { APP_MANUAL } from '@shared/constants/app'
import { useMachineLock } from '@shared/hooks/machine'
import { hrefOf } from '@shared/navigation'
import { ariaKeyShortcut, SHORTCUTS } from '@shared/utils/keyboard'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DEBRIEF_COMMANDS,
  DEBRIEF_EXPLANATION,
  DEBRIEF_LAB_NOTE,
  DEBRIEF_LEARNED,
  DEBRIEF_MEASURES,
} from '@/test/fixtures/debrief.fixture'
import { COMMANDS, HINTS, INCIDENT, OBJECTIVES, TASK } from '@/test/fixtures/guide.fixture'
import { BASELINE_EVENTS, HEALTHY_EVENTS, REPAIRED_EVENTS } from '@/test/fixtures/machine-events.fixture'
import { TRIANGLE } from '@/test/fixtures/network.fixture'
import { DevTerminalContainer } from './DevTerminalContainer'

const TITLE = 'The Link That Never Went Down'
const TARGET_SECONDS = 2
const HINT_BINDING = SHORTCUTS.find((shortcut) => shortcut.id === 'hint')?.binding

interface Stage {
  readonly panels: MissionPanels
  readonly baseline: boolean
  readonly repaired: boolean
}

const FIRST_STAGE: Stage = {
  panels: { editor: false, topology: true, timeline: false },
  baseline: false,
  repaired: false,
}

/** What each step of the fixture shows: the panels it has opened and the runs recorded by then. */
const STAGES: readonly Stage[] = [
  FIRST_STAGE,
  { panels: { editor: false, topology: true, timeline: true }, baseline: true, repaired: false },
  { panels: { editor: true, topology: true, timeline: true }, baseline: true, repaired: false },
  { panels: { editor: true, topology: true, timeline: true }, baseline: true, repaired: true },
]

const START_FILES: readonly EditorFile[] = TRIANGLE.routers.map((router) => ({
  path: `${router.name}/frr.conf`,
  content: router.config,
}))

const PHASES: readonly VmPhase[] = ['ready', 'loading', 'booting', 'setting-up', 'failed']

const focusPanel = (id: string) => document.getElementById(id)?.focus()

/** The mission workspace on fixtures, with nothing behind it: to look at the layout and its panels. */
export function DevWorkspaceContainer() {
  const chrome = useScreenChrome()
  const { sizes, setPanelSize } = usePanelSizes()
  const showAll = useShowAllPanels()
  const { openCheatSheet } = useCheatSheet()

  const [step, setStep] = useState(0)
  const [router, setRouter] = useState('a')
  const [hints, setHints] = useState(0)
  const [files, setFiles] = useState(START_FILES)
  const [activePath, setActivePath] = useState(START_FILES[0]?.path ?? '')
  const [applied, setApplied] = useState<string | null>(null)
  const [debriefOpen, setDebriefOpen] = useState(false)
  const [restartOpen, setRestartOpen] = useState(false)
  const [phase, setPhase] = useState<VmPhase>('ready')
  const terminal = useRef<TerminalView | null>(null)
  const lock = useMachineLock({ phase, detail: null })

  const stage = STAGES[step] ?? FIRST_STAGE
  const panels = panelsFor(stage.panels, showAll)
  useTourScreen('mission', openPanelsKey(panels))

  const events = stage.repaired ? REPAIRED_EVENTS : stage.baseline ? BASELINE_EVENTS : HEALTHY_EVENTS
  const linkStates = useMemo(() => linkStatesOf(events), [events])
  const baseline = useMemo(
    () => (stage.baseline ? timelineRunOf(RUN_LABELS.baseline, BASELINE_EVENTS) : null),
    [stage.baseline]
  )
  const repaired = useMemo(
    () => (stage.repaired ? timelineRunOf(RUN_LABELS.repaired, REPAIRED_EVENTS) : null),
    [stage.repaired]
  )

  const revealHint = () => setHints((count) => Math.min(HINTS.length, count + 1))
  const next = () => (step < MISSION_STEPS.length - 1 ? setStep(step + 1) : setDebriefOpen(true))
  const restart = () => {
    setStep(0)
    setHints(0)
    setFiles(START_FILES)
    setApplied(null)
    setDebriefOpen(false)
    setRestartOpen(false)
  }
  const onReady = useCallback((view: TerminalView) => {
    terminal.current = view
  }, [])

  useShortcut('next-step', next, !debriefOpen)
  useShortcut('hint', revealHint, !debriefOpen)
  useShortcut('focus-guide', () => focusPanel(MISSION_PANEL_IDS.guide))
  useShortcut('focus-editor', () => focusPanel(MISSION_PANEL_IDS.editor), panels.editor)
  useShortcut('focus-terminal', () => terminal.current?.focus())
  useShortcut('focus-network', () => focusPanel(MISSION_PANEL_IDS.network), panels.topology || panels.timeline)

  const modified = new Set(
    files.filter((file, index) => file.content !== START_FILES[index]?.content).map((file) => file.path)
  )
  const nextStep = MISSION_STEPS[step + 1]

  return (
    <MissionScreenPresentation
      unavailable={null}
      layout={{
        chrome,
        panelSizes: { sizes, onResize: setPanelSize },
        page: `${TITLE}(dev)`,
        volume: `${APP_MANUAL} · Workspace fixtures`,
        bar: {
          titleHref: hrefOf({ name: 'title' }),
          heading: TITLE,
          subheading: 'Stage 4 · Recover from failure',
          steps: MISSION_STEPS,
          currentIndex: debriefOpen ? MISSION_STEPS.length : step,
          reviewing: null,
          onReview: (stepId) =>
            setStep(
              Math.max(
                0,
                MISSION_STEPS.findIndex((each) => each.id === stepId)
              )
            ),
          hintsLeft: HINTS.length - hints,
          hintOffered: step > 0 && hints === 0,
          hintEnabled: !debriefOpen,
          hintKeyShortcut: HINT_BINDING ? ariaKeyShortcut(HINT_BINDING) : '',
          onHint: revealHint,
          onRestart: () => setRestartOpen(true),
        },
        panels,
        slots: {
          guide: (
            <GuidePresentation
              stepLabel={MISSION_STEPS[step]?.label ?? ''}
              incident={INCIDENT}
              task={TASK}
              objectives={OBJECTIVES.map((objective) => ({
                ...objective,
                passed: objective.passed || stage.repaired,
                observed: stage.baseline ? (objective.observed ?? null) : null,
              }))}
              commands={COMMANDS.map((entry) => ({
                ...entry,
                onRun: () => {
                  terminal.current?.write(entry.command)
                  terminal.current?.focus()
                },
              }))}
              hints={{
                revealed: HINTS.slice(0, hints),
                left: HINTS.length - hints,
                onReveal: hints < HINTS.length ? revealHint : null,
              }}
              note="Nothing is timed. Retry as often as you like."
              actions={[
                {
                  id: 'next',
                  label: nextStep ? `Next: ${nextStep.label}` : 'Read the debrief',
                  kind: 'primary',
                  keys: shortcutLabelOf('next-step'),
                  onSelect: next,
                },
              ]}
            />
          ),
          terminal: <DevTerminalContainer router={router} lock={lock} onReady={onReady} />,
          editor: (
            <CodeEditorPresentation
              files={files}
              activePath={activePath}
              modified={modified}
              apply={lock ? { kind: 'busy', label: 'Starting…', reason: lock.applyReason } : { kind: 'idle' }}
              status={applied}
              onSelectFile={setActivePath}
              onChange={(path, content) =>
                setFiles((current) => current.map((file) => (file.path === path ? { ...file, content } : file)))
              }
              onApply={() => setApplied('Applied on this dev route only.')}
              onReset={() => {
                setFiles(START_FILES)
                setApplied(null)
              }}
            />
          ),
          topology: (
            <TopologyPresentation
              network={TRIANGLE}
              linkStates={linkStates}
              activePath={stage.repaired ? ['a', 'b', 'c'] : ['a', 'c']}
              pathLabel="Probe a → c takes"
              selectedRouter={router}
              onSelectRouter={setRouter}
            />
          ),
          timeline: <TimelinePresentation baseline={baseline} repaired={repaired} targetSeconds={TARGET_SECONDS} />,
        },
        terminalLabel: `router ${router}`,
        terminalStatus: lock?.title ?? null,
        titleBlock: [
          { label: 'Drawing', value: 'Triangle, OSPF area 0' },
          { label: 'Step', value: `${step + 1} of ${MISSION_STEPS.length}, ${MISSION_STEPS[step]?.label}` },
          { label: 'Recovery target', value: `under ${TARGET_SECONDS} s` },
          {
            label: 'Machine',
            value: (
              <select
                aria-label="Machine phase (dev)"
                value={phase}
                onChange={(event) => setPhase(event.target.value as VmPhase)}
              >
                {PHASES.map((each) => (
                  <option key={each}>{each}</option>
                ))}
              </select>
            ),
          },
        ],
        debrief: debriefOpen ? (
          <DebriefPresentation
            title={TITLE}
            verdict={{ passed: true, text: 'Passed: traffic was back in 0.90 s, inside the 2.00 s target.' }}
            measures={DEBRIEF_MEASURES}
            explanation={DEBRIEF_EXPLANATION}
            learned={DEBRIEF_LEARNED}
            commands={DEBRIEF_COMMANDS}
            labNote={DEBRIEF_LAB_NOTE}
            next={null}
            onReplay={restart}
            titleHref={hrefOf({ name: 'title' })}
          />
        ) : null,
        restart: { open: restartOpen, onConfirm: restart, onCancel: () => setRestartOpen(false) },
        status: { save: 'saved', savedAgoMs: null, machine: MACHINE_STATUS[phase], onShortcuts: openCheatSheet },
      }}
    />
  )
}
