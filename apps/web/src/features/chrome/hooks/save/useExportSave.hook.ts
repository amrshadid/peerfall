import { saveFileName } from '@features/chrome/utils/save'
import { useSaveActions } from '@peerfall/game/hooks'
import { useCallback } from 'react'

/** Downloads the player's save as `peerfall-save-YYYY-MM-DD.json`. */
export function useExportSave(): () => void {
  const { exportSave } = useSaveActions()
  return useCallback(() => {
    const blob = new Blob([exportSave()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = saveFileName(new Date())
    link.click()
    // Revoked on the next task: Safari and Firefox can drop a download whose URL is revoked during click().
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, [exportSave])
}
