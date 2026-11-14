import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden build-the-underlay`. Each run that builds
// OSPF ends with the scripted player waiting 50 s at a's shell: on these broadcast links new peers
// sit in 2-Way for 40 s with no route changing, and a run is judged once routing goes quiet.
const golden = goldenMission('build-the-underlay')

const saved = { 'a-saved': true, 'b-saved': true, 'c-saved': true, 'd-saved': true }
const unsaved = { 'a-saved': false, 'b-saved': false, 'c-saved': false, 'd-saved': false }

describe('Build the Underlay, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'a-reaches-d': false, 'both-paths': false, 'd-learns-a': false, ...unsaved },
    // Everything running, nothing saved.
    'not-saved': { 'a-reaches-d': true, 'both-paths': true, 'd-learns-a': true, ...unsaved },
    // Static routes on a and d only: b and c cannot forward, and the routes are not OSPF's.
    statics: { 'a-reaches-d': false, 'both-paths': false, 'd-learns-a': false, ...unsaved },
    // OSPF on the links only: no loopback reaches the map, and none is in frr.conf.
    'no-loopbacks': { 'a-reaches-d': false, 'both-paths': false, 'd-learns-a': false, ...unsaved },
    // a-c's cost raised to 20: one path only.
    'one-path': { 'a-reaches-d': true, 'both-paths': false, 'd-learns-a': true, ...saved },
    underlay: { 'a-reaches-d': true, 'both-paths': true, 'd-learns-a': true, ...saved },
  })
})
