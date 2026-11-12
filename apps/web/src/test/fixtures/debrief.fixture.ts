import type { DebriefCommand, DebriefMeasure } from '@features/debrief/types'

// Made up to lay screens out and test them: mission text comes from the missions package, checked on the Machine.

export const DEBRIEF_MEASURES: readonly DebriefMeasure[] = [
  { label: 'Baseline outage', value: '37.8 s', tone: 'bad' },
  { label: 'Outage with BFD', value: '0.90 s', tone: 'good' },
  { label: 'Recovery target', value: 'under 2.00 s' },
  { label: 'Path after the fault', value: 'a → b → c' },
]

export const DEBRIEF_EXPLANATION: readonly string[] = [
  'The link kept its carrier, so neither interface went down. OSPF only learns that a neighbor is gone when no hello arrives for the whole **dead interval**.',
  'BFD sends its own small packets many times a second. When they stop arriving, `bfdd` tells `ospfd`, and OSPF drops the adjacency at once instead of waiting.',
]

export const DEBRIEF_LEARNED: readonly string[] = ['`bfdd`', 'dead interval', '`ip ospf bfd`']

export const DEBRIEF_COMMANDS: readonly DebriefCommand[] = [
  { command: 'show bfd peers', explain: 'Each BFD session, its state and the timers both ends agreed on.' },
  { command: 'show ip ospf neighbor', explain: 'The adjacencies, and the dead time left on each.' },
]

export const DEBRIEF_LAB_NOTE = 'The same three routers run on a Linux host from the `lab/` folder of the repository.'
