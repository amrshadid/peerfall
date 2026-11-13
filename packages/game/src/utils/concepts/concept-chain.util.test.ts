import { describe, expect, it } from 'vitest'
import { exampleChapters, exampleMission } from '#test/index'
import type { ChapterDefinition } from '#types/definitions/mission'
import { conceptChain } from '#utils/concepts/concept-chain.util'

const mission = (
  id: string,
  teaches: string[],
  uses: string[],
  names: string[] = [],
  chapter = 'recover-from-failure'
) => exampleMission({ id, chapter, teaches, uses, names, codex: [] })

// Past the foundation stages, so a concept the last mission teaches needs no later mission.
const later = (): ChapterDefinition[] => exampleChapters().map((chapter) => ({ ...chapter, stage: chapter.stage + 2 }))

describe('conceptChain', () => {
  it('finds no break in a chain where each concept is taught before it is used', () => {
    const chapters = later()
    const missions = [mission('one', ['bfd'], []), mission('two', ['timers'], ['bfd'])]
    expect(conceptChain({ chapters, missions })).toEqual([])
  })

  it('names a concept used before it is taught, and one taught twice', () => {
    const chapters = later()
    const missions = [mission('one', ['bfd'], ['timers']), mission('two', ['timers', 'bfd'], [])]
    expect(conceptChain({ chapters, missions })).toEqual([
      { kind: 'used-before-taught', concept: 'timers', missionId: 'one', other: 'two' },
      { kind: 'taught-twice', concept: 'bfd', missionId: 'two', other: 'one' },
    ])
  })

  it('counts a concept only named as met, so a later mission may use it', () => {
    const chapters = exampleChapters()
    const missions = [mission('one', [], [], ['bfd']), mission('two', [], ['bfd'])]
    expect(conceptChain({ chapters, missions })).toEqual([])
  })

  it('wants every concept of the first stages used again later, and no concept of a later stage', () => {
    // The example's first chapter is stage 1, a foundation stage; its second is stage 2.
    const chapters: ChapterDefinition[] = [
      ...exampleChapters(),
      { ...exampleChapters()[1], id: 'third', stage: 3 } as ChapterDefinition,
    ]
    const missions = [mission('one', ['bfd', 'echo'], []), mission('two', ['late'], ['bfd'], [], 'third')]
    expect(conceptChain({ chapters, missions })).toEqual([
      { kind: 'never-used-again', concept: 'echo', missionId: 'one', other: null },
    ])
  })
})
