# Say Hello

**Question:** b speaks OSPF on the link to a, and a does not answer. What makes two routers peers?

## Scene

> **ospfd:** Welcome to stage 3, Build an underlay. In stage 2 you wrote every route by hand. Here the routers work out their routes themselves. I'm ospfd, FRR's daemon for OSPF, a routing protocol: each router tells the others what it is connected to. On b, I send a hello into the link to a every 10 seconds. Nobody has answered yet.

## See it

> **ospfd:** Start on a. Open `vtysh`.

---

> **ospfd:** Then `show ip ospf neighbor`.

---

```

Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
```

> **ospfd:** The routers I talk to, one per line, and there are none. A router that a routing protocol talks to is a _peer_, and the Peerfall is named after them. a has no peer. Ask which interfaces I run on: `show ip ospf interface`.

---

```
lo is up
  ifindex 1, MTU 65536 bytes, BW 0 Mbit <UP,LOWER_UP,LOOPBACK,RUNNING>
  Internet Address 10.255.0.1/32, Broadcast 10.255.0.1, Area 0.0.0.0
  MTU mismatch detection: enabled
  Router ID 10.255.0.1, Network Type LOOPBACK, Cost: 0
  Transmit Delay is 1 sec, State Loopback, Priority 1
  No backup designated router on this network
  Multicast group memberships: <None>
  Timer intervals configured, Hello 10s, Dead 40s, Wait 40s, Retransmit 5
    No Hellos (Passive interface)
  Neighbor Count is 0, Adjacent neighbor count is 0
  Graceful Restart hello delay: 10s
  LSA retransmissions: 0
```

> **ospfd:** Only `lo`, a's loopback, in `Area 0.0.0.0`. An _area_ is a group of OSPF links and the routers on them, and area 0 is where every OSPF network starts. `a-b` isn't listed: OSPF doesn't run there, so a never answers. Now b's end. Click b, and type `vtysh -c "show ip ospf interface b-a"`.

---

```
b-a is up
  ifindex 2, MTU 1500 bytes, BW 10000 Mbit <UP,LOWER_UP,BROADCAST,RUNNING,MULTICAST>
  Internet Address 10.0.1.2/30, Broadcast 10.0.1.3, Area 0.0.0.0
  MTU mismatch detection: enabled
  Router ID 10.255.0.2, Network Type POINTOPOINT, Cost: 10
  Transmit Delay is 1 sec, State Point-To-Point, Priority 1
  No backup designated router on this network
  Multicast group memberships: OSPFAllRouters
  Timer intervals configured, Hello 10s, Dead 40s, Wait 40s, Retransmit 5
    Hello due in 1.850s
  Neighbor Count is 0, Adjacent neighbor count is 0
  Graceful Restart hello delay: 10s
  LSA retransmissions: 0
```

> **ospfd:** b's end is in area 0. `Hello 10s`: a hello every 10 seconds, a small OSPF packet that says who b is and which peers b has heard. `Hello due in` counts down to the next. `Dead 40s`: a peer silent for 40 seconds is dropped. `Neighbor Count is 0`: nobody answers.

## Build it

> **ospfd:** Click a, and open `vtysh`.

---

> **ospfd:** Then `configure terminal`.

---

> **ospfd:** Then `interface a-b`.

---

> **ospfd:** And `ip ospf area 0`: run OSPF on this interface, in the same area as b's end.

---

> **ospfd:** Give b's next hello up to 10 seconds, then look: `do show ip ospf neighbor`.

---

```

Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.255.0.2        1 Full/-          2.795s            37.138s 10.0.1.2        a-b:10.0.1.1                         1     0     0
```

> **ospfd:** A peer. `10.255.0.2` is b, named by its router id, its loopback address. `Full` means we have swapped everything each of us knew, so we hold the same picture of the network. The Shared Map opens that picture. `Dead Time` starts again at every hello. Type `end`.

---

> **ospfd:** Then `exit`, back to the shell.

---

> **ospfd:** My log has every step we took: `grep AdjChg /var/log/frr/a.log`.

---

```
2026/11/14 12:30:28.723 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.2, NbrIP 10.0.1.2 (default) on a-b:10.0.1.1: Down -> Init (HelloReceived)
2026/11/14 12:30:28.728 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.2, NbrIP 10.0.1.2 (default) on a-b:10.0.1.1: Init -> ExStart (2-WayReceived)
2026/11/14 12:30:28.747 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.2, NbrIP 10.0.1.2 (default) on a-b:10.0.1.1: ExStart -> Exchange (NegotiationDone)
2026/11/14 12:30:28.771 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.2, NbrIP 10.0.1.2 (default) on a-b:10.0.1.1: Exchange -> Loading (ExchangeDone)
2026/11/14 12:30:28.795 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.2, NbrIP 10.0.1.2 (default) on a-b:10.0.1.1: Loading -> Full (LoadingDone)
```

> **ospfd:** From nothing to `Full` in under a tenth of a second, once b's hello arrived. `Init`: a heard b. Then each saw itself named in the other's hello, and the steps in between are the swap itself. Never Reached Full takes them apart.

## Watch it

> **ospfd:** Before you type `vtysh -c "show ip route"`: what distance will a's route to b's loopback have?
>
> - 1, like a static route
> - [x] 110
> - 0, like a connected route

---

```
Codes: K - kernel route, C - connected, L - local, S - static,
       R - RIP, O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric, t - Table-Direct,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

IPv4 unicast VRF default:
O   10.0.1.0/30 [110/10] is directly connected, a-b, weight 1, 00:00:20
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:01:44
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:01:44
O   10.255.0.1/32 [110/0] is directly connected, lo, weight 1, 00:01:34
L * 10.255.0.1/32 is directly connected, lo, weight 1, 00:01:44
C>* 10.255.0.1/32 is directly connected, lo, weight 1, 00:01:44
O>* 10.255.0.2/32 [110/10] via 10.0.1.2, a-b, weight 1, 00:00:09
```

> **zebra:** `O` is OSPF. `110` is the distance I give OSPF's routes, against 1 for a static one, so a route written by hand would win. The second number, `10`, is OSPF's cost to get there. Nobody typed this route: ospfd learned it from b and handed it to me, and I put it in the kernel. The `O` lines without `>*` are networks a is plugged into, where the connected route wins.

## Debrief

> **ospfd:** Two routers become peers once both ends of their link run OSPF, in the same area. Then each learns what the other is connected to, and nobody writes the route. In The Shared Map, three routers, and the picture they share.

## Real world

On any FRR router that runs `ospfd`, with your own interface names:

```
vtysh
show ip ospf interface
configure terminal
 interface eth0
  ip ospf area 0
end
show ip ospf neighbor
show ip route
```

Turn OSPF on at both ends of the link, in the same area.
