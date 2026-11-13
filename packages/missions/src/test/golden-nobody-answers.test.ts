import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden nobody-answers`, judged again here.
describe('Nobody Answers, on the Machine', () => {
  itJudgesEveryRun(goldenMission('nobody-answers'), {
    start: { 'zebra-answers': false },
    // Started without the router's name: zebra runs, and vtysh -N a cannot reach it.
    'zebra-without-name': { 'zebra-answers': false },
    'zebra-by-hand': { 'zebra-answers': true },
    // FRR's script also starts zebra: the outcome is the same.
    'init-script': { 'zebra-answers': true },
  })
})
