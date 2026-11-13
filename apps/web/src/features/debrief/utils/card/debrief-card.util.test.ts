import { CHAPTER_FIXTURE, CONTENT_FIXTURE, MISSION_FIXTURE } from '@features/mission/utils/fixtures'
import type { GameContent, Progress } from '@peerfall/game/types'
import { codexView } from '@peerfall/game/utils'
import { describe, expect, it } from 'vitest'
import { DEFAULT_HEADLINE } from './debrief-card.constants'
import { debriefHeadlineOf, filedCardsOf, finishedStageOf } from './debrief-card.util'

const mission = MISSION_FIXTURE

const progressOf = (completed: boolean): Progress => ({
  missions: [
    {
      missionId: mission.id,
      firstStartedAt: 0,
      completedAt: completed ? 1 : null,
      attempts: 1,
      hintsRevealed: 0,
      runs: [],
    },
  ],
  completionOrder: completed ? [mission.id] : [],
  lastActive: mission.id,
})

const withOutcomes: GameContent = {
  ...CONTENT_FIXTURE.game,
  chapters: [{ ...CHAPTER_FIXTURE, outcomes: ['Turn on BFD so a dead link is noticed in under a second.'] }],
}

const label = (id: string) => `4.1 ${id}`

describe('debriefHeadlineOf', () => {
  it("takes the debrief's first sentence, as Kernelfall's card does", () => {
    const debrief = [{ kind: 'line', speaker: 'zebra', text: 'FRR is daemons. You started one by hand.' }] as const
    expect(debriefHeadlineOf(debrief)).toBe('FRR is daemons.')
  })

  it('ends the sentence at a question mark too', () => {
    const debrief = [{ kind: 'line', speaker: null, text: 'What is a router? A computer.' }] as const
    expect(debriefHeadlineOf(debrief)).toBe('What is a router?')
  })

  it('falls back to "Mission complete." without a debrief line', () => {
    expect(debriefHeadlineOf(undefined)).toBe(DEFAULT_HEADLINE)
    expect(debriefHeadlineOf([])).toBe(DEFAULT_HEADLINE)
  })
})

describe('filedCardsOf', () => {
  it("prints the mission's own cards, as the Codex prints them", () => {
    const cards = filedCardsOf(codexView(progressOf(true), CONTENT_FIXTURE.game), mission, label)
    expect(cards.map((card) => card.term)).toEqual(['BFD'])
    expect(cards[0]?.filedIn).toBe(`4.1 ${mission.id}`)
    expect(cards[0]?.sources[0]?.path).toBe('bfdd/bfd.c')
  })
})

describe('finishedStageOf', () => {
  it('gives the stage\'s "You can now…" lines once every mission in it is completed', () => {
    expect(finishedStageOf(codexView(progressOf(true), withOutcomes), mission)).toEqual({
      name: 'Stage 4 · Recover from failure',
      outcomes: ['Turn on BFD so a dead link is noticed in under a second.'],
    })
  })

  it('gives nothing while the stage is still open, or when it lists no outcomes', () => {
    expect(finishedStageOf(codexView(progressOf(false), withOutcomes), mission)).toBeNull()
    expect(finishedStageOf(codexView(progressOf(true), CONTENT_FIXTURE.game), mission)).toBeNull()
  })
})
