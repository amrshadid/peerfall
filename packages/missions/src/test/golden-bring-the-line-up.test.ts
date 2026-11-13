import { describe } from 'vitest'
import { goldenMission, itJudgesEveryRun } from '#test/index'

// Runs recorded on the real Machine by `pnpm vm:golden bring-the-line-up`, judged again here.
const LASTS = {
  'a-address-lasts': true,
  'b-a-address-lasts': true,
  'b-c-address-lasts': true,
  'c-address-lasts': true,
  'a-route-lasts': true,
  'c-route-lasts': true,
}
const NOTHING_LASTS = Object.fromEntries(Object.keys(LASTS).map((objective) => [objective, false]))

describe('Bring the Line Up, on the Machine', () => {
  itJudgesEveryRun(goldenMission('bring-the-line-up'), {
    start: { 'a-reaches-c': false, ...NOTHING_LASTS },
    // Everything right in the running configurations, never saved, then every router restarted.
    'not-saved': { 'a-reaches-c': false, ...NOTHING_LASTS },
    // Addresses from Linux, routes in FRR and saved: a reaches c, and FRR's files lack the addresses.
    'addresses-from-linux': {
      'a-reaches-c': true,
      ...NOTHING_LASTS,
      'a-route-lasts': true,
      'c-route-lasts': true,
    },
    // The way there only, saved and restarted: c has no route back, so a's pings go unanswered.
    'no-way-back': { 'a-reaches-c': false, ...LASTS, 'c-route-lasts': false },
    'line-up': { 'a-reaches-c': true, ...LASTS },
  })
})
