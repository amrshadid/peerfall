// @vitest-environment jsdom
import { useGuidePace } from '@features/guide/hooks/pace'
import type { GuidePace, GuidePart, GuidePresentationProps, GuideStoryBlock } from '@features/guide/types'
import { beatsOf, pacedGuideOf } from '@features/guide/utils/story'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMMANDS, HINTS, OBJECTIVES } from '@/test/fixtures/guide.fixture'
import { STORY_SCENE, STORY_SEE } from '@/test/fixtures/story.fixture'
import { GuidePresentation } from './GuidePresentation'

afterEach(cleanup)

const BASE: GuidePresentationProps = {
  stepLabel: 'See it',
  reviewNote: null,
  beats: beatsOf(STORY_SCENE),
  onContinue: null,
  showObjectives: true,
  objectives: OBJECTIVES,
  chips: [],
  hints: { by: 'zebra', revealed: [], left: 3, onReveal: vi.fn() },
  codex: [],
  codexOpen: false,
  note: null,
  actions: [],
}

// An unanswered question, as the pacing hands it over: answerable.
const withPick = (part: GuidePart): GuidePart => (part.kind === 'predict' ? { ...part, onPick: vi.fn() } : part)

function guide(overrides: Partial<GuidePresentationProps> = {}) {
  const props = { ...BASE, ...overrides }
  render(<GuidePresentation {...props} />)
  return props
}

/** The Guide as the mission container drives it: `finish` stands for a command finished in the terminal. */
function PacedGuide({ blocks, onPace }: { blocks: readonly GuideStoryBlock[]; onPace: (pace: GuidePace) => void }) {
  const pace = useGuidePace('mission#see')
  onPace(pace)
  const paced = pacedGuideOf(beatsOf(blocks), pace, false)
  return <GuidePresentation {...BASE} beats={paced.beats} onContinue={paced.onContinue} />
}

function paced(blocks: readonly GuideStoryBlock[]) {
  let latest: GuidePace | null = null
  render(<PacedGuide blocks={blocks} onPace={(pace) => (latest = pace)} />)
  return { finish: () => act(() => latest?.advance()) }
}

