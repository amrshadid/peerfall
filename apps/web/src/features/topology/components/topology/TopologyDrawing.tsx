import type { TopologyLinkView } from '@features/topology/types'
import { STAGE } from '@features/topology/utils/layout'

export interface TopologyDrawingProps {
  links: readonly TopologyLinkView[]
}

/**
 * The cables, as lines under the routers. The box is stretched to its frame, so strokes are told not
 * to scale with it. Decorative: every link is also a list item that says what it is doing in words.
 */
export function TopologyDrawing({ links }: TopologyDrawingProps) {
  return (
    <svg
      className="topology__drawing"
      viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {links.map((link) => (
        <g key={link.key} className={`topology__link topology__link--${link.state}`}>
          {/* The path lies under the cable as a broad band, so a dashed or dotted cable still reads through it. */}
          {link.onPath && (
            <line className="topology__path-band" x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y} />
          )}
          <line className="topology__cable" x1={link.from.x} y1={link.from.y} x2={link.to.x} y2={link.to.y} />
        </g>
      ))}
    </svg>
  )
}
