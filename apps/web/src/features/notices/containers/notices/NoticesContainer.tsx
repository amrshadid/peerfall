import { useNotices } from '@app/store'
import { NoticeStackPresentation } from '@features/notices/components/notices'
import { NOTICE_MS, shownNotice } from '@features/notices/utils/notices'
import { useEffect } from 'react'

/** One at a time; each fades a few seconds after it comes on show, a failed save stays until dismissed. */
export function NoticesContainer() {
  const { notices, dismissNotice } = useNotices()
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
