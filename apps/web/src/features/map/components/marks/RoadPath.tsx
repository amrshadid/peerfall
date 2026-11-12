import type { RoadShape } from '@features/map/types'
import './Marks.css'

/** The road through the stops: inked where travelled, dashed ahead. */
export function RoadPath({ road }: { road: RoadShape }) {
  return (
    <>
      {road.reached !== '' && <path d={road.reached} className="pf-road" />}
      <path d={road.ahead} className="pf-road pf-road--ahead" />
    </>
  )
}
