import { Dialog } from '@shared/components/modals'
import { Button, Kbd } from '@shared/components/ui'
import './CheatSheet.css'

export interface CheatSheetRow {
  readonly action: string
  readonly keys: readonly string[]
}

export interface CheatSheetPresentationProps {
  open: boolean
  onClose: () => void
  game: readonly CheatSheetRow[]
  terminal: readonly CheatSheetRow[]
  /** Labels of the keys that move focus out of the terminal, e.g. `["⌥E", "⌥G", "⌥X"]`. */
  focusOut: readonly string[]
  /** Replays the current screen's guided tour; absent on screens without one. */
  onTour?: (() => void) | undefined
}

/** From the same table the keys use, so it never goes stale. */
export function CheatSheetPresentation({
  open,
  onClose,
  game,
  terminal,
  focusOut,
  onTour,
}: CheatSheetPresentationProps) {
  const last = focusOut.at(-1)
  const focusKeys = focusOut.length > 1 ? `${focusOut.slice(0, -1).join(', ')} and ${last}` : (last ?? '')
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Shortcuts"
      size="lg"
      actions={onTour ? <Button onClick={onTour}>Take the tour of this screen</Button> : undefined}
    >
      <div className="cheat-sheet">
        <Column title="Game" rows={game} />
        <Column title="Terminal" rows={terminal} />
      </div>
      <p className="pf-muted">
        Keys the shell and vtysh need (Ctrl+C, Ctrl+D, Ctrl+Z, Ctrl+L, Tab, ?, the arrows) always go to the terminal
        when it has focus. {focusKeys} always move focus out of it.
      </p>
    </Dialog>
  )
}

function Column({ title, rows }: { title: string; rows: readonly CheatSheetRow[] }) {
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      <dl>
        {rows.map((row) => (
          <div key={row.action}>
            <dt>{row.action}</dt>
            <dd>
              <Kbd keys={row.keys} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
