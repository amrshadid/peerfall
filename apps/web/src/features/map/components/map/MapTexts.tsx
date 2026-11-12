import type { SceneText } from '@features/map/types'

export function MapTexts({ texts }: { texts: readonly SceneText[] }) {
  return texts.map((item) => (
    <text
      key={`${item.x}-${item.y}-${item.text}`}
      x={item.x}
      y={item.y}
      textAnchor={item.anchor}
      className={`map-fig__${item.style}${item.dim ? ' map-fig__dim' : ''}`}
    >
      {item.text}
    </text>
  ))
}
