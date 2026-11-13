import { TopologyPresentation } from '@features/topology/components/topology'
import { ADJACENCY_LEGEND, linkStatesOf, linkStatesWithCarrier } from '@features/topology/utils/layout'
import { adjacenciesOf, probePathsOf } from '@features/topology/utils/live'
import { useActiveMission } from '@peerfall/game/hooks'
import { useInterfaceStates, useMachineEvents, useRouterSelection } from '@peerfall/machine/hooks'
import { useMemo } from 'react'

/**
 * The mission's network as the Machine reports it right now: which link is down or dropping
 * packets, the OSPF adjacency on each, and the way the probe's packets take. Selecting a router moves the
 * terminal into it.
 */
export function TopologyContainer() {
  const { mission } = useActiveMission()
  const events = useMachineEvents()
  const interfaces = useInterfaceStates()
  const { router, select } = useRouterSelection()

  const network = mission?.network ?? null
  const probe = mission?.probe ?? null
  const linkStates = useMemo(
    () => (network ? linkStatesWithCarrier(network, linkStatesOf(events), interfaces) : linkStatesOf(events)),
    [network, events, interfaces]
  )
  const adjacencies = useMemo(() => (network ? adjacenciesOf(network, events) : []), [network, events])
  const paths = useMemo(() => (network && probe ? probePathsOf(network, probe, events) : []), [network, probe, events])
  const otherPaths = useMemo(() => paths.slice(1), [paths])

  if (!network) {
    return null
  }
  const owner = probe
    ? network.routers.find((candidate) => candidate.loopback?.split('/')[0] === probe.destination)
    : undefined

  return (
    <TopologyPresentation
      network={network}
      linkStates={linkStates}
      activePath={paths[0] ?? null}
      otherPaths={otherPaths}
      adjacencies={adjacencies}
      legend={adjacencies.some((each) => each.ends.some((end) => end.state !== null)) ? ADJACENCY_LEGEND : null}
      // A mission with no traffic to watch has no path to tell.
      pathLabel={probe ? `Probe ${probe.from} → ${owner?.name ?? probe.destination} takes` : null}
      selectedRouter={router}
      onSelectRouter={(name) => void select(name)}
    />
  )
}
