import { describe, expect, it } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-silent-router`, judged again here by
// the mission's own checks from the state that was read as root.
const golden = goldenMission('the-silent-router')

describe('The Silent Router, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'daemons-answer': false, 'watchfrr-watches': false },
    // One daemon by hand: vtysh answers, and FRR is not whole.
    'zebra-by-hand': { 'daemons-answer': false, 'watchfrr-watches': false },
    // Every daemon by hand: they answer, and nothing watches them.
    'daemons-by-hand': { 'daemons-answer': true, 'watchfrr-watches': false },
    // The script without the router's name: an FRR runs that vtysh -N a cannot reach.
    'init-script-without-name': { 'daemons-answer': false, 'watchfrr-watches': false },
    'init-script': { 'daemons-answer': true, 'watchfrr-watches': true },
    // Started by hand first, then again properly: the script stops what runs and starts watchfrr.
    'by-hand-then-init-script': { 'daemons-answer': true, 'watchfrr-watches': true },
  })

  it('FRR’s init script starts watchfrr beside the three daemons', () => {
    expect(golden.run('init-script').state?.routers.a?.daemons).toEqual(['mgmtd', 'zebra', 'staticd', 'watchfrr'])
  })
})
