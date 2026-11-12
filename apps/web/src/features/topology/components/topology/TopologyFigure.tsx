import type { LinkStatus } from '@features/topology/types'
import { topologyViewOf } from '@features/topology/utils/layout'
import type { NetworkDefinition } from '@peerfall/machine/types'
import { useMemo } from 'react'
import { TopologyDrawing } from './TopologyDrawing'
import { TopologyLinkLabels } from './TopologyLinkLabels'
import './Topology.css'

export interface TopologyFigureProps {
  network: NetworkDefinition
  linkStates: readonly LinkStatus[]
  activePath: readonly string[] | null
}

const percent = (value: number) => `${value}%`

/** The same drawing as the mission's topology, to look at: its routers are plates, not buttons. */
export function TopologyFigure({ network, linkStates, activePath }: TopologyFigureProps) {
  const view = useMemo(() => topologyViewOf(network, linkStates, activePath), [network, linkStates, activePath])
  return (
    <div className="topology__stage topology__stage--figure">
      <TopologyDrawing links={view.links} />
      <TopologyLinkLabels links={view.links} />
      <ul className="topology__routers" aria-label="Routers">
        {view.routers.map((router) => (
          <li
            key={router.name}
            className={`topology__router topology__router--plate${router.onPath ? ' topology__router--on-path' : ''}`}
            style={{ left: percent(router.at.x), top: percent(router.at.y) }}
          >
            <span className="topology__router-name">{router.name}</span>
            {router.loopback && <span className="topology__router-address">{router.loopback}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
