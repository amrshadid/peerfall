import { CodexCard } from '@shared/components/codex'
import { Dialog } from '@shared/components/modals'
import type { CodexCardData } from '@shared/types'

export interface CodexModalPresentationProps {
  /** Null keeps the dialog closed. */
  open: CodexCardData | null
  onClose: () => void
}

/** Over the mission, so reading a card never leaves the mission. */
export function CodexModalPresentation({ open, onClose }: CodexModalPresentationProps) {
  return (
    <Dialog open={open !== null} onClose={onClose} title={open ? `Codex: ${open.term}` : 'Codex'} size="lg">
      {open && <CodexCard card={open} />}
    </Dialog>
  )
}
