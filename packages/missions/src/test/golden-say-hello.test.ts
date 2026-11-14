import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden say-hello`. The peer is judged in
// ospfd's own list of neighbours, the route in zebra's table.
const golden = goldenMission('say-hello')

describe('Say Hello, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'b-is-a-peer': false, 'learned-b': false },
    // Area 1 on a's end: each side drops the other's hellos.
    'wrong-area': { 'b-is-a-peer': false, 'learned-b': false },
    // Passive: a's end is advertised but sends and answers no hellos.
    'passive-link': { 'b-is-a-peer': false, 'learned-b': false },
    // The network line, refused while an interface has ip ospf area.
    'network-statement': { 'b-is-a-peer': false, 'learned-b': false },
    'area-0': { 'b-is-a-peer': true, 'learned-b': true },
  })
})
