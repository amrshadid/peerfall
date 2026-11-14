import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden two-ways-at-once`. Both paths are judged in
// the kernel's route: two next hops, from OSPF.
const golden = goldenMission('two-ways-at-once')

describe('Two Ways at Once, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'both-paths': false },
    // Two static routes: both next hops reach the kernel, but as static routes, not OSPF's.
    'static-ecmp': { 'both-paths': false },
    // The limit set and removed on d: a's own limit still hands zebra one path.
    'wrong-router': { 'both-paths': false },
    'no-maximum-paths': { 'both-paths': true },
    'maximum-paths-2': { 'both-paths': true },
  })
})
