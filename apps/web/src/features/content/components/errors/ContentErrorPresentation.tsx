import { ManHead, Sheet } from '@shared/components/layout'
import { APP_PAGE } from '@shared/constants/app'
import './ContentError.css'

export interface ContentErrorPresentationProps {
  errors: readonly string[]
}

export function ContentErrorPresentation({ errors }: ContentErrorPresentationProps) {
  return (
    <div className="content-error">
      <ManHead left={APP_PAGE} center="Errata" right={APP_PAGE} />
      <Sheet as="main" className="content-error__sheet" aria-labelledby="content-error-title">
        <h1 id="content-error-title" className="pf-display content-error__title">
          The mission content has errors.
        </h1>
        <p>
          The game won't start with content that fails its checks, because a broken mission could teach something wrong.
          Fix these in <code>packages/missions/content/</code> and reload:
        </p>
        <ol className="content-error__list">
          {errors.map((error) => (
            <li key={error}>
              <code>{error}</code>
            </li>
          ))}
        </ol>
      </Sheet>
    </div>
  )
}
