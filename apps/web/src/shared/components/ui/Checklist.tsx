import type { ReactNode } from 'react'
import { StatusMark } from './StatusMark'
import './Checklist.css'

export interface ChecklistItem {
  readonly id: string
  readonly text: ReactNode
  readonly passed: boolean
  /** Why it doesn't pass yet, from the checker's last run. Shown under the text in red. */
  readonly why?: ReactNode
}

export interface ChecklistProps {
  items: readonly ChecklistItem[]
  /** Set while the player is working, so open items stand out in bold with a red box. */
  emphasizeOpen?: boolean
}

/** Objectives tick live, never by a Submit button. */
export function Checklist({ items, emphasizeOpen = true }: ChecklistProps) {
  return (
    <ul className="pf-checklist">
      {items.map((item) => (
        <li key={item.id} className={!item.passed && emphasizeOpen ? 'pf-checklist__open' : undefined}>
          <StatusMark passed={item.passed} />
          <span>
            {item.text}
            {item.why !== undefined && <span className="pf-checklist__why">{item.why}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}
