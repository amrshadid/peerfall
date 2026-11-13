// Prints every mission against the content budgets and the chain of concepts (docs/MISSIONS.md).
// Usage: pnpm content:report. Fails only when a mission of ENFORCED_MISSIONS breaks a budget, or
// when the content does not load.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConceptViolation, GameContent } from '@peerfall/game/types'
import { CORE_CONCEPT_BUDGET } from '@peerfall/game/types'
import { conceptChain } from '@peerfall/game/utils'
import type { MissionLint } from '#types/definitions/lint'
import { ENFORCED_MISSIONS, lintMission, STORY_WORD_BUDGET } from '#utils/lint/index'
import { readContentDir } from '#utils/loader/disk-content.util'
import { loadContent } from '#utils/loader/load-content.util'

const contentDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content')
const paint = (code: number) => (text: string) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text)
const red = paint(31)
const green = paint(32)
const yellow = paint(33)
const dim = paint(2)

const over = (value: number, budget: number) => (value > budget ? red : green)(`${value}/${budget}`)

function printMission(game: GameContent, lint: MissionLint): void {
  const mission = game.mission(lint.missionId)
  const enforced = ENFORCED_MISSIONS.includes(lint.missionId)
  const status = lint.problems.length === 0 ? green('green') : enforced ? red('red') : yellow('warn')
  console.log(
    `\n${game.numberOf(lint.missionId) ?? ''} ${mission?.title ?? lint.missionId}  ${status}${enforced ? ' (enforced)' : ''}`
  )
  console.log(`  teaches ${over(lint.concepts, CORE_CONCEPT_BUDGET)}: ${(mission?.teaches ?? []).join(', ') || '-'}`)
  console.log(`  uses: ${(mission?.uses ?? []).join(', ') || '-'}`)
  const story = STORY_WORD_BUDGET
  const storyText = `${lint.storyWords}/${story.min}–${story.max}`
  const steps = lint.steps.map((step) => `${step.section} ${over(step.words, step.budget)}`).join('  ')
  const storyColour = lint.storyWords < story.min || lint.storyWords > story.max ? red : green
  console.log(`  story ${storyColour(storyText)}  ${steps}  asides ${over(lint.asides, 0)}`)
  const banned = lint.banned.map((use) => `${use.section} "${use.phrase}"`)
  if (banned.length > 0) {
    console.log(`  banned: ${red(banned.join(', '))}`)
  }
  const cards = lint.problems.filter((problem) => problem.startsWith('codex '))
  console.log(
    `  codex: ${cards.length === 0 ? green(`${lint.cards.length} cards within budget`) : red(cards.join('; '))}`
  )
}

function describeViolation(game: GameContent, violation: ConceptViolation): string {
  const numberOf = (id: string) => game.numberOf(id) ?? id
  const where = numberOf(violation.missionId)
  switch (violation.kind) {
    case 'used-before-taught':
      return `${violation.concept}: used in ${where}, ${violation.other ? `taught later in ${numberOf(violation.other)}` : 'never taught'}`
    case 'taught-twice':
      return `${violation.concept}: taught in ${violation.other ? numberOf(violation.other) : '?'}, again in ${where}`
    case 'never-used-again':
      return `${violation.concept}: taught in ${where}, never used again`
  }
}

const loaded = loadContent(readContentDir(contentDir))
if (!loaded.ok) {
  console.error(loaded.errors.join('\n'))
  process.exit(1)
}
const { game, storyOf } = loaded.value
const lints = game.missions.flatMap((mission) => {
  const story = storyOf(mission.id)
  return story ? [lintMission(mission, story)] : []
})
console.log('Content budgets (docs/MISSIONS.md)')
for (const lint of lints) {
  printMission(game, lint)
}

const violations = conceptChain(game)
console.log(
  `\nChain of concepts: ${violations.length === 0 ? green('no breaks') : yellow(`${violations.length} breaks`)}`
)
for (const kind of ['used-before-taught', 'taught-twice', 'never-used-again'] as const) {
  const ofKind = violations.filter((violation) => violation.kind === kind)
  if (ofKind.length > 0) {
    console.log(`  ${kind} (${ofKind.length})`)
    for (const violation of ofKind) {
      console.log(`    ${describeViolation(game, violation)}`)
    }
  }
}

const failing = lints.filter((lint) => ENFORCED_MISSIONS.includes(lint.missionId) && lint.problems.length > 0)
const warned = lints.filter((lint) => lint.problems.length > 0).length
console.log(dim(`\n${lints.length - warned} green, ${warned} over budget, ${failing.length} enforced and failing`))
if (failing.length > 0) {
  process.exit(1)
}
