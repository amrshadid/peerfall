import type { PortraitProps } from '@shared/types'
import './Portrait.css'

/** bfdd, FRR's BFD daemon: a link's pulse monitor, checking it many times a second. */
export function BfddPortrait({ size = 30 }: PortraitProps) {
  return (
    <svg className="pf-portrait" viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <rect x="3" y="5" width="24" height="18" fill="var(--sheet)" />
        <path d="M5 15 H10 L12 10 L15 20 L17 13 L19 15 H25" />
        <path d="M11 27 H19" />
        <path d="M15 23 V27" />
      </g>
    </svg>
  )
}
