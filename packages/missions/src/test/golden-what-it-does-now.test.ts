import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden what-it-does-now`, judged again here.
describe('What It Does Now, on the Machine', () => {
  itJudgesEveryRun(goldenMission('what-it-does-now'), {
    start: { labelled: false },
    // Labelled the cable to b instead.
    'wrong-interface': { labelled: false },
    // Typed in configure mode: refused.
    'wrong-mode': { labelled: false },
    labelled: { labelled: true },
    // Short words, and words of the player's own: any description passes.
    abbreviated: { labelled: true },
  })
})
