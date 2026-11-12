import type { ChapterEntry, MissionDefinition } from '@peerfall/game/types'
import { appContent } from '@peerfall/missions/utils'
import { hrefOf } from '@shared/navigation'
import { describe, expect, it, vi } from 'vitest'
import {
  continueTargetOf,
  currentChapter,
  firstMissionOf,
  lastPlayedText,
  titleContentsOf,
  volumeOf,
} from './title-contents.util'

const loaded = appContent()
if (!loaded.ok) {
  throw new Error(loaded.errors.join('\n'))
}
const { game } = loaded.value
// A mission in the middle of the journey, so "the first with missions" is a different chapter.
const mission = game.mission('the-link-that-never-went-down') as MissionDefinition

/** The real curriculum, every mission with the given status. */
const chaptersWith = (status: 'available' | 'in_progress' | 'completed'): ChapterEntry[] =>
  game.chapters.map((chapter) => ({
    chapter,
    missions: game.missionsIn(chapter.id).map((each) => ({ mission: each, status, attempts: 0, hintsUsed: 0 })),
  }))

describe('titleContentsOf', () => {
  it('lists New game, then the map with the stage progress, and Settings', () => {
    const onNewGame = vi.fn()
    const chapters = chaptersWith('completed')
    const contents = titleContentsOf({ chapter: currentChapter(chapters, mission), firstMission: mission, onNewGame })
    expect(contents.map((entry) => entry.id)).toEqual(['new', 'map', 'settings'])
    expect(contents[0]?.reference).toBe('from The Link That Never Went Down')
    expect(contents[1]).toMatchObject({ reference: 'Stage 4, 1 of 1 passed', href: hrefOf({ name: 'map' }) })
    contents[0]?.onSelect?.()
    expect(onNewGame).toHaveBeenCalledOnce()
  })

  it('still names the journey before any content', () => {
    const contents = titleContentsOf({ chapter: undefined, firstMission: undefined, onNewGame: () => {} })
    expect(contents[1]?.reference).toBe('the journey')
  })
})

describe('the stage the player is in', () => {
  it('is the chapter of the mission to continue, else the first with missions', () => {
    const chapters = chaptersWith('available')
    expect(currentChapter(chapters, mission)?.chapter.id).toBe('recover-from-failure')
    expect(currentChapter(chapters, null)?.chapter.id).toBe('first-router')
    expect(volumeOf(currentChapter(chapters, mission))).toBe('Stage 4: Recover from failure')
    expect(volumeOf(undefined)).toBe('The journey')
  })
})

describe('continueTargetOf', () => {
  it('links to the mission and says where it is and how far', () => {
    const target = continueTargetOf({
      mission,
      chapters: chaptersWith('in_progress'),
      lastPlayed: ' · last played just now',
    })
    expect(target.href).toBe(hrefOf({ name: 'mission', missionId: mission.id }))
    expect(target.where).toBe('Stage 4 · Recover from failure · The Link That Never Went Down')
    expect(target.step).toBe('In progress · last played just now')
  })
})

describe('firstMissionOf', () => {
  it('says where New game starts, with the mission in one sentence', () => {
    expect(firstMissionOf(mission)).toEqual({
      where: 'Start at The Link That Never Went Down.',
      step: mission.objective,
    })
    expect(firstMissionOf(undefined).where).toBe('No mission is written yet.')
  })
})

describe('lastPlayedText', () => {
  it('is empty before the first save', () => {
    expect(lastPlayedText(1000, null)).toBe('')
    expect(lastPlayedText(1000, 1000)).toBe(' · last played just now')
  })
})
