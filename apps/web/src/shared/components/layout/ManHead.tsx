import type { ReactNode } from 'react'
import './ManHead.css'

export interface ManHeadProps {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  /** `head` is set in caps like a man page's running head; `foot` stays in sentence case. */
  kind?: 'head' | 'foot'
}

export function ManHead({ left, center, right, kind = 'head' }: ManHeadProps) {
  const Element = kind === 'head' ? 'header' : 'footer'
  return (
    <Element className={`pf-man-head pf-man-head--${kind}`}>
      <span>{left}</span>
      <span>{center}</span>
      <span>{right}</span>
    </Element>
  )
}
