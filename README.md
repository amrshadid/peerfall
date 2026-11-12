# Peerfall

**Learn FRRouting from your first router to operating a multi-protocol network.**

Peerfall is a free, open-source browser game where you build networks, diagnose outages
and verify recovery. It brings the hands-on format of
[Kernelfall](https://kernelfall.shadid.dev) to [FRRouting](https://frrouting.org) (FRR).

The network is real: a Linux kernel running in an emulated PC
([v86](https://github.com/copy/v86)) inside your browser, with one network namespace per
router and FRR's own daemons in each. You type into the real `vtysh`, the routes are in
the real Linux forwarding table, and the timeline is read from FRR's own logs. There is
nothing to install and no server: your progress stays in your browser.

Peerfall is in development. The first mission, **The Link That Never Went Down**, is
being built ([roadmap](docs/ROADMAP.md)).

## What you'll learn

The journey covers FRR from end to end, one stage at a time. Each stage names the FRR
daemons you work with.

| #   | Stage                        | What you learn to do                                                                                                                                                                     | FRR parts                                                     |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | First router                 | Start FRR on Linux, identify its daemons and what keeps them running, use `vtysh`, read the running configuration, save and reload it, and read the logs.                                | `watchfrr`, `mgmtd`, `vtysh`, `frr-reload`                    |
| 2   | Follow a packet              | Address interfaces for IPv4 and IPv6, configure connected and static routes, resolve a next hop, compare administrative distances, and trace a route from Zebra into Linux forwarding.   | `zebra`, `staticd`                                            |
| 3   | Build an underlay            | Form OSPFv2, OSPFv3 and IS-IS adjacencies, read the link-state database, predict the path from costs, split a network into areas and levels, balance over equal paths, and redistribute. | `ospfd`, `ospf6d`, `isisd`                                    |
| 4   | Recover from failure         | Measure an outage, see why an interface can stay up while packets are lost, detect it with BFD, tune timers, restart a daemon without losing traffic, and share a gateway address.       | `bfdd`, graceful restart, fast reroute, `vrrpd`               |
| 5   | The other interior protocols | Run the distance-vector and specialised protocols, and say when each one fits: small networks, mesh and wireless links, data-centre fabrics, and overlay tunnels.                        | `ripd`, `ripngd`, `eigrpd`, `babeld`, `fabricd`, `nhrpd`      |
| 6   | Exchange routes              | Establish iBGP and eBGP sessions, follow best-path selection step by step, use route reflectors, multipath and unnumbered sessions, and carry IPv6 and other address families.           | `bgpd`                                                        |
| 7   | Control what is advertised   | Filter and rewrite routes with prefix lists, AS-path lists, communities and route maps, validate origins with RPKI, and steer chosen traffic with policy routing.                        | route maps, RPKI, `pbrd`                                      |
| 8   | Isolate and connect tenants  | Separate tenants with VRFs, leak routes selectively, build an L3VPN, and trace remote MAC and IP reachability across an EVPN/VXLAN fabric.                                               | VRFs, `bgpd` L3VPN and EVPN, `zebra`                          |
| 9   | Label and steer              | Forward on MPLS labels, distribute them with LDP, replace them with Segment Routing, carry services over SRv6, and pin traffic to an engineered path.                                    | `ldpd`, Segment Routing in `ospfd` and `isisd`, SRv6, `pathd` |
| 10  | Deliver multicast            | Follow a multicast stream from its source to its receivers: group membership, the distribution tree, the rendezvous point, and sources in another domain.                                | `pimd`, `pim6d`, IGMP, MLD, MSDP                              |
| 11  | Operate a network            | Diagnose a fault across protocol state and forwarding, read debugs without drowning in them, monitor and automate with JSON output, verify recovery and isolation, and roll back.        | debugs, JSON output, BMP, SNMP, the northbound API            |

The first mission, The Link That Never Went Down, belongs to stage 4.

## Run it

Requirements: Node.js 22 and pnpm 10+.

```sh
pnpm install
pnpm vm:image   # builds the Linux image (downloads pinned Alpine packages, about 47 MB)
pnpm dev
```

## Docs

- [Architecture](docs/ARCHITECTURE.md): packages, the Machine, the event stream, storage
- [Missions](docs/MISSIONS.md): how missions are built and checked
- [Contributing](CONTRIBUTING.md): setup, workflow and code rules
- [Roadmap](docs/ROADMAP.md): where the game stands and what to work on next
- [Changelog](CHANGELOG.md): what has changed

## License

The game's code is [MIT](LICENSE). FRR and the Linux image the game boots keep their own
licenses (FRR is GPL-2.0-or-later); Peerfall runs them unmodified.
