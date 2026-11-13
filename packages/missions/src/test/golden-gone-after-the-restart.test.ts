import { describe, expect, it } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden gone-after-the-restart`. Nothing restarts
// FRR for the player: `survives` reads the frr.conf FRR's init script last started a from.
const golden = goldenMission('gone-after-the-restart')

describe('Gone After the Restart, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { saved: false, survives: false },
    // Configured and never saved.
    'not-saved': { saved: false, survives: false },
    // Configured and restarted without saving: the restart takes it away.
    'restarted-not-saved': { saved: false, survives: false },
    // Saved, and never restarted: no start has come from the saved file yet.
    'saved-not-restarted': { saved: true, survives: false },
    // Restarted, then saved: the restart came before the change, from a file without it.
    'restarted-then-saved': { saved: true, survives: false },
    'saved-and-restarted': { saved: true, survives: true },
    // The way the story goes: restarted without saving first, then given again, saved and restarted.
    'the-story': { saved: true, survives: true },
  })

  it('has no started configuration until the player restarts FRR', () => {
    expect(golden.run('saved-not-restarted').state?.routers.a?.startedConfig).toBeNull()
  })
})
