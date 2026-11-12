import { Button } from './Button'
import { Icon } from './Icon'
import './HintButton.css'

export interface HintButtonProps {
  /** Hints not revealed yet. */
  left: number
  /** There is a hint worth offering now: the button gets a soft ring, never a popup. */
  offered?: boolean
  disabled?: boolean
  /** As `aria-keyshortcuts` wants it, e.g. `Alt+H`. */
  keyShortcut?: string
  onReveal: () => void
}

/** Reveals the next staged hint: where to look first, a specific command last. Never forced. */
export function HintButton({ left, offered = false, disabled = false, keyShortcut, onReveal }: HintButtonProps) {
  const none = left <= 0
  return (
    <Button
      className={`pf-hint${offered && !none ? ' pf-hint--offered' : ''}`}
      onClick={onReveal}
      disabled={disabled || none}
      aria-keyshortcuts={keyShortcut}
    >
      <Icon name="hint" />
      Hint <span className="pf-hint__left">{none ? 'none left' : `${left} left`}</span>
    </Button>
  )
}
