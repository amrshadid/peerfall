import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-routers-language`, judged again here.
describe('The Router’s Language, on the Machine', () => {
  itJudgesEveryRun(goldenMission('the-routers-language'), {
    start: { 'cable-lit': false, 'reaches-c': false },
    // Typed where it doesn't belong: refused at a# and at a(config)#.
    'wrong-mode': { 'cable-lit': false, 'reaches-c': false },
    'no-shutdown': { 'cable-lit': true, 'reaches-c': true },
    // Abbreviated: the same commands.
    abbreviated: { 'cable-lit': true, 'reaches-c': true },
    // Switched on from Linux, as in The Dark Cable: judged by outcome, it passes.
    'from-linux': { 'cable-lit': true, 'reaches-c': true },
  })
})
