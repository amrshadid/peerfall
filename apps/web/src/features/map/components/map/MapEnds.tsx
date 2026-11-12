import type { SceneOrigin, SceneTerminus } from '@features/map/types'
import { MapTexts } from './MapTexts'

/** Where the road starts: one router, drawn as the missions draw a router. */
export function MapOrigin({ origin }: { origin: SceneOrigin }) {
  const { box } = origin
  return (
    <g>
      <rect x={box.x} y={box.y} width={box.width} height={box.height} className="map-fig__router" />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 5}
        textAnchor="middle"
        className="map-fig__router-lbl"
      >
        r1
      </text>
      <MapTexts texts={origin.texts} />
    </g>
  )
}

/** Where the road ends: the operated network, every router wired to one backbone. */
export function MapTerminus({ terminus }: { terminus: SceneTerminus }) {
  return (
    <g>
      <line
        x1={terminus.busLeft}
        x2={terminus.busRight}
        y1={terminus.busY}
        y2={terminus.busY}
        className="map-fig__bus"
      />
      {terminus.boxes.map((box) => (
        <g key={box.x}>
          <line
            x1={box.x + box.width / 2}
            x2={box.x + box.width / 2}
            y1={box.y + box.height}
            y2={terminus.busY}
            className="map-fig__wire"
          />
          <rect x={box.x} y={box.y} width={box.width} height={box.height} className="map-fig__router" />
          <text x={box.x + box.width / 2} y={box.y + (box.lines.length > 1 ? 21 : 30)} textAnchor="middle">
            {box.lines.map((line, index) => (
              <tspan key={line} x={box.x + box.width / 2} dy={index === 0 ? 0 : 15} className="map-fig__router-lbl">
                {line}
              </tspan>
            ))}
          </text>
        </g>
      ))}
      <MapTexts texts={terminus.texts} />
    </g>
  )
}
