# Concepts: stages 1 and 2

Every concept a mission of the first two stages teaches, names or uses, in play order. It is
the source for `packages/missions/content/concepts.yaml`. A mission **teaches** at most
three concepts; it may **name** one that a later mission teaches; it **uses** only what an
earlier mission taught. No concept is used before it is taught.

The `part` says where a concept sits:

| Part      | Holds                                                                          |
| --------- | ------------------------------------------------------------------------------ |
| `network` | what is between routers: routers, links, packets, paths                        |
| `linux`   | the router's Linux: interfaces, addresses, the kernel's routing table          |
| `frr`     | FRR's daemons and how they are started and kept running                        |
| `cli`     | vtysh: help, modes, commands                                                   |
| `config`  | configuration: running, saved, checked                                         |
| `routing` | routes and how one is chosen: connected, static, next hops, RIB, FIB, distance |

Mission numbers are the stage and the place in it: 1.4 is stage 1's fourth mission. The
missions are specified in [stage-1-first-router.md](stage-1-first-router.md) and
[stage-2-follow-a-packet.md](stage-2-follow-a-packet.md).

## Taught in stages 1 and 2

| Id                        | Term                                                    | Part      | Taught | Named in  | Used in                      |
| ------------------------- | ------------------------------------------------------- | --------- | ------ | --------- | ---------------------------- |
| `router`                  | a router                                                | `network` | 1.1    |           | every later mission          |
| `interface`               | an interface, up or down                                | `linux`   | 1.1    |           | 1.2, 1.4, 1.5, 1.8, 2.1, 2.6 |
| `route`                   | a route and the routing table                           | `routing` | 1.1    |           | 1.4, 1.8, 2.1–2.6            |
| `frr-daemon`              | FRR, a set of daemons                                   | `frr`     | 1.2    | 1.1 (FRR) | 1.3, 1.7, 1.8, 2.2           |
| `zebra`                   | zebra                                                   | `frr`     | 1.2    | 1.1       | 1.3, 2.1, 2.4                |
| `vtysh`                   | vtysh, FRR's console                                    | `cli`     | 1.2    |           | 1.3–1.8, stage 2             |
| `watchfrr`                | watchfrr                                                | `frr`     | 1.3    |           | 1.6, 1.7, 1.8                |
| `frr-init-script`         | FRR's init script, `frrinit.sh`                         | `frr`     | 1.3    | 1.2       | 1.6, 1.7, 1.8, 2.6           |
| `daemons-file`            | the `daemons` file                                      | `frr`     | 1.3    | 1.2       | stage 3 (`ospfd=yes`)        |
| `cli-help`                | `?`, Tab and abbreviations                              | `cli`     | 1.4    |           | 1.5–1.8, stage 2             |
| `cli-modes`               | vtysh's modes: exec, configure, interface               | `cli`     | 1.4    |           | 1.5–1.8, stage 2             |
| `interface-shutdown`      | `shutdown`: FRR holding an interface down               | `config`  | 1.4    | 1.1       | 1.8, 2.5                     |
| `running-config`          | the running configuration                               | `config`  | 1.5    |           | 1.6, 1.7, 1.8, 2.4, 2.5      |
| `interface-description`   | an interface's description                              | `config`  | 1.5    |           | 1.6, 1.7, 1.8                |
| `saved-config`            | the saved configuration, `frr.conf`                     | `config`  | 1.6    | 1.2       | 1.7, 1.8, 2.6                |
| `write-memory`            | `write memory`                                          | `config`  | 1.6    |           | 1.7, 1.8, 2.6                |
| `frr-log`                 | FRR's log and `show logging`                            | `frr`     | 1.7    |           | stage 3 (debugging)          |
| `config-check`            | checking a file with `vtysh -C -f`                      | `config`  | 1.7    |           | 1.8                          |
| `ip-address`              | an IPv4 address on an interface                         | `linux`   | 2.1    | 1.1       | 2.2–2.6                      |
| `prefix`                  | a network, its prefix and prefix length                 | `routing` | 2.1    | 1.1       | 2.2–2.6                      |
| `connected-route`         | connected and local routes                              | `routing` | 2.1    | 1.1       | 2.2–2.6                      |
| `static-route`            | a static route                                          | `routing` | 2.2    |           | 2.3–2.6                      |
| `next-hop`                | the next hop                                            | `routing` | 2.2    |           | 2.3–2.6                      |
| `staticd`                 | staticd                                                 | `frr`     | 2.2    | 1.3       | 2.4                          |
| `return-path`             | the way back: a reply needs its own route               | `network` | 2.3    |           | 2.6                          |
| `ttl`                     | TTL, the hop count each router lowers, and `traceroute` | `network` | 2.3    | 2.2       | 2.5                          |
| `rib`                     | zebra's routing table (RIB), selected routes            | `routing` | 2.4    | 2.1       | 2.5, 2.6                     |
| `fib`                     | the kernel's table (FIB), installed routes              | `routing` | 2.4    | 2.1       | 2.5, 2.6                     |
| `next-hop-resolution`     | a next hop must be reachable: `show ip nht`             | `routing` | 2.4    | 2.2       | 2.5                          |
| `administrative-distance` | administrative distance: which source of a route wins   | `routing` | 2.5    |           | 2.6                          |
| `floating-static`         | a backup static route with a higher distance            | `routing` | 2.5    |           |                              |
| `ecmp`                    | equal-cost paths: two next hops used at once            | `routing` | 2.5    |           |                              |

## Named here, taught later

| Id          | Term                                         | Part      | Named in                 | Taught in                                                       |
| ----------- | -------------------------------------------- | --------- | ------------------------ | --------------------------------------------------------------- |
| `mgmtd`     | mgmtd, FRR's management daemon               | `frr`     | 1.3                      | stage 11, Operate a network (the northbound API)                |
| `pathspace` | one Machine, many routers: FRR's `-N <name>` | `frr`     | 1.2                      | a Codex card of 1.2 only: a fact about the Machine, not a skill |
| `peer`      | a peer                                       | `network` | 1.1 (the Peerfall)       | stage 3, Build an underlay                                      |
| `ipv6`      | IPv6 addresses and routes                    | `linux`   | 2.1 (the `fe80::` lines) | a later mission of stage 2 (see below)                          |

## Gaps

- **IPv6.** The README promises IPv4 and IPv6 in stage 2. The Machine's network definition
  and the `route` and `reaches` checks take IPv4 addresses only, so stage 2's missions are
  IPv4. An IPv6 mission (`ipv6 address`, `show ipv6 route`, `ip -6 route`) needs IPv6 in the
  network definition and in those two checks first.
- **`frr-reload`.** The README lists `frr-reload` among stage 1's parts. The Machine has no
  `frr-reload.py`: the image has no Python, and FRR's own script says so
  (`/usr/lib/frr/frrinit.sh reload a` prints `The frr-pythontools package is required for
  reload functionality.`). Stage 1 teaches restarting from the saved file and checking a file
  with `vtysh -C -f` instead. Teaching reload needs `python3` and `frr-pythontools` in the
  image.
