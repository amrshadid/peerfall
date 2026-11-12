import { Banner } from '@shared/components/ui/Banner'
import { Button } from '@shared/components/ui/Button'
import type { StorageIssue } from '@shared/types'

export interface StorageBannerProps {
  issue: StorageIssue
  /** Downloads the save; `null` where there is nothing to export. */
  onExport: (() => void) | null
}

const MESSAGES: Readonly<Record<StorageIssue, string>> = {
  private: "Progress can't be saved in this window: it lasts until you close it.",
  full: "Progress couldn't be saved: the browser's storage refused it, maybe because it is full.",
  unreadable: "Your saved game couldn't be read, so it was left untouched. This session isn't being saved.",
}

export function StorageBanner({ issue, onExport }: StorageBannerProps) {
  return (
    <Banner
      action={
        issue === 'unreadable' || onExport === null ? undefined : (
          <Button size="sm" onClick={onExport}>
            Export save
          </Button>
        )
      }
    >
      {MESSAGES[issue]}
    </Banner>
  )
}
