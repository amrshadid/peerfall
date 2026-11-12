import { NotFoundPresentation } from '@features/content/components/errors'
import { hrefOf } from '@shared/navigation'

export function NotFoundContainer() {
  return <NotFoundPresentation titleHref={hrefOf({ name: 'title' })} />
}
