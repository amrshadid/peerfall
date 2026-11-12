import { Icon } from '@shared/components/ui/Icon'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import './Dialog.css'

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
  size?: 'md' | 'lg'
}

/** Native `<dialog>`: the browser traps focus, inerts the page, handles Esc and returns focus. */
export function Dialog({ open, title, onClose, children, actions, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`pf-dialog pf-dialog--${size}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        // Let React state close it, so `open` stays the single source of truth.
        event.preventDefault()
        onClose()
      }}
    >
      <header className="pf-dialog__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="pf-dialog__close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <div className="pf-dialog__body">{children}</div>
      {actions !== undefined && <footer className="pf-dialog__actions">{actions}</footer>}
    </dialog>
  )
}
