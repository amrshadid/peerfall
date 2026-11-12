import { TopologyPresentation } from '@features/topology/components/topology'
import { ADJACENCY_LEGEND, linkStatesOf } from '@features/topology/utils/layout'
import { adjacenciesOf, probePathsOf } from '@features/topology/utils/live'
import { useActiveMission } from '@peerfall/game/hooks'
import { useMachineEvents, useRouterSelection } from '@peerfall/machine/hooks'
import { useMemo } from 'react'

/**
 * The mission's network as the Machine reports it right now: which link is dropping packets, the
 * OSPF adjacency on each, and the way the probe's packets take. Selecting a router moves the
 * terminal into it.
 */
export function TopologyContainer() {
  const { mission } = useActiveMission()
  const events = useMachineEvents()
  const { router, select } = useRouterSelection()

  const network = mission?.network ?? null
  const probe = mission?.probe ?? null
  const linkStates = useMemo(() => linkStatesOf(events), [events])
  const adjacencies = useMemo(() => (network ? adjacenciesOf(network, events) : []), [network, events])
  const paths = useMemo(() => (network && probe ? probePathsOf(network, probe, events) : []), [network, probe, events])
  const otherPaths = useMemo(() => paths.slice(1), [paths])

  if (!network || !probe) {
    return null
  }
  const owner = network.routers.find((candidate) => candidate.loopback?.split('/')[0] === probe.destination)

  return (
    <TopologyPresentation
      network={network}
      linkStates={linkStates}
      activePath={paths[0] ?? null}
      otherPaths={otherPaths}
      adjacencies={adjacencies}
      legend={adjacencies.some((each) => each.ends.some((end) => end.state !== null)) ? ADJACENCY_LEGEND : null}
      pathLabel={`Probe ${probe.from} → ${owner?.name ?? probe.destination} takes`}
      selectedRouter={router}
      onSelectRouter={(name) => void select(name)}
    />
  )
}
