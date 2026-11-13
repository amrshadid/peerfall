import type { GuidePace, GuidePredict } from '@features/guide/types'
import { describe, expect, it, vi } from 'vitest'
import { MISSION_HINTS } from '@/test/fixtures/guide.fixture'
import { STORY, STORY_BUILD, STORY_SEE } from '@/test/fixtures/story.fixture'
import { beatsOf, blocksFor, chipsOf, hintsOf, pacedGuideOf, speakerOf } from './guide-story.util'

const pace = (overrides: Partial<GuidePace> = {}): GuidePace => ({
  shown: 1,
  picks: {},
  advance: vi.fn(),
  pick: vi.fn(),
  ...overrides,
})

const predictsOf = (beats: ReturnType<typeof pacedGuideOf>['beats']): GuidePredict[] =>
  beats.flatMap((beat) => beat.filter((part): part is GuidePredict => part.kind === 'predict'))

describe('speakerOf', () => {
  it('names the cast with the real part of FRR they are', () => {
    expect(speakerOf('zebra')).toMatchObject({ portrait: 'zebra', term: "FRR's core daemon, keeper of the routes" })
    expect(speakerOf('watchfrr')).toMatchObject({ portrait: 'watchfrr' })
    expect(speakerOf('bfdd')).toMatchObject({ term: "FRR's BFD daemon", portrait: null })
  })

  it('lets narration and unknown names speak without a portrait', () => {
    expect(speakerOf(null)).toMatchObject({ id: 'narrator', portrait: null })
    expect(speakerOf('A Stranger')).toEqual({ id: 'A Stranger', name: 'A Stranger', term: '', portrait: null })
  })
})

describe('blocksFor', () => {
  it("shows a step's own section, else the one before it", () => {
    expect(blocksFor('see', STORY)).toEqual(STORY.get('see-it'))
    expect(blocksFor('watch', STORY)).toEqual(STORY.get('debrief'))
  })

  it('ends the debrief with the real world, after a pause and under its own heading', () => {
    const blocks = blocksFor('debrief', STORY)
    expect(blocks.map((block) => block.kind)).toEqual(['line', 'pause', 'heading', 'line'])
    expect(blocks[2]).toEqual({ kind: 'heading', text: 'In the real world' })
  })

  it('has nothing for a mission without a story', () => {
    expect(blocksFor('scene', undefined)).toEqual([])
  })
})

describe('beatsOf', () => {
  it('cuts the story at each pause and after each question', () => {
    const beats = beatsOf(STORY_SEE)
    expect(beats.map((beat) => beat.map((part) => part.kind))).toEqual([
      ['lines'],
      ['code', 'lines', 'predict'],
      ['lines'],
    ])
  })

  it('marks a question followed by a pause as held for the command', () => {
    const [, second] = beatsOf(STORY_SEE)
    expect(second?.find((part) => part.kind === 'predict')).toMatchObject({ held: true, id: 0 })
    const [first] = beatsOf(STORY_BUILD)
    expect(first?.find((part) => part.kind === 'predict')).toMatchObject({ held: false })
  })
})

describe('pacedGuideOf', () => {
  const beats = beatsOf(STORY_SEE)

  it('shows the story up to the first pause, with Continue for the rest', () => {
    const guide = pacedGuideOf(beats, pace(), false)
    expect(guide.beats).toHaveLength(1)
    expect(guide.onContinue).not.toBeNull()
    expect(guide.finished).toBe(false)
  })

  it('stops at an open question, whatever the player runs meanwhile', () => {
    const guide = pacedGuideOf(beats, pace({ shown: 9 }), false)
    expect(guide.beats).toHaveLength(2)
    expect(guide.onContinue).toBeNull()
    expect(predictsOf(guide.beats)[0]?.onPick).not.toBeNull()
  })

  it('keeps a held answer unmarked until a command brings the next beat', () => {
    const picked = pace({ shown: 2, picks: { 0: 1 } })
    const waiting = predictsOf(pacedGuideOf(beats, picked, false).beats)[0]
    expect(waiting).toMatchObject({ picked: 1, revealed: false, onPick: null })
    const after = predictsOf(pacedGuideOf(beats, { ...picked, shown: 3 }, false).beats)[0]
    expect(after).toMatchObject({ picked: 1, revealed: true })
  })

  it('records a held pick without moving on; "just show me" moves on at once', () => {
    const pick = vi.fn()
    const [question] = predictsOf(pacedGuideOf(beats, pace({ shown: 2, pick }), false).beats)
    question?.onPick?.(0)
    expect(pick).toHaveBeenLastCalledWith(0, 0, 2)
    question?.onPick?.(null)
    expect(pick).toHaveBeenLastCalledWith(0, null, 3)
  })

  it('reveals an unheld answer as soon as it is picked', () => {
    const build = beatsOf(STORY_BUILD)
    const [question] = predictsOf(pacedGuideOf(build, pace({ picks: { 0: 0 } }), false).beats)
    expect(question).toMatchObject({ revealed: true, picked: 0 })
  })

  it('shows a step looked back at whole, its questions answered', () => {
    const guide = pacedGuideOf(beats, pace(), true)
    expect(guide.beats).toHaveLength(3)
    expect(guide.finished).toBe(true)
    expect(predictsOf(guide.beats)[0]).toMatchObject({ revealed: true, onPick: null })
  })
})

describe('chipsOf', () => {
  it('runs a chip in the terminal on a click', () => {
    const run = vi.fn()
    const [chip] = chipsOf([{ command: 'show ip route', explain: 'The routes.' }], run)
    chip?.onRun?.()
    expect(run).toHaveBeenCalledWith('show ip route')
  })

  it('only names the command while the terminal cannot take it', () => {
    expect(chipsOf([{ command: 'vtysh', explain: 'FRR’s shell.' }], null)[0]?.onRun).toBeNull()
  })
})

describe('hintsOf', () => {
  it('names each revealed hint by its tier, in order', () => {
    expect(hintsOf(MISSION_HINTS, 0)).toEqual([])
    expect(hintsOf(MISSION_HINTS, 3).map((hint) => hint.tier)).toEqual(['a nudge', 'the concept', 'the spot'])
    expect(hintsOf(MISSION_HINTS, 3)[2]?.command).toBe('ip ospf bfd')
  })
})
