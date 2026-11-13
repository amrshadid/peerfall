import { describe, expect, it } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden the-backup-path`. The backup is judged in
// zebra's table, the only place a route that waits shows.
const golden = goldenMission('the-backup-path')

describe('The Backup Path, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { direct: false, backup: false },
    // The direct route added, distances equal: both next hops are used, not only the direct one.
    'equal-distances': { direct: false, backup: false },
    // The route through b removed: direct only, and no backup left in zebra's table.
    'no-backup': { direct: true, backup: false },
    // The distances the wrong way round: the direct route waits, and traffic still goes through b.
    'direct-as-backup': { direct: false, backup: false },
    'floating-backup': { direct: true, backup: true },
    // Any distance above 1 makes the backup: judged by what zebra holds, not by the number typed.
    'floating-backup-200': { direct: true, backup: true },
  })

  it('keeps the backup in zebra’s table and out of the kernel’s', () => {
    const a = golden.run('floating-backup').state?.routers.a
    const waiting = a?.rib?.find((route) => route.nextHops.some((hop) => hop.via === '10.0.1.2'))
    expect(waiting).toMatchObject({ prefix: '10.255.0.3/32', distance: 10, selected: false, installed: false })
  })
})
