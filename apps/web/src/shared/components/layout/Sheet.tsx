import type { HTMLAttributes, ReactNode } from 'react'
import './Sheet.css'

export interface SheetProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  as?: 'main' | 'section' | 'aside' | 'div' | 'nav'
}

/** A drawing sheet: paper inside a 2px ink frame. Every boundary inside it is a real one. */
export function Sheet({ as: Element = 'div', className, children, ...rest }: SheetProps) {
  return (
    <Element className={['pf-sheet', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Element>
  )
}
