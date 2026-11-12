import { Button } from '@shared/components/ui/Button'
import type { ScreenChrome } from '@shared/types'
import type { ReactNode } from 'react'
import { ManHead } from './ManHead'
import { StorageBanner } from './StorageBanner'
import './ScreenFrame.css'

export interface ScreenFrameProps {
  /** The man page name in the running head, e.g. `The Link That Never Went Down(4.1)`. */
  page: string
  /** The running head's centre line, e.g. "Peerfall Network Manual · Recover from failure". */
  volume: string
  chrome: ScreenChrome
  /** A bar between the running head and the sheet, e.g. the mission's top bar. */
  topbar?: ReactNode
  /** Rendered in a `<main>`. */
  children: ReactNode
  foot: ReactNode
}

export function ScreenFrame({ page, volume, chrome, topbar, children, foot }: ScreenFrameProps) {
  return (
    <div className={`screen${topbar ? ' screen--with-topbar' : ''}`}>
      <ManHead
        left={page}
        center={volume}
        right={
          <>
            {chrome.onTour && (
              <Button
                size="sm"
                className="screen__theme"
                onClick={chrome.onTour}
                aria-label="Take the tour of this screen"
              >
                Tour
              </Button>
            )}
            <Button
              size="sm"
              className="screen__theme"
              onClick={chrome.onToggleTheme}
              aria-label={`Switch to ${chrome.themeLabel}`}
            >
              {chrome.themeLabel}
            </Button>
            <span className="screen__page">{page}</span>
          </>
        }
      />
      {/* Always present, so every screen keeps the same grid rows with or without a notice. */}
      <div className="screen__banner">
        {chrome.storageIssue && <StorageBanner issue={chrome.storageIssue} onExport={chrome.onExport} />}
      </div>
      {topbar}
      {children}
      {foot}
    </div>
  )
}
