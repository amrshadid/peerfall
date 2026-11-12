import './Checklist.css'

export interface StatusMarkProps {
  passed: boolean
}

/** Shape first, colour second: a filled square with a tick, or an empty square. */
export function StatusMark({ passed }: StatusMarkProps) {
  return (
    <span
      className={`pf-mark${passed ? ' pf-mark--pass' : ''}`}
      role="img"
      aria-label={passed ? 'Passes' : 'Not passing yet'}
    >
      {passed && (
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M2 6.5 5 9l5-6" fill="none" strokeWidth="2.2" />
        </svg>
      )}
    </span>
  )
}
