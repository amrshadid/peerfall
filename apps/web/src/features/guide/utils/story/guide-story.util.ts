import type {
  GuideBeat,
  GuideChip,
  GuideHint,
  GuidePace,
  GuidePart,
  GuideStepId,
  GuideStory,
  GuideStoryBlock,
  SpeakerInfo,
} from '@features/guide/types'
import { beatCommandsOf, releasesPause } from './guide-command.util'
import {
  GUIDE_STEPS,
  HINT_TIER_NAMES,
  NARRATOR,
  REAL_WORLD_HEADING,
  REAL_WORLD_SECTION,
  SECTION_FOR_STEP,
  SPEAKERS,
} from './guide-story.constants'

/** A block of a step: the story's own, or a heading the Guide puts between two of its sections. */
export type StepBlock = GuideStoryBlock | { readonly kind: 'heading'; readonly text: string }

/** The speaker for a name in the story; unknown names still speak, without a portrait. */
export function speakerOf(name: string | null): SpeakerInfo {
  if (name === null) {
    return NARRATOR
  }
  return SPEAKERS[name] ?? { id: name, name, term: '', portrait: null }
}

export function stepLabelOf(step: GuideStepId): string {
  return GUIDE_STEPS.find((entry) => entry.id === step)?.label ?? ''
}

export function stepIndexOf(step: GuideStepId): number {
  return GUIDE_STEPS.findIndex((entry) => entry.id === step)
}

/**
 * The story the Guide shows for a step: its own section, else the closest one before it. The
 * debrief is followed by the real world, after a pause, so the debrief is read first.
 */
export function blocksFor(step: GuideStepId, story: GuideStory | undefined): readonly StepBlock[] {
  const own = SECTION_FOR_STEP[step].map((section) => story?.get(section) ?? []).find((blocks) => blocks.length > 0)
  const blocks: StepBlock[] = [...(own ?? [])]
  const realWorld = story?.get(REAL_WORLD_SECTION) ?? []
  if (step === 'debrief' && realWorld.length > 0) {
    if (blocks.length > 0) {
      blocks.push({ kind: 'pause' })
    }
    blocks.push({ kind: 'heading', text: REAL_WORLD_HEADING }, ...realWorld)
  }
  return blocks
}

/**
 * The step's story cut at its pauses and after each question; a step with neither is one beat. A
 * pause that ends the step is kept as an empty last beat: the step waits for the command its last
 * beat asked for, and a held question there shows what happens once it runs.
 */
export function beatsOf(blocks: readonly StepBlock[]): readonly GuideBeat[] {
  const beats: GuidePart[][] = [[]]
  let predicts = 0
  for (const [at, block] of blocks.entries()) {
    const beat = beats.at(-1) ?? []
    const last = beat.at(-1)
    if (block.kind === 'pause') {
      beats.push([])
    } else if (block.kind === 'predict') {
      beat.push({
        kind: 'predict',
        id: predicts++,
        line: { speaker: block.speaker, text: block.text },
        options: block.options,
        held: blocks[at + 1]?.kind === 'pause',
        picked: null,
        revealed: false,
        onPick: null,
      })
      beats.push([])
    } else if (block.kind === 'code' || block.kind === 'heading') {
      beat.push({ kind: block.kind, text: block.text })
    } else if (last?.kind === 'lines') {
      beat[beat.length - 1] = { kind: 'lines', lines: [...last.lines, { speaker: block.speaker, text: block.text }] }
    } else {
      beat.push({ kind: 'lines', lines: [{ speaker: block.speaker, text: block.text }] })
    }
  }
  const kept = beats.filter((beat) => beat.length > 0)
  return blocks.at(-1)?.kind === 'pause' && kept.length > 0 ? [...kept, []] : kept
}

/** A question of the step is still unanswered: the way on waits for the player's call. */
export function predictWaitsIn(beats: readonly GuideBeat[], picks: GuidePace['picks']): boolean {
  return beats.some((beat) => beat.some((part) => part.kind === 'predict' && !Object.hasOwn(picks, part.id)))
}

export interface PacedGuide {
  /** The beats reached, with each question's state and its answer callback. */
  readonly beats: readonly GuideBeat[]
  /** Shows the next beat; null on the last one, or while a question waits for its answer. */
  readonly onContinue: (() => void) | null
  /**
   * The player finished commands at the terminal, as the Machine shows them, oldest first;
   * undefined when it does not say what was typed. Each one the beat on screen asked for shows
   * the next beat.
   */
  readonly onCommands: (lines?: readonly string[]) => void
  /** The whole step is on screen and no question waits. */
  readonly finished: boolean
}

/**
 * How much of a step's story is on screen. A command the player finishes shows the next beat
 * when it is the one the beat asked for (any command, where the beat asks for none), and Continue
 * always does, so the explanation of a result comes after that result. Nothing past an open
 * question shows, whatever the player runs meanwhile. A step looked back at is shown whole.
 */
export function pacedGuideOf(beats: readonly GuideBeat[], pace: GuidePace, reviewing: boolean): PacedGuide {
  const answered = (id: number) => reviewing || Object.hasOwn(pace.picks, id)
  const open = beats.findIndex((beat) => beat.some((part) => part.kind === 'predict' && !answered(part.id)))
  const limit = open === -1 ? beats.length : open + 1
  const reached = reviewing ? beats.length : Math.min(Math.max(pace.shown, 1), limit)
  const asking = open !== -1 && reached === limit
  const onCommands = (lines?: readonly string[]) => {
    if (reviewing || asking) {
      return
    }
    const commands = beatCommandsOf(beats)
    let at = reached
    for (const line of lines === undefined || lines.length === 0 ? [undefined] : lines) {
      if (at < limit && releasesPause(commands[at - 1] ?? null, line)) {
        at++
      }
    }
    if (at > reached) {
      pace.advance(at - reached)
    }
  }
  return {
    beats: beats.slice(0, reached).map((beat, at) =>
      beat.map((part) =>
        part.kind !== 'predict'
          ? part
          : {
              ...part,
              picked: pace.picks[part.id] ?? null,
              // A held question shows what happens only once the player's command brought the next beat.
              revealed: answered(part.id) && (reviewing || !part.held || at < reached - 1),
              onPick: answered(part.id)
                ? null
                : (option: number | null) =>
                    pace.pick(part.id, option, part.held && option !== null ? reached : reached + 1),
            }
      )
    ),
    onContinue: reached < beats.length && !asking ? () => pace.advance() : null,
    onCommands,
    finished: reached >= beats.length && !asking,
  }
}

/** The mission's chips, each typed into the terminal and run on a click. */
export function chipsOf(
  chips: readonly { readonly command: string; readonly explain: string }[],
  runChip: ((command: string) => void) | null
): readonly GuideChip[] {
  return chips.map((chip) => ({
    command: chip.command,
    explain: chip.explain,
    onRun: runChip === null ? null : () => runChip(chip.command),
  }))
}

/** The hints revealed so far, named by their tier: a nudge, the concept, the spot. */
export function hintsOf(
  hints: readonly { readonly text: string; readonly command?: string }[],
  revealed: number
): readonly GuideHint[] {
  return hints.slice(0, revealed).map((hint, index) => ({
    tier: HINT_TIER_NAMES[index] ?? HINT_TIER_NAMES.at(-1) ?? '',
    text: hint.text,
    command: hint.command ?? null,
  }))
}
