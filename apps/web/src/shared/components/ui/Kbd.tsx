import './Kbd.css'

export interface KbdProps {
  /** Key labels pressed together, e.g. `["⌘", "⏎"]`. */
  keys: readonly string[]
  /** Read out instead of the glyphs, e.g. "Command Enter". */
  label?: string
}

export function Kbd({ keys, label }: KbdProps) {
  return (
    <kbd className="pf-kbd" aria-label={label}>
      {keys.map((key) => (
        <kbd key={key}>{key}</kbd>
      ))}
    </kbd>
  )
}
