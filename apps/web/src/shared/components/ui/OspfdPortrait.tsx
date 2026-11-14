import type { PortraitProps } from '@shared/types'
import './Portrait.css'

/** ospfd, FRR's OSPF daemon: a map of routers and links that every router holds a copy of. */
export function OspfdPortrait({ size = 30 }: PortraitProps) {
  return (
    <svg className="pf-portrait" viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 6 L11 4 L19 6 L27 4 V24 L19 26 L11 24 L3 26 Z" fill="var(--sheet)" />
        <path d="M9 11 L21 11 L15 20 Z" />
        <circle cx="9" cy="11" r="2.5" fill="var(--sheet)" />
        <circle cx="21" cy="11" r="2.5" fill="var(--sheet)" />
        <circle cx="15" cy="20" r="2.5" fill="var(--sheet)" />
      </g>
    </svg>
  )
}
