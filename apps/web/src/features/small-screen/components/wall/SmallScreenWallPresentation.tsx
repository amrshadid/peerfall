import { ManHead, Sheet } from '@shared/components/layout'
import { Wordmark } from '@shared/components/ui'
import { APP_MANUAL, APP_NAME, APP_PAGE } from '@shared/constants/app'
import './SmallScreenWall.css'

export interface SmallScreenWallPresentationProps {
  /** The narrowest width that plays, e.g. 1024. */
  minWidthPx: number
}

/** Nothing is touched: widening the window brings the game straight back. There is no way past it. */
export function SmallScreenWallPresentation({ minWidthPx }: SmallScreenWallPresentationProps) {
  return (
    <div className="small-screen">
      <ManHead left={APP_PAGE} center={APP_MANUAL} right={APP_PAGE} />
      <Sheet as="main" className="small-screen__sheet" aria-labelledby="small-screen-h">
        <div className="small-screen__mark">
          <Wordmark />
        </div>
        <h1 id="small-screen-h" tabIndex={-1}>
          {APP_NAME} needs a bigger screen.
        </h1>
        <p>
          You configure routers in a terminal and an editor while the network's topology and the outage timeline sit
          beside them. That needs a window at least {minWidthPx} pixels wide.
        </p>
        <p>Open {APP_NAME} on a laptop or desktop, or widen this window.</p>
        <p className="small-screen__note">Your progress and settings stay saved in this browser.</p>
      </Sheet>
    </div>
  )
}
