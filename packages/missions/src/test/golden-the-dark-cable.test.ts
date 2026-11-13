import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-dark-cable`, judged again here.
describe('The Dark Cable, on the Machine', () => {
  itJudgesEveryRun(goldenMission('the-dark-cable'), {
    start: { 'cable-lit': false, 'reaches-c': false },
    // The cable that already works: nothing changes.
    'wrong-cable': { 'cable-lit': false, 'reaches-c': false },
    lit: { 'cable-lit': true, 'reaches-c': true },
  })
})
