import { nextTabIndex } from '@shared/utils/ui'
import { type KeyboardEvent, type ReactNode, useRef } from 'react'
import './Tabs.css'

export interface TabItem {
  readonly id: string
  readonly label: ReactNode
  /** A filled square after the label, e.g. an unsaved file. Announced as `markLabel`. */
  readonly mark?: boolean
  readonly markLabel?: string
}

export interface TabsProps {
  label: string
  items: readonly TabItem[]
  selected: string
  onSelect: (id: string) => void
  /** `file` tabs are set in the code face (file names); `view` tabs in the text face. */
  kind?: 'file' | 'view'
  /** Prefix for tab ids so a panel can be `aria-labelledby` its tab: `${idPrefix}-${item.id}`. */
  idPrefix: string
}

export function Tabs({ label, items, selected, onSelect, kind = 'view', idPrefix }: TabsProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>())

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.id === selected)
    const next = nextTabIndex(Math.max(current, 0), event.key, items.length)
    const item = next === null ? undefined : items[next]
    if (!item) {
      return
    }
    event.preventDefault()
    onSelect(item.id)
    refs.current.get(item.id)?.focus()
  }

  return (
    <div role="tablist" aria-label={label} className={`pf-tabs pf-tabs--${kind}`} onKeyDown={onKeyDown}>
      {items.map((item) => {
        const isSelected = item.id === selected
        return (
          <button
            key={item.id}
            ref={(element) => {
              if (element) {
                refs.current.set(item.id, element)
              } else {
                refs.current.delete(item.id)
              }
            }}
            id={`${idPrefix}-${item.id}`}
            type="button"
            role="tab"
            className="pf-tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
            {item.mark && <span className="pf-tab__mark" role="img" aria-label={item.markLabel} />}
          </button>
        )
      })}
    </div>
  )
}
