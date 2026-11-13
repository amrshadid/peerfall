import { describe, expect, it } from 'vitest'
import { ENFORCED_MISSIONS, lintMission } from '#utils/lint/index'
import { appContent } from '#utils/loader/app-content.util'

const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const { game, storyOf } = loaded.value

describe('the content budgets', () => {
  it('names only missions that exist in ENFORCED_MISSIONS', () => {
    expect(ENFORCED_MISSIONS.filter((id) => game.mission(id) === undefined)).toEqual([])
  })

  // The others only warn, in pnpm content:report, until they are rewritten.
  it('holds every enforced mission to its budgets', () => {
    const failing = ENFORCED_MISSIONS.flatMap((id) => {
      const mission = game.mission(id)
      const story = storyOf(id)
      return mission && story ? lintMission(mission, story).problems.map((problem) => `${id}: ${problem}`) : []
    })
    expect(failing).toEqual([])
  })
})
