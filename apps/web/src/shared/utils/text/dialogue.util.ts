import type { DialogueGroup, DialogueLine } from '@shared/types'

/** Runs of consecutive lines by the same speaker, so each run gets one name line. */
export function groupLines(lines: readonly DialogueLine[]): readonly DialogueGroup[] {
  const groups: { speaker: DialogueLine['speaker']; texts: DialogueLine['text'][] }[] = []
  for (const line of lines) {
    const last = groups.at(-1)
    if (last && last.speaker.id === line.speaker.id) {
      last.texts.push(line.text)
    } else {
      groups.push({ speaker: line.speaker, texts: [line.text] })
    }
  }
  return groups
}
