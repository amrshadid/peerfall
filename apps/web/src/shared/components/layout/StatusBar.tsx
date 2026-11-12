import type { SaveState } from '@shared/types'
import { saveStatusText } from '@shared/utils/format'
import type { ReactNode } from 'react'
import './StatusBar.css'

export interface StatusBarProps {
  save: SaveState
  /** Milliseconds since the last save, for "Saved a minute ago". */
  savedAgoMs: number | null
  /** Other status cells in order, e.g. "Linux: running". */
  items: readonly ReactNode[]
  /** The right-hand cell, e.g. a Shortcuts button. */
  end?: ReactNode
}

export function StatusBar({ save, savedAgoMs, items, end }: StatusBarProps) {
  return (
    <footer className="pf-status-bar">
      <span className={`pf-status-bar__save pf-status-bar__save--${save}`} role="status">
        <i aria-hidden="true" />
        {saveStatusText(save, savedAgoMs)}
      </span>
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: positions never move
        <span key={index}>{item}</span>
      ))}
      {end !== undefined && <span className="pf-status-bar__end">{end}</span>}
    </footer>
  )
}
