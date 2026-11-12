import type { TopologyLinkView } from '@features/topology/types'
import { LINK_STATE_TEXT } from '@features/topology/utils/layout'
import { Icon } from '@shared/components/ui'

export interface TopologyLinkLabelsProps {
  links: readonly TopologyLinkView[]
}

const percent = (value: number) => `${value}%`
const midpoint = (from: number, to: number) => (from + to) / 2

/** Each link's state on the link itself, as an icon and a word: the list a screen reader reads the drawing from. */
export function TopologyLinkLabels({ links }: TopologyLinkLabelsProps) {
  return (
    <ul className="topology__links" aria-label="Links">
      {links.map((link) => {
        const text = LINK_STATE_TEXT[link.state]
        return (
          <li
            key={link.key}
            className={`topology__link-label topology__link-label--${link.state}`}
            style={{ left: percent(midpoint(link.from.x, link.to.x)), top: percent(midpoint(link.from.y, link.to.y)) }}
          >
            <Icon name={text.icon} size={14} />
            <span className="pf-visually-hidden">
              Link {link.ends[0]} to {link.ends[1]}:{' '}
            </span>
            {text.label}
            {link.onPath && <span className="pf-visually-hidden">, on the path</span>}
          </li>
        )
      })}
    </ul>
  )
}
