import type { PortraitProps } from '@shared/types'
import './Portrait.css'

/** ospf6d, FRR's OSPFv3 daemon: ospfd's shared map, marked 6 for IPv6. */
export function Ospf6dPortrait({ size = 30 }: PortraitProps) {
  return (
    <svg className="pf-portrait" viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 6 L11 4 L19 6 L27 4 V24 L19 26 L11 24 L3 26 Z" fill="var(--sheet)" />
        <path d="M8 10 L14 15 L8 20 Z" />
        <circle cx="8" cy="10" r="2.2" fill="var(--sheet)" />
        <circle cx="14" cy="15" r="2.2" fill="var(--sheet)" />
        <circle cx="8" cy="20" r="2.2" fill="var(--sheet)" />
        <path d="M23.5 9.5 C20.5 10 18.5 13 18.5 17.5" />
        <circle cx="21.5" cy="17.5" r="3" />
      </g>
    </svg>
  )
}
