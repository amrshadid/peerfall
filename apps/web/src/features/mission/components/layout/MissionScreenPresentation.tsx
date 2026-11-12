import type { MissionScreenPresentationProps } from '@features/mission/types'
import { ManHead, Sheet } from '@shared/components/layout'
import { ButtonLink } from '@shared/components/ui'
import { APP_MANUAL, APP_PAGE } from '@shared/constants/app'
import { MissionLayout } from './MissionLayout'
import './MissionScreenPresentation.css'

/** The mission's workspace, or a plain line on why it can't be played. */
export function MissionScreenPresentation({ layout, unavailable }: MissionScreenPresentationProps) {
  if (unavailable) {
    return (
      <div className="mission-unavailable">
        <ManHead left={APP_PAGE} center={APP_MANUAL} right={APP_PAGE} />
        <Sheet as="main" className="mission-unavailable__sheet" aria-labelledby="mission-unavailable-h">
          <h1 id="mission-unavailable-h" tabIndex={-1}>
            This mission can't be played yet.
          </h1>
          <p>{unavailable.reason}</p>
          <ButtonLink variant="primary" href={unavailable.titleHref}>
            Back to the title
          </ButtonLink>
        </Sheet>
      </div>
    )
  }
  return layout ? <MissionLayout {...layout} /> : null
}
