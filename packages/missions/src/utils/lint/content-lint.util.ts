import type { MissionDefinition } from '@peerfall/game/types'
import { CORE_CONCEPT_BUDGET } from '@peerfall/game/types'
import type { BannedUse, CardWords, MissionLint, StepWords, VocabularyRule } from '#types/definitions/lint'
import type { Story } from '#types/definitions/story'
import {
  ASIDE_BUDGET,
  BANNED_PHRASES,
  CODEX_WORD_BUDGETS,
  STEP_WORD_BUDGETS,
  STORY_WORD_BUDGET,
  VOCABULARY,
} from '#utils/lint/content-lint.constants'

const INLINE_CODE = /`[^`]*`/g
const WORD = /[\p{L}\p{N}]/u

/** A word is any token with a letter or digit, inline code included. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => WORD.test(token)).length
}

/** Outside inline code: `show ip route` is code, "(like this)" is an aside. */
export function countAsides(text: string): number {
  return text.replace(INLINE_CODE, '').split('(').length - 1
}

const escaped = (phrase: string) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const BANNED = BANNED_PHRASES.map((phrase) => ({ phrase, pattern: new RegExp(`\\b${escaped(phrase)}\\b`, 'i') }))

/** Picture words used outside their one meaning. Inline code is the Machine's text and never flagged. */
export function strayWords(
  missionId: string,
  prose: string,
  vocabulary: readonly VocabularyRule[] = VOCABULARY
): string[] {
  const text = prose.replace(INLINE_CODE, '')
  return vocabulary
    .filter(
      (rule) =>
        !rule.only?.includes(missionId) &&
        new RegExp(rule.pattern).test(rule.allowed ? text.replace(rule.allowed, '') : text)
    )
    .map((rule) => `${rule.word} (only ${rule.means})`)
}

function proseOf(story: Story, section: string): string[] {
  // A question and its answers are read like any line.
  return (story.sections.get(section) ?? []).flatMap((block) =>
    block.kind === 'line'
      ? [block.text]
      : block.kind === 'predict'
        ? [block.text, ...block.options.map((option) => option.text)]
        : []
  )
}

function cardWords(mission: MissionDefinition): CardWords[] {
  return mission.codex.map((card) => ({
    cardId: card.id,
    simple: countWords(card.simple),
    deep: countWords(card.deep ?? ''),
  }))
}

function problemsOf(lint: Omit<MissionLint, 'problems'>): string[] {
  const problems: string[] = []
  if (lint.concepts > CORE_CONCEPT_BUDGET) {
    problems.push(`teaches ${lint.concepts} concepts (budget ${CORE_CONCEPT_BUDGET})`)
  }
  if (lint.storyWords < STORY_WORD_BUDGET.min || lint.storyWords > STORY_WORD_BUDGET.max) {
    problems.push(`story: ${lint.storyWords} words (budget ${STORY_WORD_BUDGET.min}–${STORY_WORD_BUDGET.max})`)
  }
  for (const step of lint.steps.filter((counted) => counted.words > counted.budget)) {
    problems.push(`${step.section}: ${step.words} words (budget ${step.budget})`)
  }
  if (lint.asides > ASIDE_BUDGET) {
    problems.push(`${lint.asides} parenthetical asides (budget ${ASIDE_BUDGET})`)
  }
  for (const use of lint.banned) {
    problems.push(`${use.section}: "${use.phrase}"`)
  }
  for (const card of lint.cards) {
    if (card.simple > CODEX_WORD_BUDGETS.simple) {
      problems.push(`codex ${card.cardId}: simple ${card.simple} words (budget ${CODEX_WORD_BUDGETS.simple})`)
    }
    if (card.deep > CODEX_WORD_BUDGETS.deep) {
      problems.push(`codex ${card.cardId}: deep ${card.deep} words (budget ${CODEX_WORD_BUDGETS.deep})`)
    }
  }
  return problems
}

/** Measures one mission against the content budgets: words per step and per card, asides, banned phrases. */
export function lintMission(mission: MissionDefinition, story: Story): MissionLint {
  const steps: StepWords[] = Object.entries(STEP_WORD_BUDGETS).map(([section, budget]) => ({
    section,
    words: countWords(proseOf(story, section).join(' ')),
    budget,
  }))
  const stepProse = steps.flatMap((step) => proseOf(story, step.section)).join(' ')
  const banned: BannedUse[] = [...story.sections.keys()].flatMap((section) => {
    const prose = proseOf(story, section).join(' ')
    return [
      ...BANNED.filter(({ pattern }) => pattern.test(prose)).map(({ phrase }) => phrase),
      ...strayWords(mission.id, prose),
    ].map((phrase) => ({ phrase, section }))
  })
  const lint = {
    missionId: mission.id,
    concepts: mission.teaches.length,
    steps,
    storyWords: steps.reduce((sum, step) => sum + step.words, 0),
    asides: countAsides(stepProse),
    banned,
    cards: cardWords(mission),
  }
  return { ...lint, problems: problemsOf(lint) }
}
