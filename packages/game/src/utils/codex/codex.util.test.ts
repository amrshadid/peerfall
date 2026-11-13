import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, exampleContent, FOLLOW_UP_MISSION } from '#test/index'
import type { CodexView } from '#types/definitions/codex'
import type { Progress } from '#types/definitions/progress'
import { codexView, collectCodex } from '#utils/codex/codex.util'
import { emptyProgress, startMission } from '#utils/progress/index'

const content = exampleContent()

function completed(progress: Progress, missionId: string): Progress {
  return {
    ...progress,
    missions: progress.missions.map((record) =>
      record.missionId === missionId ? { ...record, completedAt: 5 } : record
    ),
    completionOrder: [...progress.completionOrder, missionId],
  }
}

const states = (view: CodexView) =>
  view.chapters.flatMap((chapter) => chapter.cards.map((entry) => [entry.card.id, entry.state]))

describe('codexView', () => {
  it('makes one chapter per stage that adds cards, its cards in play order with their mission number', () => {
    const view = codexView(emptyProgress(), content)
    expect(view.chapters.map((chapter) => chapter.chapter.id)).toEqual(['recover-from-failure'])
    expect(view.chapters[0]?.cards.map((entry) => [entry.card.id, entry.missionId, entry.missionNumber])).toEqual([
      ['bfd', EXAMPLE_MISSION.id, '1.1'],
      ['bfd-timers', FOLLOW_UP_MISSION.id, '1.2'],
    ])
    expect(view).toMatchObject({ filed: 0, total: 2, glossary: [] })
  })

  it('hides the cards of missions not started, shows them once started and files them once completed', () => {
    expect(states(codexView(emptyProgress(), content))).toEqual([
      ['bfd', 'hidden'],
      ['bfd-timers', 'hidden'],
    ])
    const started = startMission(emptyProgress(), EXAMPLE_MISSION.id, 1)
    expect(states(codexView(started, content))).toEqual([
      ['bfd', 'seen'],
      ['bfd-timers', 'hidden'],
    ])
    expect(states(codexView(completed(started, EXAMPLE_MISSION.id), content))).toEqual([
      ['bfd', 'filed'],
      ['bfd-timers', 'hidden'],
    ])
  })

  it('links a deepens chain both ways', () => {
    const [first, second] = codexView(emptyProgress(), content).chapters[0]?.cards ?? []
    expect(first?.deepens).toBeNull()
    expect(first?.deepenedBy).toEqual([
      { cardId: 'bfd-timers', term: 'BFD timers', missionNumber: '1.2', state: 'hidden' },
    ])
    expect(second?.deepens).toEqual({ cardId: 'bfd', term: 'BFD', missionNumber: '1.1', state: 'hidden' })
    expect(second?.deepenedBy).toEqual([])
  })

  it('says what the player can now do only once every mission of the stage is completed', () => {
    const one = completed(startMission(emptyProgress(), EXAMPLE_MISSION.id, 1), EXAMPLE_MISSION.id)
    expect(codexView(one, content).chapters[0]).toMatchObject({ finished: false, youCanNow: [], filed: 1 })
    const both = completed(startMission(one, FOLLOW_UP_MISSION.id, 2), FOLLOW_UP_MISSION.id)
    expect(codexView(both, content).chapters[0]).toMatchObject({
      finished: true,
      youCanNow: ['measure an outage', 'make OSPF notice a dead link in under a second'],
    })
  })

  it('puts every found card in the glossary, alphabetically, and none still hidden', () => {
    const both = startMission(startMission(emptyProgress(), FOLLOW_UP_MISSION.id, 1), EXAMPLE_MISSION.id, 2)
    expect(codexView(both, content).glossary.map((entry) => entry.term)).toEqual(['BFD', 'BFD timers'])
    const one = startMission(emptyProgress(), FOLLOW_UP_MISSION.id, 1)
    expect(codexView(one, content).glossary.map((entry) => entry.cardId)).toEqual(['bfd-timers'])
  })
})

describe('collectCodex', () => {
  it('lists the filed cards in the order their missions were completed', () => {
    const progress = completed(
      completed(
        startMission(startMission(emptyProgress(), EXAMPLE_MISSION.id, 1), FOLLOW_UP_MISSION.id, 2),
        FOLLOW_UP_MISSION.id
      ),
      EXAMPLE_MISSION.id
    )
    expect(collectCodex(progress, content).map((entry) => entry.card.id)).toEqual(['bfd-timers', 'bfd'])
  })
})
