# Stage 2: Follow a Packet

Mission specs for stage 2. Read [GAME.md](../GAME.md) for the story, the characters and the
vocabulary, [MISSIONS.md](../MISSIONS.md) for how a mission is built and checked,
[concepts.md](concepts.md) for the concept chain, and
[stage-1-first-router.md](stage-1-first-router.md) for what the player already knows.

**Who it's for:** a player who has finished stage 1: they can start FRR, use vtysh's help
and modes, and save a configuration. They have seen a route in `ip route`, and an address
in `ip -br addr`, without either being explained in depth.

The stage is six missions, about **1 hour 40 minutes**. A packet's journey, one step at a
time: the address an interface needs and the route it brings (2.1), a route written by hand
to a network one router away (2.2), the route the reply needs to come back (2.3), why a
route that is written is not always used, and where FRR's table meets the kernel's (2.4),
and which route wins when there are two (2.5). The capstone (2.6) builds a line of three
routers from bare cables, and makes it survive a restart.

| #   | Title                          | Id                               | Time    | The one new idea                                                           |
| --- | ------------------------------ | -------------------------------- | ------- | -------------------------------------------------------------------------- |
| 2.1 | Two Ends of One Cable          | `two-ends-of-one-cable`          | ~15 min | an address and its prefix length bring a connected route                   |
| 2.2 | One Hop Further                | `one-hop-further`                | ~15 min | a static route hands packets to a next hop                                 |
| 2.3 | The Reply That Never Came Back | `the-reply-that-never-came-back` | ~15 min | the reply is a packet too, and needs its own route back                    |
| 2.4 | Written but Not Used           | `written-but-not-used`           | ~15 min | configuration, zebra's table (RIB) and the kernel's (FIB) are three places |
| 2.5 | The Backup Path                | `the-backup-path`                | ~20 min | administrative distance picks one route of several                         |
| 2.6 | Bring the Line Up              | `bring-the-line-up`              | ~20 min | capstone: addresses, routes both ways, saved and restarted                 |

Today's `two-ends-of-one-cable` becomes 2.1 and `the-reply-that-never-came-back` 2.3, both
rewritten to this spec; their ids stay. Today's 2.2 taught the static route and the way back
together; here they are two missions.

**Where it leads:** stage 3, Build an underlay, replaces the routes written by hand with
routes the routers learn from each other: the peers come back.

## Facts about the Machine that stage 2 relies on

Seen on the Machine (FRR 10.6.1), with each mission's network below. Outputs in this file
are copied from those runs; times, MAC and `fe80::` addresses differ per run.

- **No address, no route.** With both ends unaddressed, a's `ip route` and `show ip route`
  print nothing, and `ping -c 2 10.0.1.2` answers `ping: connect: Network unreachable`.
- **One end only.** With only a addressed, the ping leaves and nobody answers:
  `From 10.0.1.1 icmp_seq=1 Destination Host Unreachable`, ending
  `3 packets transmitted, 0 received, +3 errors, 100% packet loss, time 2079ms`.
- **An address configured in FRR** goes into Linux (`ip -br addr` shows it) and into the
  running configuration as `interface a-b` / ` ip address 10.0.1.1/30`.
- **An FRR address not saved, then FRR restarted:** Linux keeps the address and its
  connected route, and FRR's running configuration no longer has it. An unsaved static
  route is gone from both after the restart; a saved one comes back.
- **A static route whose next hop no connected network covers** (`ip route 10.0.2.0/30
  10.0.2.1` on a, or `… 10.0.2.2`) is in the running configuration and nowhere else:
  `show ip route` does not list it, `show ip route 10.0.2.0/30` answers
  `% Network not in table`, `ip route` has no line, and `show ip nht` shows the next hop
  `unresolved`.
- **Two static routes with the same distance** are both used: `S>*` and a second `*` line
  in `show ip route`, and two `nexthop via` lines in `ip route`. The `route` check with
  `via` then fails, by design: it passes only when every next hop is that one.
- **The same prefix and next hop with a new distance** replaces the old route:
  `ip route 10.255.0.3/32 10.0.1.2 10` after `ip route 10.255.0.3/32 10.0.1.2` leaves one
  line, with `10`.
- **A route added from Linux** (`ip route add 10.255.0.3/32 via 10.0.1.2`) shows in
  `show ip route` as `K>* 10.255.0.3/32 [0/0]` and wins over a static route (`S` without
  `>*`).
- **The loopback's two routes:** a router with a loopback address shows
  `L * 10.255.0.1/32 is directly connected, lo` and `C>* 10.255.0.1/32 …`. Missions keep
  loopbacks off the routers the player reads, except c in 2.5.
- **Tools:** `traceroute` is BusyBox's (`traceroute -n`). There is no `tcpdump`; per-router
  counters are in `/proc/net/snmp` (`Icmp: … InEchos …`) and `nstat`. `ip -s link` printed
  its headers without numbers in the spike's terminal, so missions don't use it.
- **IPv4 only:** the network definition and the `route` and `reaches` checks take IPv4.

