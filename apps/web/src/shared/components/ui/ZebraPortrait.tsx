import type { PortraitProps } from '@shared/types'
import './Portrait.css'

/** zebra, FRR's core daemon: a striped clerk holding the routing table. Red only for the route it picked. */
export function ZebraPortrait({ size = 56 }: PortraitProps) {
  return (
    <svg className="pf-portrait" viewBox="0 0 56 56" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round">
        <circle cx="20" cy="14" r="7" />
        <path d="M8 52 L12 27 Q20 22 28 27 L32 52 Z" />
        <rect x="30" y="20" width="18" height="24" fill="var(--sheet)" />
        <line x1="33" y1="26" x2="45" y2="26" />
        <line x1="33" y1="38" x2="45" y2="38" />
      </g>
      <g stroke="var(--ink)" strokeWidth="2.5">
        <line x1="15" y1="9" x2="19" y2="19" />
        <line x1="20" y1="7.5" x2="24" y2="17" />
        <line x1="13" y1="34" x2="18" y2="46" />
        <line x1="19" y1="32" x2="24" y2="46" />
      </g>
      <rect x="32" y="30" width="14" height="4" fill="var(--red)" />
    </svg>
  )
}
