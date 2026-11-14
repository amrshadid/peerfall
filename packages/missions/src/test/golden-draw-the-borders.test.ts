import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden draw-the-borders`. Only the database tells
// an inter-area route from an intra-area one: zebra shows both as O.
const golden = goldenMission('draw-the-borders')

describe('Draw the Borders, on the Machine', () => {
  itJudgesEveryRun(golden, {
    start: { 'b-is-a-peer': false, 'c-as-summary': false, 'a-learns-c': false },
    // Everything in area 0: peers and the route, no border, no summary.
    'all-area-0': { 'b-is-a-peer': true, 'c-as-summary': false, 'a-learns-c': true },
    // a's end moved instead of b's: a becomes the border router itself.
    'a-end-to-area-0': { 'b-is-a-peer': true, 'c-as-summary': false, 'a-learns-c': true },
    'b-a-to-area-1': { 'b-is-a-peer': true, 'c-as-summary': true, 'a-learns-c': true },
  })
})
