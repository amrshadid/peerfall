import type { MissionLayoutModel } from '@features/mission/types'
import { MISSION_STEPS } from '@features/mission/utils/layout'

const noop = () => {}

/** A whole mission screen with plain text in every slot, every panel open: tests change what they are about. */
export const MISSION_LAYOUT: MissionLayoutModel = {
  chrome: { themeLabel: 'Night print', onToggleTheme: noop, storageIssue: null, onExport: null, onTour: null },
  panelSizes: { sizes: { guide: null, network: null, editor: null }, onResize: noop },
  page: 'The Link That Never Went Down(4.1)',
  volume: 'Peerfall Network Manual · Recover from failure',
  bar: {
    mapHref: '#/map',
    heading: 'The Link That Never Went Down',
    subheading: 'Stage 4 · Recover from failure',
    steps: MISSION_STEPS,
    currentIndex: 1,
    reviewing: null,
    onReview: noop,
    hintsLeft: 3,
    hintOffered: false,
    hintEnabled: true,
    hintKeyShortcut: 'Alt+H',
    onHint: noop,
    onReplay: noop,
  },
  panels: { editor: true, topology: true, timeline: true },
  slots: {
    guide: <p>guide slot</p>,
    terminal: <p>terminal slot</p>,
    editor: <p>editor slot</p>,
    topology: <p>topology slot</p>,
    timeline: <p>timeline slot</p>,
  },
  terminalLabel: 'router a',
  terminalStatus: null,
  titleBlock: [{ label: 'Recovery target', value: 'under 2 s' }],
  debrief: null,
  restart: { open: false, onConfirm: noop, onCancel: noop },
  replay: { open: false, onConfirm: noop, onCancel: noop },
  status: { save: 'saved', savedAgoMs: null, machine: 'Linux and FRR: running', onShortcuts: noop },
}
