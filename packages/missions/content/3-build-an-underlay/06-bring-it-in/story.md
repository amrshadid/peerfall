# Bring It In

**Question:** c knows a customer's network that OSPF has never heard of. How do the others learn it?

## Scene

> **ospfd:** A line this time: a, b and c run OSPF. Past c sits d, a customer's router that speaks no OSPF at all. Its address is `192.0.2.1`. c reaches it by a static route someone wrote, and d sends every reply back to c by a default route, `0.0.0.0/0`, which covers any address. a and b have never heard of `192.0.2.1`. Make them.

## See it

> **ospfd:** On a, try the customer: `ping -c 2 192.0.2.1`.

---

```
a:~# ping -c 2 192.0.2.1
ping: connect: Network unreachable
```

> **ospfd:** No route covers it, so Linux refuses even to send, as in One Hop Further. Read my map on a: `vtysh -c "show ip ospf database"`.

---

```
                Router Link States (Area 0.0.0.0)

Link ID         ADV Router      Age  Seq#       CkSum  Link count
10.255.0.1     10.255.0.1        28 0x80000003 0x637a 3
10.255.0.2     10.255.0.2        29 0x80000005 0x8003 5
10.255.0.3     10.255.0.3        30 0x80000003 0xb71d 3
```

> **ospfd:** Three router-LSAs, one per OSPF router, each listing the links where that router runs OSPF. Nothing about `192.0.2.1`. Now click c and ask zebra where it got the customer: `vtysh -c "show ip route 192.0.2.1"`.

---

```
Routing entry for 192.0.2.1/32
  Known via "static", distance 1, metric 0, best
  Last update 00:00:43 ago
  Flags: Recursion Selected RR Distance 
  Status: Installed 
  * 10.0.3.2, via c-d, weight 1
```

> **ospfd:** From staticd. I put on the map only the interfaces I run on, and a static route is not one of them. c has the route and keeps it to itself.

> **ospfd:** The way back is ready already. Click d and read its kernel's table: `ip route`.

---

```
default nhid 8 via 10.0.3.1 dev d-c proto static metric 20 
10.0.3.0/30 dev d-c proto kernel scope link src 10.0.3.2 
```

> **ospfd:** `default` is `0.0.0.0/0`: whatever a reply is addressed to, d hands it to c's `10.0.3.1`. d never needs to know a's networks. The way there is what is missing, and it starts at c.

## Build it

> **ospfd:** Click c again and open `vtysh`.

---

> **ospfd:** Then `configure terminal`.

---

> **ospfd:** And `router ospf`, the mode for my settings.

---

> **ospfd:** Type `redistribute ?` with no Enter, then Continue.

---

```
c(config-router)# redistribute 
  babel         Babel routing protocol (Babel)
  bgp           Border Gateway Protocol (BGP)
  connected     Connected routes (directly attached subnet or host)
  eigrp         Enhanced Interior Gateway Routing Protocol (EIGRP)
  isis          Intermediate System to Intermediate System (IS-IS)
  kernel        Kernel routes (not installed via the zebra RIB)
  local         Local routes (directly attached host route)
  nhrp          Next Hop Resolution Protocol (NHRP)
  openfabric    OpenFabric Routing Protocol
  ospf          Open Shortest Path First
  rip           Routing Information Protocol (RIP)
  static        Statically configured routes
  table         Non-main Kernel Routing Table
  table-direct  Non-main Kernel Routing Table - Direct
  vnc           Virtual Network Control (VNC)
```

> **ospfd:** Every source of routes I can take from zebra: `connected` for the networks of c's own interfaces, `static` for the routes staticd holds, and other protocols, most of them later stages. Bringing a source's routes into a protocol is _redistribution_. Erase the line and take staticd's: `redistribute static`.

---

> **ospfd:** Read my map again: `do show ip ospf database`.

---

```
                AS External Link States

Link ID         ADV Router      Age  Seq#       CkSum  Route
192.0.2.1      10.255.0.3         1 0x80000001 0x5598 E2 192.0.2.1/32 [0x0]
```

> **ospfd:** A new section under the router-LSAs. An _external LSA_: one route from outside OSPF, `192.0.2.1/32`, sent by c. A router that brings outside routes in is an ASBR, an autonomous system boundary router, and the autonomous system is every router this OSPF reaches. Unlike a router-LSA, an external LSA lists no links: only the network, and c as the way to it.

## Watch it

> **ospfd:** Click a and ask zebra: `vtysh -c "show ip route 192.0.2.1"`.

---

```
Routing entry for 192.0.2.1/32
  Known via "ospf", distance 110, metric 20, best
  Last update 00:00:09 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.1.2, via a-b, weight 1
```

> **ospfd:** Metric 20. b is one link nearer to c. What metric does b's route show?
>
> - 10, one link less
> - [x] 20, the same as a's
> - 30, one link more

> **ospfd:** Click b and type the same line.

---

```
Routing entry for 192.0.2.1/32
  Known via "ospf", distance 110, metric 20, best
  Last update 00:00:14 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.2.2, via b-c, weight 1
```

> **ospfd:** 20 again. The `E2` in the database, external type 2, means the route keeps the metric c gave it, 20, however far it travels: no link's cost is added. Click a and ping the customer: `ping -c 3 192.0.2.1`.

---

```
64 bytes from 192.0.2.1: icmp_seq=1 ttl=62 time=5.90 ms
64 bytes from 192.0.2.1: icmp_seq=2 ttl=62 time=0.807 ms
64 bytes from 192.0.2.1: icmp_seq=3 ttl=62 time=0.674 ms
```

> **ospfd:** `ttl=62`: two routers on the way, b and c. The replies came back by d's default route to c, then by my routes to a.

## Debrief

> **ospfd:** OSPF tells its peers only what it runs on. Redistribution brings in the rest, as external routes from the router that holds them. Every router here shares one map. In Draw the Borders, the map is split.

## Real world

On the FRR router that holds the static route:

```
vtysh
configure terminal
 router ospf
  redistribute static
end
show ip ospf database external
```

On any other OSPF router, `show ip ospf route` lists the route under `OSPF external routing table`, as `N E2`.
