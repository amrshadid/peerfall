import type { DebriefMeasure } from '@features/debrief/types'
import type { CodexCardData } from '@shared/types'

// Made up to lay screens out and test them: mission text comes from the missions package, checked on the Machine.

export const DEBRIEF_MEASURES: readonly DebriefMeasure[] = [
  { label: 'Baseline outage', value: '37.8 s', tone: 'bad' },
  { label: 'Outage with BFD', value: '0.90 s', tone: 'good' },
  { label: 'Recovery target', value: 'under 2.00 s' },
  { label: 'Path after the fault', value: 'a → b → c' },
]

export const DEBRIEF_LEARNED: readonly string[] = ['`bfdd`', 'dead interval', '`ip ospf bfd`']

export const DEBRIEF_CARDS: readonly CodexCardData[] = [
  {
    id: 'bfdd',
    term: 'bfdd',
    simple: 'The daemon that runs BFD: it notices a dead path to a neighbour.',
    deep: null,
    sources: [{ path: 'bfdd/bfd.c', href: 'https://example.invalid/bfdd/bfd.c' }],
    docs: null,
    tryIt: 'show bfd peers',
    deepens: null,
    deepenedBy: [],
    filedIn: '4.1 The Link That Never Went Down',
  },
  {
    id: 'dead-interval',
    term: 'dead interval',
    simple: 'How long OSPF waits without a hello before it drops a neighbour.',
    deep: null,
    sources: [],
    docs: null,
    tryIt: null,
    deepens: null,
    deepenedBy: [],
    filedIn: '4.1 The Link That Never Went Down',
  },
]
