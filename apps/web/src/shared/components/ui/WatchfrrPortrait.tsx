import type { PortraitProps } from '@shared/types'
import './Portrait.css'

/** watchfrr, FRR's watchdog: a dog wearing a restart dial. */
export function WatchfrrPortrait({ size = 30 }: PortraitProps) {
  return (
    <svg className="pf-portrait" viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round">
        <path d="M3 10 H20 L27 16 V26 H3 Z" />
        <path d="M5 10 L9 3 L13 10" />
        <circle cx="12" cy="18" r="4.5" fill="var(--sheet)" />
        <path d="M14.5 15.5 A3 3 0 1 0 15 19" />
        <path d="M14.5 13.5 V15.8 H12.2" />
      </g>
    </svg>
  )
}
