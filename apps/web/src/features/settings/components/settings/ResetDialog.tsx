import { Dialog } from '@shared/components/modals'
import { Button } from '@shared/components/ui'
import { useState } from 'react'

// Typed out, so a stray click or Enter can never wipe a game.
const RESET_WORD = 'reset'

export interface ResetDialogProps {
  open: boolean
  onClose: () => void
  onExport: () => void
  onReset: () => void
}

export function ResetDialog({ open, onClose, onExport, onReset }: ResetDialogProps) {
  const [typed, setTyped] = useState('')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reset everything?"
      actions={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onExport}>Export first</Button>
          <Button
            variant="primary"
            disabled={typed.trim() !== RESET_WORD}
            onClick={() => {
              onClose()
              setTyped('')
              onReset()
            }}
          >
            Reset everything
          </Button>
        </>
      }
    >
      <p>This deletes your progress and settings in this browser. It can't be undone.</p>
      <label className="settings__confirm">
        Type <code>{RESET_WORD}</code> to confirm
        <input
          type="text"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
    </Dialog>
  )
}