describe('GuidePresentation', () => {
  it('introduces the first speaker with their portrait and real term, and lets another cut in', () => {
    guide()
    const transcript = screen.getByRole('region', { name: 'See it: transcript' })
    expect(within(transcript).getByText('zebra')).toBeTruthy()
    expect(within(transcript).getByText("FRR's core daemon, keeper of the routes")).toBeTruthy()
    expect(transcript.textContent).toContain("watchfrr · FRR's watchdog")
  })

  it('prints a code block as the Machine printed it', () => {
    guide({ beats: beatsOf(STORY_SEE).slice(0, 2) })
    const code = document.querySelector('pre.guide__code')
    expect(code?.textContent).toContain('Interface       Status  VRF')
  })

  it('counts the objectives met, in words as well as by its box', () => {
    guide()
    const objectives = screen.getByRole('region', { name: /^Objectives/ })
    expect(within(objectives).getByText('1 of 3 met')).toBeTruthy()
    expect(within(objectives).getAllByRole('img', { name: 'Passes' })).toHaveLength(1)
  })

  it('keeps the objectives back while the scene is read', () => {
    guide({ showObjectives: false })
    expect(screen.queryByRole('region', { name: /^Objectives/ })).toBeNull()
  })

  it('runs a chip in the terminal on a click, beside its one-line explain', () => {
    const run = vi.fn()
    guide({ chips: COMMANDS.map((chip) => ({ ...chip, onRun: () => run(chip.command) })) })
    const commands = screen.getByRole('region', { name: 'Commands to try' })
    expect(within(commands).getByText(/dead time left/)).toBeTruthy()
    fireEvent.click(within(commands).getByRole('button', { name: 'Run show ip route 10.255.0.3 in the terminal' }))
    expect(run).toHaveBeenCalledWith('show ip route 10.255.0.3')
  })

  describe('pacing', () => {
    it('shows the text up to the pause, and the rest once a command finishes', () => {
      const { finish } = paced(STORY_SEE)
      expect(screen.queryByText(/That is me answering/)).toBeNull()
      finish()
      expect(screen.getByText(/That is me answering/)).toBeTruthy()
    })

    it('shows the rest on Continue too', () => {
      paced(STORY_SEE)
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(screen.getByText(/That is me answering/)).toBeTruthy()
    })

    it('waits for an answer before going past a question, whatever is run meanwhile', () => {
      const { finish } = paced(STORY_SEE)
      finish()
      finish()
      finish()
      expect(screen.getByRole('group', { name: 'Your call, before zebra answers' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
      expect(screen.queryByText(/a router knows its own networks/)).toBeNull()
    })

    it('names the speaker who asked the question, or none for narration', () => {
      const question = (speaker: string | null): GuideStoryBlock[] => [
        {
          kind: 'predict',
          speaker,
          text: 'What will happen?',
          options: [
            { text: 'One thing', right: true },
            { text: 'Another', right: false },
          ],
        },
      ]
      guide({ beats: beatsOf(question('watchfrr')).map((beat) => beat.map(withPick)) })
      expect(screen.getByRole('group', { name: 'Your call, before watchfrr answers' })).toBeTruthy()
      cleanup()
      guide({ beats: beatsOf(question(null)).map((beat) => beat.map(withPick)) })
      expect(screen.getByRole('group', { name: 'Your call' })).toBeTruthy()
    })

    it("marks the player's call beside what happened, once the command has run, never scored", () => {
      const { finish } = paced(STORY_SEE)
      finish()
      fireEvent.click(screen.getByRole('button', { name: 'Nothing at all' }))
      const answers = screen.getByRole('list', { name: 'Answers' })
      expect(within(answers).getByText('your call')).toBeTruthy()
      expect(within(answers).queryByText('what happens')).toBeNull()
      expect(within(answers).getByText('Kept. Now do it, and see what happens.')).toBeTruthy()
      finish()
      const marked = screen.getByRole('list', { name: 'Answers' })
      const right = within(marked).getByText('what happens').closest('li')
      expect(right?.textContent).toContain('Only the connected routes')
      expect(within(marked).getByText('your call').closest('li')?.textContent).toContain('Nothing at all')
      expect(document.body.textContent).not.toMatch(/score: |points|correct!/i)
    })

    it('"Just show me" answers nothing and moves on', () => {
      const { finish } = paced(STORY_SEE)
      finish()
      fireEvent.click(screen.getByRole('button', { name: 'Just show me' }))
      expect(screen.getByText(/a router knows its own networks/)).toBeTruthy()
      expect(screen.queryByText('your call')).toBeNull()
    })
  })

  describe('hints', () => {
    it('offers three, a nudge first, before any is shown', () => {
      guide()
      const hints = screen.getByRole('region', { name: /hints/ })
      expect(within(hints).getByText('3 left')).toBeTruthy()
      expect(within(hints).getByText(/a nudge first, then the concept, then the spot/)).toBeTruthy()
    })

    it("names them after the stage's guide", () => {
      guide({ hints: { by: 'bfdd', revealed: [], left: 3, onReveal: vi.fn() } })
      expect(screen.getByRole('region', { name: /bfdd's hints/ })).toBeTruthy()
    })

    it('shows them one at a time, each named by its tier', () => {
      const onReveal = vi.fn()
      guide({ hints: { by: 'zebra', revealed: HINTS.slice(0, 1), left: 2, onReveal } })
      const hints = screen.getByRole('region', { name: /hints/ })
      expect(within(hints).getAllByRole('listitem')).toHaveLength(1)
      expect(within(hints).getByText('Hint 1, a nudge')).toBeTruthy()
      fireEvent.click(within(hints).getByRole('button', { name: 'Show the next hint' }))
      expect(onReveal).toHaveBeenCalledTimes(1)
    })

    it("lets the third hint's command be copied", () => {
      const onCopy = vi.fn()
      guide({ hints: { by: 'zebra', revealed: HINTS, left: 0, onReveal: null, onCopy } })
      const hints = screen.getByRole('region', { name: /hints/ })
      expect(within(hints).getByText('Hint 3, the spot')).toBeTruthy()
      expect(within(hints).getByText('none left')).toBeTruthy()
      fireEvent.click(within(hints).getByRole('button', { name: 'Copy ip ospf bfd' }))
      expect(onCopy).toHaveBeenCalledWith('ip ospf bfd')
      expect(within(hints).getByRole('button', { name: 'Copy ip ospf bfd' }).textContent).toBe('Copied')
    })
  })

  describe('codex', () => {
    const codex = [{ id: 'vtysh', term: 'vtysh', href: '#/mission/m?card=vtysh' }]

    it('folds the cards to one line until the terms are met', () => {
      guide({ codex })
      expect(screen.getByText('1 card for this mission')).toBeTruthy()
    })

    it('lays them open as links over the mission', () => {
      guide({ codex, codexOpen: true })
      const section = screen.getByRole('region', { name: 'Codex' })
      expect(within(section).getByRole('link', { name: 'vtysh' }).getAttribute('href')).toBe('#/mission/m?card=vtysh')
    })
  })

  it('keeps an action that waits focusable and says why', () => {
    const onSelect = vi.fn()
    guide({
      actions: [
        { id: 'probe', label: 'Send probe', kind: 'default', unavailable: 'The routers are still starting.', onSelect },
      ],
    })
    const button = screen.getByRole('button', { name: /Send probe/ })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(button)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
