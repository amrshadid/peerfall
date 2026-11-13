import { describe, expect, it } from 'vitest'
import { goldenMission } from '#test/index'
import { appContent } from '#utils/loader/app-content.util'

// Missions are judged live: an objective met by the network as it starts would stay met the whole
// game, whatever the player does. A mission judged from a fault run is exempt: before the fault,
// reaching the far router is what a healthy network does, and the fault run is what is judged.
const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const liveJudged = loaded.value.game.missions.filter((mission) => mission.fault === undefined)

describe('the network as each mission starts', () => {
  it('meets no objective', () => {
    const met = liveJudged.flatMap((mission) =>
      Object.entries(goldenMission(mission.id).objectives('start'))
        .filter(([, passed]) => passed)
        .map(([objective]) => `${mission.id}: ${objective}`)
    )
    expect(met).toEqual([])
  })
})
