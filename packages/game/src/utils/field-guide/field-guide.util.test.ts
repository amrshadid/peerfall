import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, exampleChapters, FOLLOW_UP_MISSION } from '#test/index'
import type { FieldGuideEntry } from '#types/definitions/field-guide'
import { createGameContent } from '#utils/content/index'
import { fieldGuideView } from '#utils/field-guide/field-guide.util'
import { emptyProgress, startMission } from '#utils/progress/index'

const NEIGHBORS: FieldGuideEntry = {
  name: 'show ip ospf neighbor',
  kind: 'vtysh',
  what: "list the router's OSPF neighbors",
  firstMet: EXAMPLE_MISSION.id,
  deepenedIn: [FOLLOW_UP_MISSION.id],
}
const PEERS: FieldGuideEntry = {
  name: 'show bfd peers',
  kind: 'vtysh',
  what: 'list the BFD sessions',
  firstMet: FOLLOW_UP_MISSION.id,
  deepenedIn: [],
}

const built = createGameContent({
  chapters: exampleChapters(),
  missions: [EXAMPLE_MISSION, FOLLOW_UP_MISSION],
  fieldGuide: { entries: [PEERS, NEIGHBORS] },
})
if (!built.ok) {
  throw new Error(built.errors.join('\n'))
}
const content = built.value

describe('fieldGuideView', () => {
  it('stays closed until the mission of an entry is started', () => {
    expect(fieldGuideView(content, emptyProgress())).toEqual({ open: false, entries: [] })
  })

  it("shows the entries met so far, in the guide's order", () => {
    const first = startMission(emptyProgress(), EXAMPLE_MISSION.id, 1)
    expect(fieldGuideView(content, first)).toEqual({ open: true, entries: [NEIGHBORS] })
    const both = startMission(first, FOLLOW_UP_MISSION.id, 2)
    expect(fieldGuideView(content, both).entries).toEqual([PEERS, NEIGHBORS])
  })
})
