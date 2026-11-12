import { ManHead, Sheet } from '@shared/components/layout'
import { ButtonLink } from '@shared/components/ui'
import { APP_MANUAL, APP_PAGE } from '@shared/constants/app'
import './NotFound.css'

export interface NotFoundPresentationProps {
  titleHref: string
}

export function NotFoundPresentation({ titleHref }: NotFoundPresentationProps) {
  return (
    <div className="not-found">
      <ManHead left={APP_PAGE} center={APP_MANUAL} right={APP_PAGE} />
      <Sheet as="main" aria-labelledby="not-found-h" className="not-found__sheet">
        <h1 id="not-found-h" tabIndex={-1}>
          No such page: <code>% Network not in table</code>
        </h1>
        <p>This address isn't part of the manual.</p>
        <ButtonLink variant="primary" href={titleHref}>
          Back to the title
        </ButtonLink>
      </Sheet>
    </div>
  )
}
