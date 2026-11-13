import { useNotices } from '@app/store'
import { NoticeStackPresentation } from '@features/notices/components/notices'
import { useGameNotices } from '@features/notices/hooks/game'
import { NOTICE_MS, shownNotice } from '@features/notices/utils/notices'
import type { MissionId } from '@peerfall/game/types'
import { appContent } from '@peerfall/missions/utils'
import { useEffect } from 'react'

// Not useContent(): notices render beside the router, also when content failed its checks.
function titleOf(missionId: MissionId): string {
  const content = appContent()
  return (content.ok ? content.value.game.mission(missionId)?.title : undefined) ?? missionId
}

function cardsOf(missionId: MissionId): readonly string[] {
  const content = appContent()
  return content.ok ? (content.value.game.mission(missionId)?.codex.map((card) => card.term) ?? []) : []
}

/** One at a time; each fades a few seconds after it comes on show, a failed save stays until dismissed. */
export function NoticesContainer() {
  const { notices, dismissNotice } = useNotices()
  useGameNotices(titleOf, cardsOf)
  const notice = shownNotice(notices)

  // The timer starts when a notice comes on show, so one waiting its turn is still read.
  useEffect(() => {
    if (!notice || notice.sticky) {
      return
    }
    const timer = setTimeout(() => dismissNotice(notice.id), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice, dismissNotice])

  return (
    <NoticeStackPresentation
      notice={notice ?? null}
      waiting={Math.max(0, notices.length - 1)}
      onDismiss={dismissNotice}
    />
  )
}
