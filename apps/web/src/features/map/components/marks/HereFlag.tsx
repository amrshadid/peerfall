import type { FlagBounds, MarkPoint } from '@features/map/types'
import { hereFlag } from '@features/map/utils/marks'
import './Marks.css'

export interface HereFlagProps {
  stop: MarkPoint
  /** The stop's NodeMark size: the pin stops just short of its red ring. */
  nodeSize: number
  bounds: FlagBounds
  className?: string
}

/** "You are here" over a stop of the map. */
export function HereFlag({ stop, nodeSize, bounds, className }: HereFlagProps) {
  const { pin, box, label } = hereFlag(stop, nodeSize, bounds)
  return (
    <g className={`pf-flag${className ? ` ${className}` : ''}`}>
      <path d={pin} className="pf-flag__red" />
      <rect {...box} className="pf-flag__red" />
      <text x={label.x} y={label.y} textAnchor="middle" className="pf-flag__label">
        You are here
      </text>
    </g>
  )
}
