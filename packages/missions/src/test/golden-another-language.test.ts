import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden another-language`.
const golden = goldenMission('another-language')

describe('Another Language, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'b-is-a-peer': false, 'learned-b': false },
    // b's system id copied into a's NET: each router drops the other's hellos as its own.
    'same-system-id': { 'b-is-a-peer': false, 'learned-b': false },
    // A NET in another area: level-2 peers do not compare areas, so it passes by outcome.
    'other-area': { 'b-is-a-peer': true, 'learned-b': true },
    net: { 'b-is-a-peer': true, 'learned-b': true },
  })
})
