import type { PortraitProps } from '@shared/types'
import './Portrait.css'

/** isisd, FRR's IS-IS daemon: two levels of the network, one router standing in both. */
export function IsisdPortrait({ size = 30 }: PortraitProps) {
  return (
    <svg className="pf-portrait" viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 24 L10 18 H27 L20 24 Z" fill="var(--sheet)" />
        <path d="M3 11 L10 5 H27 L20 11 Z" fill="var(--sheet)" />
        <path d="M10 8 H15 M15 21 H21 M15 8 V21" />
        <circle cx="10" cy="8" r="2" fill="var(--sheet)" />
        <circle cx="15" cy="8" r="2" fill="var(--sheet)" />
        <circle cx="15" cy="21" r="2" fill="var(--sheet)" />
        <circle cx="21" cy="21" r="2" fill="var(--sheet)" />
      </g>
    </svg>
  )
}
