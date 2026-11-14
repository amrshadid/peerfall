# The Cheaper Way

**Question:** a has two ways to d. Which one does OSPF choose, and how do you change its mind?

## Scene

Four routers in a square: a–b, a–c, b–d and c–d, every one an OSPF peer of its two neighbours.

> **ospfd:** a reaches d's loopback, `10.255.0.4`, through b, and d answers through b too. Nobody wrote those routes: I worked them out. Tonight b's links are wanted for other traffic, so send a's traffic to d, and d's replies, through c. Take no link down, since b still needs it. Change my mind instead.

## See it

> **ospfd:** On a, open `vtysh`.

---

> **ospfd:** Then `show ip ospf interface a-b`.

---

```
a-b is up
  ifindex 2, MTU 1500 bytes, BW 10000 Mbit <UP,LOWER_UP,BROADCAST,RUNNING,MULTICAST>
  Internet Address 10.0.1.1/30, Broadcast 10.0.1.3, Area 0.0.0.0
  MTU mismatch detection: enabled
  Router ID 10.255.0.1, Network Type POINTOPOINT, Cost: 10
  Transmit Delay is 1 sec, State Point-To-Point, Priority 1
  No backup designated router on this network
  Multicast group memberships: OSPFAllRouters
  Timer intervals configured, Hello 10s, Dead 40s, Wait 40s, Retransmit 5
    Hello due in 7.840s
  Neighbor Count is 1, Adjacent neighbor count is 1
  Graceful Restart hello delay: 10s
  LSA retransmissions: 1
```

> **ospfd:** `Cost: 10`. Every OSPF interface has a _cost_, the price of sending out of it, and it is written in the router's router-LSA. `a-c` costs 10 too, and both ends of the c–d link cost 30. A path costs the sum of the interfaces it leaves by: through b, 10 + 10 = 20; through c, 10 + 30 = 40. My answer: `show ip ospf route`.

---

```
============ OSPF network routing table ============
N    10.0.1.0/30           [10] area: 0.0.0.0
                           directly attached to a-b
N    10.0.2.0/30           [10] area: 0.0.0.0
                           directly attached to a-c
N    10.0.3.0/30           [20] area: 0.0.0.0
                           via 10.0.1.2, a-b
N    10.0.4.0/30           [40] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.255.0.1/32         [0] area: 0.0.0.0
                           directly attached to lo
N    10.255.0.2/32         [10] area: 0.0.0.0
                           via 10.0.1.2, a-b
N    10.255.0.3/32         [10] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.255.0.4/32         [20] area: 0.0.0.0
                           via 10.0.1.2, a-b

============ OSPF router routing table =============

============ OSPF external routing table ===========
```

> **ospfd:** My own table, before zebra's; the two tables under it stay empty for now. `10.255.0.4/32 [20]`, `via 10.0.1.2`: cost 20, through b. Every router runs the _shortest path first_, SPF, on the shared database. It starts from itself, adds up costs outwards, and keeps the cheapest path to each network. Like a map app choosing the shortest road, except that each router only picks the next hop, and trusts the next router to do the same. Type `exit`.

---

> **ospfd:** At the shell, follow a packet: `traceroute -n 10.255.0.4`.

---

```
traceroute to 10.255.0.4 (10.255.0.4), 30 hops max, 46 byte packets
 1  10.0.1.2  0.168 ms  0.066 ms  0.090 ms
 2  10.255.0.4  0.118 ms  0.063 ms  0.066 ms
```

> **ospfd:** b first, then d, as my table said. zebra put my choice in the kernel, and every packet to d follows it. The way through c waits unused, because it costs more.

## Build it

> **ospfd:** Make the way through b cost more than 40. Open `vtysh`.

---

> **ospfd:** Then `configure terminal`.

---

> **ospfd:** Then `interface a-b`.

---

> **ospfd:** And `ip ospf cost 50`.

---

> **ospfd:** Look again: `do show ip ospf route`.

---

```
============ OSPF network routing table ============
N    10.0.1.0/30           [50] area: 0.0.0.0
                           directly attached to a-b
N    10.0.2.0/30           [10] area: 0.0.0.0
                           directly attached to a-c
N    10.0.3.0/30           [50] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.0.4.0/30           [40] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.255.0.1/32         [0] area: 0.0.0.0
                           directly attached to lo
N    10.255.0.2/32         [50] area: 0.0.0.0
                           via 10.0.1.2, a-b
                           via 10.0.2.2, a-c
N    10.255.0.3/32         [10] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.255.0.4/32         [40] area: 0.0.0.0
                           via 10.0.2.2, a-c

============ OSPF router routing table =============

============ OSPF external routing table ===========
```

> **ospfd:** `10.255.0.4/32 [40] via 10.0.2.2`: through b costs 50 + 10 = 60 now, so c wins at 40. My router-LSA carries the new cost, flooded to every router's database. Now the way back. Click d, and type `traceroute -n 10.255.0.1`.

---

```
traceroute to 10.255.0.1 (10.255.0.1), 30 hops max, 46 byte packets
 1  10.0.3.1  0.091 ms  0.076 ms  0.060 ms
 2  10.255.0.1  0.077 ms  0.052 ms  0.059 ms
```

> **ospfd:** Still b first. d adds the costs of the interfaces it sends out of: `d-b`, 10, then b's `b-a`, still 10. a's 50 counts only for packets leaving a. Click b, and open `vtysh`.

---

> **ospfd:** Then `configure terminal`.

---

> **ospfd:** Then `interface b-a`.

---

> **ospfd:** And `ip ospf cost 50`.

---

## Watch it

> **ospfd:** Click d. Before you type `traceroute -n 10.255.0.1` again: which way does d's packet go now?
>
> - still through b
> - [x] through c
> - through both

---

```
traceroute to 10.255.0.1 (10.255.0.1), 30 hops max, 46 byte packets
 1  10.0.4.1  0.090 ms  0.136 ms  0.109 ms
 2  10.255.0.1  0.117 ms  0.241 ms  0.243 ms
```

> **ospfd:** Through c, `10.0.4.1`: 10 + 50 = 60 through b, against 30 + 10 = 40. Each router draws its own tree from the same map, so a path and its way back are chosen at different ends, and both had to change. The link a–b stays up, and b stays a peer of a and of d: only the costs changed. Had the two totals been equal, both next hops would carry traffic, an ECMP route as in The Backup Path.

## Debrief

> **ospfd:** OSPF adds up the costs of the interfaces a packet leaves by and takes the cheapest path. To move traffic, change the cost at each end that sends into it. Next, two paths that cost the same: Two Ways at Once.

## Real world

On any FRR router that runs `ospfd`, with your own interface names:

```
vtysh
show ip ospf interface
show ip ospf route
configure terminal
 interface eth0
  ip ospf cost 50
end
show ip ospf route
exit
traceroute -n 10.255.0.4
```

Set the cost at both ends of a link when the way back should move too.