**Not seen on the Machine** (from FRR's source or documentation; check before shipping):
the default distances of later protocols (eBGP 20, OSPF 110, iBGP 200, from zebra's route
type table); how Linux spreads flows over equal-cost next hops; TTL expiry replies beyond
what `traceroute` printed; `default-route-back` on c (2.3) and the runs `still-too-far`,
`added-beside` (2.4) and `addresses-from-linux` (2.6), which the golden-run recorder plays
first.

---

## 2.1 — Two Ends of One Cable

- **Id:** `two-ends-of-one-cable` · **Guide:** zebra · **Time:** ~15 min ·
  **Prerequisites:** `a-router-from-nothing`
- **Question:** What does a router need before it can send anything over a new cable?
- **The one new idea:** an address with its prefix length names the interface and its
  network, and brings a connected route with it.
- **Teaches:** `ip-address`, `prefix`, `connected-route` · **Names:** `rib`, `fib`, `ipv6` ·
  **Uses:** `interface`, `route`, `zebra`, `vtysh`, `cli-modes`

Today's 2.1, rewritten: the explanation moves from the debrief into See it and Build it.

### Network

```yaml
routers:
  - { name: a, daemons: [], config: "" }
  - { name: b, daemons: [], config: "" }
links:
  - ends:
      - { router: a, address: 10.0.1.1/30, unaddressed: true }
      - { router: b, address: 10.0.1.2/30, unaddressed: true }
```

### Beats

- **Scene.** zebra: "A new cable between a and b, up at both ends, and nothing crosses."
- **See it.** `ip -br addr`: `a-b@if2 UP fe80::60f3:32ff:fe0f:2611/64`, no IPv4 address.
  `ip route` prints nothing; `ping -c 2 10.0.1.2` → `ping: connect: Network unreachable`.
  In vtysh, `show interface brief` agrees and `show ip route` prints nothing.
- **Build it.** `configure terminal`, `interface a-b`, `ip address 10.0.1.1/30`, `end`. Then
  `show ip route`:

  ```
  C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:02
  L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:02
  ```

  `10.0.1.1` is a's address; `/30`, the prefix length, says the first 30 bits name the
  network, so the network is `10.0.1.0/30`: four addresses, `.1` and `.2` for the two ends.
  `C` is the connected route, for the whole network; `L`, the local route, for a's own
  address. `>` and `*` wait for 2.4. In Linux, `ip route`:
  `10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1`.
- **Watch it.** Predict below. Then b's end (`interface b-a`, `ip address 10.0.1.2/30`) and
  three answers: `64 bytes from 10.0.1.2: icmp_seq=1 ttl=64 time=0.767 ms`. `ip neigh` shows
  what a learned of b on the way: `10.0.1.2 dev a-b lladdr fa:1b:4e:3e:62:f4 REACHABLE`, b's
  MAC address.
- **Debrief.** "One address gives a router its network and a route into it. Both ends need
  one, in the same network. a reaches b; what about a router one cable further? In One Hop
  Further."

### Objectives

| Id            | Text                                                                                        | Check                                                                               |
| ------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `a-connected` | Give a's interface a-b the address 10.0.1.1/30, so a's kernel has the route to 10.0.1.0/30. | `{ kind: route, router: a, prefix: 10.0.1.0/30, protocol: kernel, interface: a-b }` |
| `b-connected` | Give b's interface b-a the address 10.0.1.2/30.                                             | `{ kind: route, router: b, prefix: 10.0.1.0/30, protocol: kernel, interface: b-a }` |
| `a-reaches-b` | Reach b's address from a.                                                                   | `{ kind: reaches, from: a, to: 10.0.1.2 }`                                          |

### Hints

1. **Nudge:** "Compare `ip -br addr` on a with what the plan says a should have. What is
   missing?"
2. **The idea:** "An address is a setting of an interface, typed in the interface's mode.
   Each end of the cable needs its own, in the same network."
3. **The spot:** "In `a(config-if)#` for `a-b`, then the same on b for `b-a`." Command:
   `ip address 10.0.1.1/30`

### Chips

`ip -br addr` (addresses as Linux has them), `ip route`, `ping`, `ip neigh` (the MAC
addresses a has learned), `ip address` (in interface mode: give the interface an address),
`show ip route` (zebra's routes).

### Predict

"Only a has its address. You ping b. What happens?" — `Network unreachable`, as before /
**packets leave and nobody answers** / b answers. Seen: `From 10.0.1.1 icmp_seq=1 Destination
Host Unreachable`, three times, `100% packet loss`.

### Codex (chapter: Follow a Packet)

- **An address** (`ip-address`)
  - **Simple:** A number that names one interface, such as `10.0.1.1`. A router has one on
    each cable it routes over.
  - **Deep:** An IPv4 address is 32 bits, written as four numbers from 0 to 255. Configured
    in FRR, zebra hands it to Linux, which adds it to the interface and starts answering
    for it. Linux also gives every interface an IPv6 link-local address by itself, the
    `fe80::` one. To send to a neighbour, a first learns its MAC address: `ip neigh`.
  - **Sources:** `zebra/interface.c`, `zebra/if_netlink.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show interface brief"`
- **A network and its prefix length** (`prefix`)
  - **Simple:** `/30` says how many leading bits name the network. `10.0.1.1/30` is in the
    network `10.0.1.0/30`: four addresses.
  - **Deep:** The bits after the prefix number the addresses inside: with `/30`, two bits,
    four addresses, `10.0.1.0` to `10.0.1.3`. The first names the network and the last is
    its broadcast address, so `.1` and `.2` are left for the two ends of a cable. A `/32`
    is one address; `/24` is 256.
  - **Sources:** `lib/prefix.c` · **Docs:** https://docs.frrouting.org/en/latest/basic.html
  - **Try it:** `ip -br addr`
- **Connected and local routes** (`connected-route`, deepens: `route`)
  - **Simple:** The route an address brings: its whole network is straight out of that
    interface. `C` in `show ip route`; `L` is the address itself.
  - **Deep:** zebra makes both from the address: `C>* 10.0.1.0/30 is directly connected,
    a-b` and `L>* 10.0.1.1/32`. Linux adds its own copy of the connected route, `proto
    kernel`, the moment the address is on an interface that is up. No router stands between
    a and anything in that network.
  - **Sources:** `zebra/connected.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show ip route"`

### Hand-off

"a reaches b. What about a router one cable further? In One Hop Further."

### Golden runs

Today's runs stay: `start` (not passed), `one-end` (not passed), `two-networks` (b given
`10.0.2.2/30`, not passed), `both-ends` (passed), `addressed-from-linux` (passed: judged by
outcome; the debrief says why FRR is the better place).

---

## 2.2 — One Hop Further

- **Id:** `one-hop-further` · **Guide:** zebra, staticd · **Time:** ~15 min ·
  **Prerequisites:** `two-ends-of-one-cable`
- **Question:** How does a router send to a network it has no cable into?
- **The one new idea:** a static route, written by hand, hands packets for a network to a
  next hop: a neighbour that is closer.
- **Teaches:** `static-route`, `next-hop`, `staticd` · **Names:** `ttl`,
  `next-hop-resolution` · **Uses:** `ip-address`, `prefix`, `connected-route`, `cli-modes`

c already has its route back to a (a line in its `frr.conf`), so this mission is only the
way there; 2.3 takes the way back away.

### Network

```yaml
routers:
  - { name: a, daemons: [staticd], config: "" }
  - { name: b, daemons: [staticd], config: "" }
  - { name: c, daemons: [staticd], config: "ip route 10.0.1.0/30 10.0.2.1\n" }
links:
  - ends: [{ router: a, address: 10.0.1.1/30 }, { router: b, address: 10.0.1.2/30 }]
  - ends: [{ router: b, address: 10.0.2.1/30 }, { router: c, address: 10.0.2.2/30 }]
```

### Beats

- **Scene.** zebra: "Three routers in a line. a reaches b, b reaches c, and a can't reach c."
- **See it.** From a: `ping -c 2 10.0.2.2` → `ping: connect: Network unreachable`;
  `ip route get 10.0.2.2` → `RTNETLINK answers: Network unreachable`. b's `show ip route`
  has a connected route into each network (`C>* 10.0.1.0/30 … b-a`, `C>* 10.0.2.0/30 …
  b-c`): b is the way.
- **Build it.** In a's configure mode: `ip route 10.0.2.0/30 10.0.1.2`. staticd speaks:
  "That's mine to keep." `show ip route`:
  `S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:02`. `show ip route 10.0.2.2`:
  `Known via "static", distance 1, metric 0, best` / `* 10.0.1.2, via a-b, weight 1`.
  In Linux: `10.0.2.0/30 nhid 6 via 10.0.1.2 dev a-b proto static metric 20`, and
  `ip route get 10.0.2.2` → `10.0.2.2 via 10.0.1.2 dev a-b src 10.0.1.1 uid 0`.
- **Watch it.** Predict below; `ping -c 3 10.0.2.2` →
  `64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=0.800 ms`; `traceroute -n 10.0.2.2`:

  ```
  traceroute to 10.0.2.2 (10.0.2.2), 30 hops max, 46 byte packets
   1  10.0.1.2  0.083 ms  0.057 ms  0.051 ms
   2  10.0.2.2  0.051 ms  0.052 ms  0.052 ms
  ```

  `ttl=63`, not 64 as in 2.1: one router on the way, which 2.3 explains.
- **Debrief.** "A static route names a network and the neighbour to hand it to. a never
  needs to know what is past b. But c had a route back that someone wrote for you. In The
  Reply That Never Came Back, it doesn't."

### Objectives

| Id            | Text                                                          | Check                                                                       |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `a-route`     | Give a a static route to c's network, 10.0.2.0/30, through b. | `{ kind: route, router: a, to: 10.0.2.2, protocol: static, via: 10.0.1.2 }` |
| `a-reaches-c` | Reach c's address, 10.0.2.2, from a.                          | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                  |

### Hints

1. **Nudge:** "Ask Linux which way it would send to c: `ip route get 10.0.2.2`. Then look at
   b's routes: which router is plugged into c's network?"
2. **The idea:** "A static route names a network and a next hop: an address of a neighbour
   that a can already reach over a cable. a's only neighbour is b."
3. **The spot:** "In a's configure mode, the network, then b's address on a's cable."
   Command: `ip route 10.0.2.0/30 10.0.1.2`

### Chips

`ip route get` (which way Linux would send to an address), `ip route` (in configure mode: a
static route), `show ip route`, `traceroute -n` (the routers a packet passes).

### Predict

"You ping c now. Does it answer?" — no, b drops it / **yes** / only once. Seen: three
answers with `ttl=63`.

### Codex (chapter: Follow a Packet)

- **A static route** (`static-route`, deepens: `route`)
  - **Simple:** A route you write yourself: `ip route 10.0.2.0/30 10.0.1.2`. `S` in
    `show ip route`, `proto static` in Linux.
  - **Deep:** Typed in configure mode, kept by staticd, offered to zebra, installed by
    zebra in the kernel. It never changes by itself: if the network moves, the route stays
    wrong until someone edits it. `ip route 0.0.0.0/0 <next hop>` is a default route, used
    for any address no longer route covers.
  - **Sources:** `staticd/static_vty.c`, `staticd/static_routes.c` · **Docs:** https://docs.frrouting.org/en/latest/static.html
  - **Try it:** `vtysh -c "show ip route static"`
- **The next hop** (`next-hop`)
  - **Simple:** The neighbour's address a route hands packets to. It must be on one of the
    router's own networks.
  - **Deep:** Each router decides one step only: a hands the packet to b, b looks the
    destination up again in its own table. In `S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b`,
    `via` is the next hop and `a-b` the interface zebra found for it. A next hop that no
    connected network covers is not used (2.4).
  - **Sources:** `staticd/static_nht.c`, `zebra/zebra_rnh.c` · **Docs:** https://docs.frrouting.org/en/latest/static.html
  - **Try it:** `ip route get 10.0.2.2`
- **staticd** (`staticd`, deepens: `frr-daemon`)
  - **Simple:** The daemon that keeps the routes written by hand and offers them to zebra.
  - **Deep:** staticd reads `ip route` lines from the configuration through mgmtd, asks
    zebra to tell it whether each next hop can be reached, and offers zebra only those
    routes whose next hop can. zebra decides what goes into the kernel. watchfrr starts it
    on every router, whatever the `daemons` file says.
  - **Sources:** `staticd/static_main.c`, `staticd/static_zebra.c` · **Docs:** https://docs.frrouting.org/en/latest/static.html
  - **Try it:** `vtysh -c "show daemons"`

### Hand-off

"In The Reply That Never Came Back, nobody has written c's route back."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # c's own address as the next hop: a can't reach it directly, and the route is not used.
  - id: next-hop-too-far
    passes: false
    changes:
      - router: a
        lines: [configure terminal, ip route 10.0.2.0/30 10.0.2.2]
  - id: through-b
    passes: true
    changes:
      - router: a
        lines: [configure terminal, ip route 10.0.2.0/30 10.0.1.2]
```

---

## 2.3 — The Reply That Never Came Back

- **Id:** `the-reply-that-never-came-back` · **Guide:** zebra · **Time:** ~15 min ·
  **Prerequisites:** `one-hop-further`
- **Question:** a's packets reach c. Why does nothing come back?
- **The one new idea:** a reply is a packet of its own, addressed to the sender, and needs
  a route at every router on the way back.
- **Teaches:** `return-path`, `ttl` · **Names:** none · **Uses:** `static-route`,
  `next-hop`, `connected-route`, `cli-modes`

Today's 2.2 rewritten: a's route is already there (2.2 taught it), and the player finds and
writes only the way back.

### Network

As 2.2, with a's route given and c's taken away: a `config: "ip route 10.0.2.0/30
10.0.1.2\n"`, c `config: ""`.

### Beats

- **Scene.** zebra: "a has its route to c now; you wrote one like it. Still a can't reach c."
- **See it.** From a, `ping -c 3 10.0.2.2`: no error this time, just
  `3 packets transmitted, 0 received, 100% packet loss, time 2055ms`. Different from
  `Network unreachable`: the packets left. Did they arrive? On c,
  `cat /proc/net/snmp | grep Icmp` counts `InEchos 3`: three requests arrived, `OutEchoReps
  0`: none answered. On c, `ip route` has only `10.0.2.0/30 dev c-b proto kernel scope link
  src 10.0.2.2`, and `ip route get 10.0.1.1` → `RTNETLINK answers: Network unreachable`.
- **Build it.** The reply is addressed to a, `10.0.1.1`, and c has no route that covers it.
  In c's configure mode: `ip route 10.0.1.0/30 10.0.2.1`.
- **Watch it.** Predict below; then `64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=0.800 ms`.
  `ttl` is the hop count every packet carries: each router that forwards it lowers it by
  one, so a reply that started at 64 arrives at 63 after b. `traceroute -n 10.0.2.2` uses
  exactly that, sending packets with a TTL of 1, then 2, and listing who answers.
- **Debrief.** "Reaching an address takes a route at every router on the way there, and at
  every router on the way back. Sometimes a route is written and still not used. In Written
  but Not Used."

### Objectives

| Id             | Text                                                          | Check                                                                       |
| -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `c-route-back` | Give c a static route to a's network, 10.0.1.0/30, through b. | `{ kind: route, router: c, to: 10.0.1.1, protocol: static, via: 10.0.2.1 }` |
| `a-reaches-c`  | Reach c's address, 10.0.2.2, from a, and see the replies.     | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                  |

### Hints

1. **Nudge:** "The packets leave a now: the error is gone. Go to c and find out what it
   does with its answer."
2. **The idea:** "c's answer is a packet addressed to `10.0.1.1`. Does c have any route that
   covers that address? `ip route get 10.0.1.1` on c says."
3. **The spot:** "On c, a static route to a's network, through b's address on c's cable."
   Command: `ip route 10.0.1.0/30 10.0.2.1`

### Chips

`ping`, `ip route get`, `cat /proc/net/snmp` (the router's packet counters; the `Icmp` lines
count pings), `traceroute -n`, `ip route` (in configure mode).

### Predict

"Before you write c's route: a's three pings, where did they stop?" — at a / at b / **at c,
which never answered**. Seen: c's counters show `InEchos 3`, `OutEchoReps 0`.

### Codex (chapter: Follow a Packet)

- **The way back** (`return-path`)
  - **Simple:** A reply is a packet too, addressed to the sender. Every router on the way
    back needs a route for it.
  - **Deep:** Each direction is looked up on its own, at each router. A missing route on
    the way there shows at the sender as `Network unreachable`; a missing route on the way
    back shows only as silence, `100% packet loss`. Read both ends. The way back may even
    take other routers than the way there.
  - **Sources:** `zebra/rt_netlink.c` · **Docs:** https://docs.frrouting.org/en/latest/static.html
  - **Try it:** `ip route get 10.0.1.1` on c
- **TTL** (`ttl`)
  - **Simple:** A hop count every packet carries. Each router lowers it by one; `ttl=63`
    in a ping means one router on the way.
  - **Deep:** Linux starts it at 64. A router that lowers it to 0 drops the packet and
    tells the sender, so a packet caught in a loop of routes dies instead of circling for
    ever. `traceroute` sends packets with a TTL of 1, then 2, and so on, and lists the
    router that answered each.
  - **Sources:** none in FRR: forwarding is the kernel's · **Docs:** https://docs.frrouting.org/en/latest/basic.html
  - **Try it:** `traceroute -n 10.0.2.2`

### Hand-off

"Sometimes a route is written and still not used. In Written but Not Used."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # The way back through an address c cannot reach: the route is not used.
  - id: next-hop-too-far
    passes: false
    changes:
      - router: c
        lines: [configure terminal, ip route 10.0.1.0/30 10.0.1.2]
  - id: way-back
    passes: true
    changes:
      - router: c
        lines: [configure terminal, ip route 10.0.1.0/30 10.0.2.1]
  # A default route back: the kernel uses it for 10.0.1.1 too.
  - id: default-route-back
    passes: true
    changes:
      - router: c
        lines: [configure terminal, ip route 0.0.0.0/0 10.0.2.1]
```

`default-route-back` on c: the default route on a was seen working on the Machine
(`S>* 0.0.0.0/0 [1/0] via 10.0.1.2`, ping answered); on c it is recorded with the golden
runs.

---

## 2.4 — Written but Not Used

- **Id:** `written-but-not-used` · **Guide:** zebra · **Time:** ~15 min ·
  **Prerequisites:** `the-reply-that-never-came-back`
- **Question:** The route is in the configuration. Why doesn't a use it?
- **The one new idea:** a route passes through three places: the configuration (staticd),
  zebra's table, the RIB, and the kernel's, the FIB; it reaches zebra only if its next hop
  can be reached.
- **Teaches:** `rib`, `fib`, `next-hop-resolution` · **Names:** none · **Uses:**
  `static-route`, `next-hop`, `staticd`, `zebra`, `running-config`

### Network

As 2.2, with a's route written wrong and c's way back given: a
`config: "ip route 10.0.2.0/30 10.0.2.1\n"`, c `config: "ip route 10.0.1.0/30 10.0.2.1\n"`.
The wrong next hop is b's other address, the one on b's cable to c: a plausible slip.

### Beats

- **Scene.** zebra: "Someone wrote a's route to c last night. It's in the configuration.
  a still can't reach c."
- **See it.** `ping -c 2 10.0.2.2` → `ping: connect: Network unreachable`.
  `show running-config` has ` ip route 10.0.2.0/30 10.0.2.1`. `show ip route` lists only
  `C>* 10.0.1.0/30` and `L>* 10.0.1.1/32`; `show ip route 10.0.2.0/30` →
  `% Network not in table`; `ip route` has only the connected line. Three places, and the
  route is in one.
- **Build it.** `show ip nht`, the next hops staticd asked zebra about:

  ```
  VRF default:
   Resolve via default: on
  10.0.2.1
   unresolved
   Client list: static(fd 32)
  ```

  `10.0.2.1` is b's address on the far cable; a has no route to it. Replace the route:
  `no ip route 10.0.2.0/30 10.0.2.1`, `ip route 10.0.2.0/30 10.0.1.2`. `show ip nht` now:
  `10.0.1.2` / ` resolved via connected, prefix 10.0.1.0/30`.
- **Watch it.** Predict below; then `S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b`, the line in
  `ip route` (`proto static metric 20`), and two answers with `ttl=63`. `>` means zebra
  selected this route for its network; `*` means it is in the kernel's table.
- **Debrief.** "Configuration, zebra's table, the kernel's table: a route can stop at any
  of them, and the next hop decides the first step. What if two routes for one network
  both get through? In The Backup Path."

### Objectives

| Id            | Text                                                                      | Check                                                                       |
| ------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `a-route`     | Make a use a static route to c's network through a next hop it can reach. | `{ kind: route, router: a, to: 10.0.2.2, protocol: static, via: 10.0.1.2 }` |
| `a-reaches-c` | Reach c's address, 10.0.2.2, from a.                                      | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                  |

### Hints

1. **Nudge:** "Look for the route in three places: `show running-config`, `show ip route`
   and `ip route`. Where does it stop?"
2. **The idea:** "staticd offers zebra a route only once zebra can reach its next hop.
   `show ip nht` lists each next hop and whether it is resolved."
3. **The spot:** "Remove the route with `no` before it, and write it again with b's
   address on a's own cable." Command: `ip route 10.0.2.0/30 10.0.1.2`

### Chips

`show running-config`, `show ip route`, `show ip nht` (the next hops zebra tracks, and
whether each can be reached), `no` (remove a setting), `ip route`.

### Predict

"Will `show ip route` list the route that is in the configuration?" — yes, marked inactive
/ **no, it isn't there at all** / yes, with `>*`. Seen: `% Network not in table`.

### Codex (chapter: Follow a Packet)

- **zebra's table, the RIB** (`rib`, deepens: `zebra`)
  - **Simple:** Every route zebra knows, from every source, as `show ip route` prints it.
    `>` marks the one it selected for each network.
  - **Deep:** RIB is Routing Information Base. Connected, local, static, and later OSPF and
    BGP routes all arrive here; for each network zebra selects one (2.5 says how) and
    sends it to the kernel. A static route whose next hop is unresolved never arrives:
    staticd holds it back, so FRR 10.6.1 shows no inactive line for it.
  - **Sources:** `zebra/zebra_rib.c`, `zebra/zebra_vty.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show ip route"`
- **The kernel's table, the FIB** (`fib`, deepens: `route`)
  - **Simple:** The routes Linux forwards with, as `ip route` prints them. `*` in
    `show ip route` marks a route that is in it.
  - **Deep:** FIB is Forwarding Information Base. zebra installs each selected route over
    netlink, `proto static metric 20` for a static one. Packets are forwarded by Linux,
    from this table only: FRR could be stopped and the packets would still go where these
    lines say, until zebra removes them as it stops.
  - **Sources:** `zebra/rt_netlink.c`, `zebra/zebra_nhg.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `ip route`
- **A next hop must be reachable** (`next-hop-resolution`, deepens: `next-hop`)
  - **Simple:** A route is used only if its next hop can be reached through another route.
    `show ip nht` says which can.
  - **Deep:** staticd registers each next hop with zebra's next-hop tracking. zebra answers
    `resolved via connected, prefix 10.0.1.0/30` or `unresolved`, and tells staticd again
    whenever that changes, so a route comes and goes with the route to its next hop.
  - **Sources:** `zebra/zebra_rnh.c`, `staticd/static_nht.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show ip nht"`

### Hand-off

"What if two routes for one network both get through? In The Backup Path."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Another next hop no connected network covers: still unresolved.
  - id: still-too-far
    passes: false
    changes:
      - router: a
        lines: [configure terminal, no ip route 10.0.2.0/30 10.0.2.1, ip route 10.0.2.0/30 10.0.2.2]
  - id: fixed
    passes: true
    changes:
      - router: a
        lines: [configure terminal, no ip route 10.0.2.0/30 10.0.2.1, ip route 10.0.2.0/30 10.0.1.2]
  # The right route added, the wrong one left: only the right one is used.
  - id: added-beside
    passes: true
    changes:
      - router: a
        lines: [configure terminal, ip route 10.0.2.0/30 10.0.1.2]
```

---

## 2.5 — The Backup Path

- **Id:** `the-backup-path` · **Guide:** zebra · **Time:** ~20 min · **Prerequisites:**
  `written-but-not-used`
- **Question:** a has two ways to c. How does it choose, and how do you keep the other one
  ready?
- **The one new idea:** administrative distance: for one network, zebra selects the route
  with the lowest distance; equal distances share the traffic.
- **Teaches:** `administrative-distance`, `floating-static`, `ecmp` · **Names:** none ·
  **Uses:** `static-route`, `next-hop`, `rib`, `fib`, `interface-shutdown`, `ttl`

### Network

A triangle. Only c has a loopback, the address a wants to reach.

```yaml
routers:
  - { name: a, daemons: [staticd], config: "ip route 10.255.0.3/32 10.0.1.2\n" }
  - { name: b, daemons: [staticd], config: "ip route 10.255.0.3/32 10.0.3.2\n" }
  - { name: c, loopback: 10.255.0.3/32, daemons: [staticd], config: "ip route 10.0.1.0/30 10.0.3.1\n" }
links:
  - ends: [{ router: a, address: 10.0.1.1/30 }, { router: b, address: 10.0.1.2/30 }]
  - ends: [{ router: a, address: 10.0.2.1/30 }, { router: c, address: 10.0.2.2/30 }]
  - ends: [{ router: b, address: 10.0.3.1/30 }, { router: c, address: 10.0.3.2/30 }]
```

### Beats

- **Scene.** zebra: "a reaches c's loopback, `10.255.0.3`, the long way, through b, while a
  cable runs straight to c. Send it straight, and keep the long way ready in case the
  cable fails."
- **See it.** `show ip route`: `S>* 10.255.0.3/32 [1/0] via 10.0.1.2, a-b`.
  `traceroute -n 10.255.0.3`: ` 1  10.0.1.2` then ` 2  10.255.0.3`. In `[1/0]`, the 1 is
  the route's administrative distance.
- **Build it.** Add the direct route: `ip route 10.255.0.3/32 10.0.2.2`. `show ip route`:

  ```
  S>* 10.255.0.3/32 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:02
    *                     via 10.0.2.2, a-c, weight 1, 00:00:02
  ```

  Both are used: equal distance, so the kernel shares the traffic between two next hops
  (`ip route` shows two `nexthop via` lines). Give the long way a higher distance:
  `ip route 10.255.0.3/32 10.0.1.2 10`. It replaces the old line:

  ```
  S   10.255.0.3/32 [10/0] via 10.0.1.2, a-b, weight 1, 00:00:02
  S>* 10.255.0.3/32 [1/0] via 10.0.2.2, a-c, weight 1, 00:00:02
  ```

  The backup is in zebra's table without `>*`: known, not selected, not in the kernel.
  `show ip route 10.255.0.3` says so in words: `distance 10 … Status: None` and
  `distance 1, metric 0, best … Status: Installed`.
- **Watch it.** Predict below: shut the direct cable (`interface a-c`, `shutdown`).
  `show ip route` now: `S>* 10.255.0.3/32 [10/0] via 10.0.1.2, a-b`; `traceroute` goes
  through `10.0.1.2` again; the ping still answers (`ttl=63`). `no shutdown`, and the direct
  route is selected again: `S>* 10.255.0.3/32 [1/0] via 10.0.2.2, a-c`, with
  `S   … [10/0] via 10.0.1.2` waiting.
- **Debrief.** "Lowest distance wins; a tie shares the traffic; a higher distance waits as a
  backup. Time to build a line of routers alone: Bring the Line Up."

### Objectives

| Id          | Text                                                                 | Check                                                                                 |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `direct`    | Make a send to c's loopback, 10.255.0.3, only over the direct cable. | `{ kind: route, router: a, to: 10.255.0.3, protocol: static, via: 10.0.2.2 }`         |
| `backup`    | Keep the route through b in a's configuration, as a backup.          | `{ kind: config, router: a, source: running, line: ip route 10.255.0.3/32 10.0.1.2 }` |
| `reaches-c` | Reach 10.255.0.3 from a.                                             | `{ kind: reaches, from: a, to: 10.255.0.3 }`                                          |

### Hints

1. **Nudge:** "Read the numbers in brackets in `show ip route`. After you add a second
   route, read them again: which lines have `>*`?"
2. **The idea:** "For one network, zebra selects the lowest distance. Equal distances are
   both used. A route given a higher distance waits until the better one goes."
3. **The spot:** "Add the direct route, then write the route through b again with a
   distance after it." Command: `ip route 10.255.0.3/32 10.0.1.2 10`

### Chips

`show ip route`, `traceroute -n`, `ip route` (in configure mode; a number after the next hop
is the distance), `shutdown` and `no shutdown` (in interface mode).

### Predict

"You shut the direct cable. What happens to a's way to c?" — c is unreachable / **the route
through b takes over by itself** / both routes go. Seen: `S>* 10.255.0.3/32 [10/0] via
10.0.1.2, a-b`, and the ping answers.

### Codex (chapter: Follow a Packet)

- **Administrative distance** (`administrative-distance`, deepens: `rib`)
  - **Simple:** A number per route, the first in `[1/0]`. For one network, zebra selects
    the lowest. Static routes default to 1.
  - **Deep:** Each source has a default, from zebra's table of route types: static 1, and
    for later stages eBGP 20, OSPF 110, iBGP 200. A route added from Linux shows as
    `K>* [0/0]` and beats a static one. The
    second number, the metric, compares routes from the same protocol. Distance never
    leaves the router: neighbours don't see it.
  - **Sources:** `zebra/zebra_rib.c`, `lib/route_types.txt` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show ip route 10.255.0.3"`
- **A floating static route** (`floating-static`, deepens: `static-route`)
  - **Simple:** A static route with a higher distance: a backup that waits in zebra's table
    and is used only when the better route goes.
  - **Deep:** Written as `ip route 10.255.0.3/32 10.0.1.2 10`. The same network and next
    hop with a new distance replaces the old line. It takes over when the better route
    leaves zebra's table, as when its interface is shut. It cannot see a cable that still
    looks up but drops everything: stage 4 shows why.
  - **Sources:** `staticd/static_vty.c` · **Docs:** https://docs.frrouting.org/en/latest/static.html
  - **Try it:** `vtysh -c "show ip route static"`
- **Equal-cost paths** (`ecmp`)
  - **Simple:** Two routes for one network with the same distance are both used: the
    kernel shares the traffic between two next hops.
  - **Deep:** ECMP is equal-cost multipath. zebra installs one route with several next hops
    (`ip route` lists each `nexthop via`), and Linux chooses between them for each flow of
    packets. Stage 3 balances over equal paths on purpose.
  - **Sources:** `zebra/zebra_nhg.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `ip route`

### Hand-off

"Time to build a line of routers alone: Bring the Line Up."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Direct route added, distances equal: traffic shared, not only direct.
  - id: equal-distances
    passes: false
    changes:
      - router: a
        lines: [configure terminal, ip route 10.255.0.3/32 10.0.2.2]
  # The route through b removed: direct only, no backup.
  - id: no-backup
    passes: false
    changes:
      - router: a
        lines: [configure terminal, no ip route 10.255.0.3/32 10.0.1.2, ip route 10.255.0.3/32 10.0.2.2]
  - id: floating-backup
    passes: true
    changes:
      - router: a
        lines: [configure terminal, ip route 10.255.0.3/32 10.0.2.2, ip route 10.255.0.3/32 10.0.1.2 10]
```

---

## 2.6 — Bring the Line Up (capstone)

- **Id:** `bring-the-line-up` · **Guide:** zebra, watchfrr · **Time:** ~20 min ·
  **Prerequisites:** `the-backup-path`
- **Question:** From bare cables, can you make a reach c, and keep it so after every router
  restarts?
- **The one new idea:** none: addresses, routes both ways, saving and restarting together.
- **Teaches:** none · **Uses:** `ip-address`, `prefix`, `connected-route`, `static-route`,
  `next-hop`, `return-path`, `rib`, `fib`, `saved-config`, `write-memory`,
  `frr-init-script`

### Network

```yaml
routers:
  - { name: a, daemons: [], startup: watchfrr, config: "" }
  - { name: b, daemons: [], startup: watchfrr, config: "" }
  - { name: c, daemons: [], startup: watchfrr, config: "" }
links:
  - ends:
      - { router: a, address: 10.0.1.1/30, unaddressed: true }
      - { router: b, address: 10.0.1.2/30, unaddressed: true }
  - ends:
      - { router: b, address: 10.0.2.1/30, unaddressed: true }
      - { router: c, address: 10.0.2.2/30, unaddressed: true }
```

watchfrr starts staticd on every router whatever the `daemons` file says, so no router needs
`daemons: [staticd]`.

### Beats

- **Scene.** zebra: "Three routers, two new cables, nothing configured. The plan is on the
  topology. Make a reach c, and make it last."
- **See it / Build it.** Alone, with the plan's addresses. Four addresses, a route on a, a
  route back on c, `write memory` on each router, then
  `/usr/lib/frr/frrinit.sh restart <router>` on each.
- **Watch it.** Predict below. After the reference solution and three restarts, a's
  `show ip route`: `C>* 10.0.1.0/30 …`, `L>* 10.0.1.1/32 …`,
  `S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b`; ping answered with `ttl=63`; a's `frr.conf`
  holds `ip route 10.0.2.0/30 10.0.1.2` and `interface a-b` / ` ip address 10.0.1.1/30`.
- **Debrief.** "Every route here was written by hand, on every router, both ways. Imagine a
  hundred routers. In stage 3, the routers learn the routes from each other, and the peers
  come back."

### Objectives

| Id                 | Text                                           | Check                                                                                                |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `a-reaches-c`      | Reach c's address, 10.0.2.2, from a.           | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                                           |
| `a-address-lasts`  | a restarts with its address.                   | `{ kind: config, router: a, source: started, block: [interface a-b], line: ip address 10.0.1.1/30 }` |
| `b-addresses-last` | b restarts with its address towards a.         | `{ kind: config, router: b, source: started, block: [interface b-a], line: ip address 10.0.1.2/30 }` |
| `b-c-lasts`        | b restarts with its address towards c.         | `{ kind: config, router: b, source: started, block: [interface b-c], line: ip address 10.0.2.1/30 }` |
| `c-address-lasts`  | c restarts with its address.                   | `{ kind: config, router: c, source: started, block: [interface c-b], line: ip address 10.0.2.2/30 }` |
| `a-route-lasts`    | a restarts with its route to c's network.      | `{ kind: config, router: a, source: started, line: ip route 10.0.2.0/30 }`                           |
| `c-route-lasts`    | c restarts with its route back to a's network. | `{ kind: config, router: c, source: started, line: ip route 10.0.1.0/30 }`                           |

### Hints

1. **Nudge:** "Follow one packet from a to c, and its reply back. At each router, which
   line of which table sends it on?"
2. **The idea:** "Each end needs its address (Two Ends of One Cable); a needs a way there
   and c a way back (The Reply That Never Came Back); a restart keeps only what was saved
   (Gone After the Restart)."
3. **The spot:** "On each router, save, then restart FRR with its script." Command:
   `write memory`

### Chips

Names only: `ip address`, `ip route`, `show ip route`, `ip route get`, `ping`,
`write memory`, `frrinit.sh`.

### Predict

"An address configured in FRR and never saved: FRR restarts. Is the address still on the
interface?" — no, gone everywhere / **Linux still has it; FRR's configuration doesn't** /
yes, both. Seen: after the restart `ip -br addr` still shows `a-b@if2 UP 10.0.1.1/30`, and
`show running-config` has no `interface a-b` block. Linux keeps an address until someone
removes it; FRR only knows what `frr.conf` gave it.

### Codex

No new cards. The chapter ends with **You can now…**: "give interfaces addresses and read
the routes they bring, write static routes and their next hops, find a missing way back,
follow a route from FRR's configuration through zebra's table into the kernel's, and choose
between routes with administrative distance."

### Hand-off

"In stage 3, the routers learn the routes from each other, and the peers come back."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Everything right, never saved, then restarted.
  - id: not-saved
    passes: false
    changes:
      - router: a
        lines: [configure terminal, interface a-b, ip address 10.0.1.1/30, exit, ip route 10.0.2.0/30 10.0.1.2]
      - router: b
        lines: [configure terminal, interface b-a, ip address 10.0.1.2/30, exit, interface b-c, ip address 10.0.2.1/30]
      - router: c
        lines: [configure terminal, interface c-b, ip address 10.0.2.2/30, exit, ip route 10.0.1.0/30 10.0.2.1]
      - { router: a, restart: true }
      - { router: b, restart: true }
      - { router: c, restart: true }
  # Addresses from Linux, routes in FRR and saved: a reaches c, and FRR's files lack the addresses.
  - id: addresses-from-linux
    passes: false
    changes:
      - router: a
        shell: [ip addr add 10.0.1.1/30 dev a-b]
      - router: b
        shell: [ip addr add 10.0.1.2/30 dev b-a, ip addr add 10.0.2.1/30 dev b-c]
      - router: c
        shell: [ip addr add 10.0.2.2/30 dev c-b]
      - router: a
        lines: [configure terminal, ip route 10.0.2.0/30 10.0.1.2, end, write memory]
      - router: c
        lines: [configure terminal, ip route 10.0.1.0/30 10.0.2.1, end, write memory]
      - { router: a, restart: true }
      - { router: b, restart: true }
      - { router: c, restart: true }
  - id: line-up
    passes: true
    changes:
      - router: a
        lines:
          [
            configure terminal,
            interface a-b,
            ip address 10.0.1.1/30,
            exit,
            ip route 10.0.2.0/30 10.0.1.2,
            end,
            write memory,
          ]
      - router: b
        lines:
          [
            configure terminal,
            interface b-a,
            ip address 10.0.1.2/30,
            exit,
            interface b-c,
            ip address 10.0.2.1/30,
            end,
            write memory,
          ]
      - router: c
        lines:
          [
            configure terminal,
            interface c-b,
            ip address 10.0.2.2/30,
            exit,
            ip route 10.0.1.0/30 10.0.2.1,
            end,
            write memory,
          ]
      - { router: a, restart: true }
      - { router: b, restart: true }
      - { router: c, restart: true }
```

`line-up` was played on the Machine with these lines and restarts: a reached c with
`ttl=63`, and each `frr.conf` held its addresses and routes.

---

## What stage 2 needs that does not exist yet

- **IPv6.** The README's stage 2 promises IPv6 addressing. It needs IPv6 addresses in the
  network definition and in the `route` and `reaches` checks; then a mission between 2.1
  and 2.2 (`ipv6 address`, `show ipv6 route`, `ip -6 route`) fits the stage.
- **The `started` source for several routers** (2.6): each router's started file is read on
  its own, after that router's restart.
- Nothing else: every other check here is one of today's kinds.
