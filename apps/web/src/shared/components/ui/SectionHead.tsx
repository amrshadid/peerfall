import type { ReactNode } from 'react'
import './SectionHead.css'

export interface SectionHeadProps {
  /** Becomes the heading's id, so the section can be `aria-labelledby` it. */
  id: string
  children: ReactNode
  /** A quiet note on the right, e.g. "5 of 6 pass". */
  aside?: ReactNode
  level?: 2 | 3
}

export function SectionHead({ id, children, aside, level = 2 }: SectionHeadProps) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <Heading id={id} className="pf-section-head">
      <span>{children}</span>
      {aside !== undefined && <span className="pf-section-head__aside">{aside}</span>}
    </Heading>
  )
}
