import type { ImportPreview } from '@features/settings/types'
import { previewOf } from '@features/settings/utils/import'
import { useSaveActions } from '@peerfall/game/hooks'
import { useState } from 'react'

export interface UseSaveImportResult {
  /** The file waiting for the player's yes, or null when no import is open. */
  readonly preview: ImportPreview | null
  readonly choose: (json: string) => void
  readonly cancel: () => void
  readonly confirm: () => Promise<void>
}

/** Read the file, show what it holds, and replace the game only once the player confirms. */
export function useSaveImport(onDone: (imported: boolean) => void): UseSaveImportResult {
  const { importSave } = useSaveActions()
  const [pending, setPending] = useState<{ json: string; preview: ImportPreview } | null>(null)

  const confirm = async () => {
    if (!pending) {
      return
    }
    const result = await importSave(pending.json)
    setPending(null)
    onDone(result.success)
  }

  return {
    preview: pending?.preview ?? null,
    choose: (json) => setPending({ json, preview: previewOf(json) }),
    cancel: () => setPending(null),
    confirm,
  }
}
