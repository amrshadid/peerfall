import type { ImportPreview } from '@features/settings/types'
import { importSave } from '@peerfall/game/utils'

const DATE = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })

export function previewOf(json: string): ImportPreview {
  const loaded = importSave(json)
  if (!loaded.ok) {
    return { valid: false, summary: `This file can't be imported: ${loaded.errors[0] ?? 'unknown'}` }
  }
  const done = loaded.value.progress.completionOrder.length
  const saved = loaded.value.savedAt === null ? '' : `, saved ${DATE.format(loaded.value.savedAt)}`
  return { valid: true, summary: `${done} mission${done === 1 ? '' : 's'} passed${saved}.` }
}
