import { SmallScreenWallPresentation } from '@features/small-screen/components/wall'
import { MIN_PLAY_WIDTH_PX } from '@features/small-screen/utils/viewport'

export function SmallScreenContainer() {
  return <SmallScreenWallPresentation minWidthPx={MIN_PLAY_WIDTH_PX} />
}
