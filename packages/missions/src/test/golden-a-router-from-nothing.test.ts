import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden a-router-from-nothing`, judged again here.
const NOTHING = { 'frr-runs': false, 'on-in-frr': false, labelled: false, restarted: false, 'stays-up': false }

describe('A Router from Nothing, on the Machine', () => {
  itJudgesEveryRun(goldenMission('a-router-from-nothing'), {
    start: NOTHING,
    // Started, and nothing else: the file puts a-c down.
    'started-only': { ...NOTHING, 'frr-runs': true },
    // Switched on from Linux, labelled and saved: the saved file still says shutdown, and the
    // restart puts a-c down again.
    'lit-from-linux': { ...NOTHING, 'frr-runs': true, labelled: true, restarted: true },
    // Everything right in the running configuration, never saved: the restart reads the old file.
    'not-saved': { ...NOTHING, 'frr-runs': true },
    // Saved, never restarted: nothing shows yet what a restart does.
    'saved-not-restarted': { ...NOTHING, 'frr-runs': true, 'on-in-frr': true, labelled: true },
    'from-nothing': { 'frr-runs': true, 'on-in-frr': true, labelled: true, restarted: true, 'stays-up': true },
  })
})
