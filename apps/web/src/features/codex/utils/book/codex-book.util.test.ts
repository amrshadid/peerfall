import { describe, expect, it } from 'vitest'
import { CODEX, FIELD_GUIDE, FINISHED_CODEX, missionLabel } from '@/test/fixtures/codex.fixture'
import { codexIndexOf, codexPageOf, fieldGuideRowsOf, frrSourceUrl, glossaryRowsOf } from './codex-book.util'

const AT_START = { cardId: null, chapterId: null }

describe('codexIndexOf', () => {
  it('lists every chapter in play order, with its progress', () => {
    const index = codexIndexOf(CODEX, AT_START)
    expect(index.map((chapter) => [chapter.heading, chapter.count])).toEqual([
      ['Stage 1 · First router', '2 / 3 filed'],
      ['Stage 2 · Follow a packet', '0 / 1 filed'],
    ])
  })

  it('keeps a card not found yet as a blank outline with its mission number, never its term', () => {
    const [first] = codexIndexOf(CODEX, AT_START)
    const blank = first?.entries[2]
    expect(blank).toMatchObject({ state: 'blank', term: null, href: null, missionNumber: '1.5' })
    expect(JSON.stringify(first)).not.toContain('running')
  })

  it('links found cards in teaching order and marks the one on the page', () => {
    const [first, second] = codexIndexOf(CODEX, { cardId: 'watchfrr', chapterId: null })
    expect(first?.entries.map((entry) => entry.term)).toEqual(['vtysh', 'watchfrr', null])
    expect(first?.entries[1]).toMatchObject({ current: true, href: '#/codex/watchfrr', state: 'filed' })
    expect(second?.entries[0]).toMatchObject({ state: 'seen', term: 'the RIB' })
  })
})

describe('codexPageOf', () => {
  it("opens on the latest chapter's title page: its story, its guide and the real part of FRR", () => {
    const page = codexPageOf(CODEX, { cardId: null, chapterId: 'first-router' }, missionLabel)
    expect(page.kind).toBe('chapter')
    if (page.kind !== 'chapter') return
    expect(page.chapter).toMatchObject({
      kicker: 'Stage 1',
      title: 'First router',
      guide: { name: 'zebra', term: "FRR's core daemon, keeper of the routes" },
      standsFor: 'zebra, vtysh and the daemons watchfrr starts',
      count: '2 / 3 filed',
      youCanNow: [],
    })
    expect(codexPageOf(CODEX, AT_START, missionLabel)).toMatchObject({ chapter: { id: 'follow-a-packet' } })
  })

  it('ends a finished chapter with what the player can now do', () => {
    const page = codexPageOf(FINISHED_CODEX, { cardId: null, chapterId: 'first-router' }, missionLabel)
    expect(page.kind === 'chapter' && page.chapter.youCanNow).toEqual([
      'Start FRR the way it is started on a real router.',
      'Save a change so it survives a restart.',
    ])
  })

  it('prints a card with its sources linked to FRR 10.6.1 and the mission that files it', () => {
    const page = codexPageOf(CODEX, { cardId: 'vtysh', chapterId: null }, missionLabel)
    expect(page).toMatchObject({
      kind: 'card',
      filed: true,
      card: {
        term: 'vtysh',
        sources: [{ path: 'vtysh/vtysh.c', href: 'https://github.com/FRRouting/frr/blob/frr-10.6.1/vtysh/vtysh.c' }],
        filedIn: '1.2 Meet FRR',
      },
    })
  })

  it('links deepens both ways, hiding the term of a card not found yet', () => {
    const before = codexPageOf(CODEX, { cardId: 'vtysh', chapterId: null }, missionLabel)
    expect(before.kind === 'card' && before.card.deepenedBy).toEqual([{ term: null, href: null, missionNumber: '1.5' }])
    const after = codexPageOf(FINISHED_CODEX, { cardId: 'running-config', chapterId: null }, missionLabel)
    expect(after.kind === 'card' && after.card.deepens).toEqual({
      term: 'vtysh',
      href: '#/codex/vtysh',
      missionNumber: '1.2',
    })
    const back = codexPageOf(FINISHED_CODEX, { cardId: 'vtysh', chapterId: null }, missionLabel)
    expect(back.kind === 'card' && back.card.deepenedBy[0]?.href).toBe('#/codex/running-config')
  })

  it('never opens a hidden card, even from its address', () => {
    expect(codexPageOf(CODEX, { cardId: 'running-config', chapterId: null }, missionLabel).kind).toBe('chapter')
  })

  it('has nothing to show before there is a chapter', () => {
    expect(codexPageOf({ chapters: [], glossary: [], filed: 0, total: 0 }, AT_START, missionLabel)).toEqual({
      kind: 'empty',
    })
  })
})

describe('the Field Guide and the glossary', () => {
  it('says where each command is typed and where it was met', () => {
    expect(fieldGuideRowsOf(FIELD_GUIDE, missionLabel)).toEqual([
      {
        name: 'vtysh',
        where: 'Linux shell',
        what: "Opens FRR's shell on the router.",
        firstMet: '1.2 Meet FRR',
        deepenedIn: [],
      },
      {
        name: 'show running-config',
        where: 'vtysh',
        what: 'Prints what the daemons are doing now.',
        firstMet: '1.2 Meet FRR',
        deepenedIn: ['1.5 Change One Thing'],
      },
    ])
  })

  it('links each word to its card', () => {
    expect(glossaryRowsOf(CODEX.glossary)[0]).toMatchObject({ term: 'vtysh', href: '#/codex/vtysh' })
  })

  it('links a source path into the pinned release', () => {
    expect(frrSourceUrl('/zebra/zebra_rib.c')).toBe(
      'https://github.com/FRRouting/frr/blob/frr-10.6.1/zebra/zebra_rib.c'
    )
  })
})
