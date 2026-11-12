import { MissionScreenPresentation } from '@features/mission/components/layout'
import { hrefOf } from '@shared/navigation'

export interface MissionContainerProps {
  missionId: string
}

const NOT_BUILT_YET =
  'The first mission, The Link That Never Went Down, is still being built. It will open here as soon as it is ready.'

/**
 * Stands where the mission's own container will: that one reads the mission and its run from the
 * game's hooks and hands the layout its model. Until those exist, every mission address says so plainly.
 */
export function MissionContainer(_props: MissionContainerProps) {
  return (
    <MissionScreenPresentation
      layout={null}
      unavailable={{ reason: NOT_BUILT_YET, titleHref: hrefOf({ name: 'title' }) }}
    />
  )
}
