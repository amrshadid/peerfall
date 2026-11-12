import type { ChapterId } from '@peerfall/game/types'

/**
 * The FRR daemons and features each stage works with, by chapter id: the "FRR parts" column of the
 * README's "What you'll learn" table. The game's chapters carry no such field.
 */
export const STAGE_PARTS: Readonly<Record<ChapterId, readonly string[]>> = {
  'first-router': ['watchfrr', 'mgmtd', 'vtysh', 'frr-reload'],
  'follow-a-packet': ['zebra', 'staticd'],
  'build-an-underlay': ['ospfd', 'ospf6d', 'isisd'],
  'recover-from-failure': ['bfdd', 'graceful restart', 'fast reroute', 'vrrpd'],
  'other-interior-protocols': ['ripd', 'ripngd', 'eigrpd', 'babeld', 'fabricd', 'nhrpd'],
  'exchange-routes': ['bgpd'],
  'control-what-is-advertised': ['route maps', 'RPKI', 'pbrd'],
  'isolate-and-connect-tenants': ['VRFs', 'bgpd L3VPN and EVPN', 'zebra'],
  'label-and-steer': ['ldpd', 'Segment Routing in ospfd and isisd', 'SRv6', 'pathd'],
  'deliver-multicast': ['pimd', 'pim6d', 'IGMP', 'MLD', 'MSDP'],
  'operate-a-network': ['debugs', 'JSON output', 'BMP', 'SNMP', 'the northbound API'],
}

/** Printed before a stage's parts, as Kernelfall prints "Kernel source:" before a layer's files. */
export const PARTS_LABEL = 'FRR parts'
