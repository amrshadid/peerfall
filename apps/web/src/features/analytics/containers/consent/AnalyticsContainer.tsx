import { appConfig } from '@app/config'
import { useClarityConsent } from '@app/store'
import { ConsentNoticePresentation } from '@features/analytics/components/consent'
import { useClarity } from '@features/analytics/hooks/clarity'
import { hrefOf } from '@shared/navigation'

/** A build without a Clarity id neither loads it nor asks. */
export function AnalyticsContainer() {
  const { clarityId } = appConfig()
  const { consent, setConsent } = useClarityConsent()
  useClarity(clarityId, consent)

  if (clarityId === null || consent !== 'unset') {
    return null
  }
  return (
    <ConsentNoticePresentation
      privacyHref={hrefOf({ name: 'settings', section: 'privacy' })}
      onAllow={() => setConsent('granted')}
      onDecline={() => setConsent('denied')}
    />
  )
}
