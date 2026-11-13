import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-skipped-line`, judged again here.
describe('The Skipped Line, on the Machine', () => {
  itJudgesEveryRun(goldenMission('the-skipped-line'), {
    start: { fixed: false, survives: false },
    // Restarted from the misspelt file: FRR skips the line again.
    'restarted-only': { fixed: false, survives: false },
    // Fixed in the running configuration and never saved: the restart reads the misspelt file.
    'fixed-not-saved': { fixed: false, survives: false },
    // Fixed and saved, never restarted: FRR has not yet started from the new file.
    'saved-not-restarted': { fixed: true, survives: false },
    'fixed-and-saved': { fixed: true, survives: true },
  })
})
