import type { ReactNode } from 'react'
import './Chip.css'

export interface ChipProps {
  href: string
  children: ReactNode
  /** The newest or selected chip is ruled in red. */
  current?: boolean
}

export function Chip({ href, children, current = false }: ChipProps) {
  return (
    <a
      className={`pf-chip${current ? ' pf-chip--current' : ''}`}
      href={href}
      aria-current={current ? 'true' : undefined}
    >
      {children}
    </a>
  )
}
