# Draw the Borders

**Question:** a is meant to sit in its own area behind b. Why have a and b stopped talking?

## Scene

> **ospfd:** Three routers in a line, a, b and c. Until now every router held the whole map. Here the plan splits it into _areas_: parts of the network whose routers share one map. b and c stay in area 0, the backbone, which every other area must touch. a goes into area 1, behind b, and should see less of the map. Someone set it up, and since then a and b are not peers.

## See it

> **ospfd:** On a, ask for its peers: `vtysh -c "show ip ospf neighbor"`.

---

```
Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL

```

> **ospfd:** None at all, not even one stuck before `Full`. Read the end of a's log: `tail -n 4 /var/log/frr/a.log`.

---

```
2026/11/14 12:24:41.747 OSPF: [Y9FH4-5CVMQ][EC 134217741] interface a-b: ospf_read invalid Area ID 0.0.0.0
2026/11/14 12:24:51.789 OSPF: [Y9FH4-5CVMQ][EC 134217741] interface a-b: ospf_read invalid Area ID 0.0.0.0
2026/11/14 12:25:01.793 OSPF: [Y9FH4-5CVMQ][EC 134217741] interface a-b: ospf_read invalid Area ID 0.0.0.0
2026/11/14 12:25:11.789 OSPF: [Y9FH4-5CVMQ][EC 134217741] interface a-b: ospf_read invalid Area ID 0.0.0.0
```

> **ospfd:** Every 10 seconds a hello from b arrives on `a-b`, and I throw it away. `ospf_read` is the part of me that reads each packet as it comes in, and this is what it says before it drops one. Each OSPF packet carries the area it was sent in, written like an address: area 0 is `0.0.0.0`, area 1 is `0.0.0.1`. Ask which area a's end is in: `vtysh -c "show ip ospf interface a-b"`.

---

```
a-b is up
  ifindex 2, MTU 1500 bytes, BW 10000 Mbit <UP,LOWER_UP,BROADCAST,RUNNING,MULTICAST>
  Internet Address 10.0.1.1/30, Broadcast 10.0.1.3, Area 0.0.0.1
```

> **ospfd:** `Area 0.0.0.1`, as planned. Click b and ask the same about its end: `vtysh -c "show ip ospf interface b-a"`.

---

```
b-a is up
  ifindex 2, MTU 1500 bytes, BW 10000 Mbit <UP,LOWER_UP,BROADCAST,RUNNING,MULTICAST>
  Internet Address 10.0.1.2/30, Broadcast 10.0.1.3, Area 0.0.0.0
```

> **ospfd:** `Area 0.0.0.0`. The two ends of one link disagree, so each drops the other's hellos. a stays in area 1, so b's end is the one to move.

## Build it

> **ospfd:** On b, open `vtysh`.

---

> **ospfd:** Then `configure terminal`.

---

> **ospfd:** And `interface b-a`.

---

> **ospfd:** Try the new area straight away: `ip ospf area 1`.

---

```
b(config-if)# ip ospf area 1
Must remove previous area config before changing ospf area 
```

> **ospfd:** Refused: an interface is in one area at a time. Take it out first: `no ip ospf area 0`.

---

> **ospfd:** Now `ip ospf area 1`.

---

> **ospfd:** Look at b's peers: `do show ip ospf neighbor`.

---

```
Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.255.0.3        1 Full/-          58.333s           31.254s 10.0.2.2        b-c:10.0.2.1                         2     0     0
10.255.0.1        1 Full/-          0.035s            39.732s 10.0.1.1        b-a:10.0.1.2                         1     0     0
```

> **ospfd:** a is `Full`, on `b-a`, beside c. Go back with `end`.

---

> **ospfd:** Then ask me about myself on b: `show ip ospf`.

---

```
 Maximum multiple paths(ECMP) supported 256
 Administrative distance 110
 This router is an ABR, ABR type is: Alternative Cisco
 Number of external LSA 0. Checksum Sum 0x00000000
 Number of opaque AS LSA 0. Checksum Sum 0x00000000
 Number of areas attached to this router: 2
```

> **ospfd:** b has interfaces in area 0 and in area 1 now, `2` areas attached. That makes it an _area border router_, an ABR, and nobody typed a line to say so: it keeps one map per area and stands between them. Further down, the same output counts the LSAs of each area apart.

## Watch it

> **ospfd:** c's router-LSA lists c's links. Is it in a's database now?
>
> - yes, a holds the whole map again
> - [x] no, a holds a line from b for c's loopback instead
> - no, and a cannot reach c at all

> **ospfd:** Click a and type `vtysh -c "show ip ospf database"`.

---

```
                Router Link States (Area 0.0.0.1)

Link ID         ADV Router      Age  Seq#       CkSum  Link count
10.255.0.1     10.255.0.1        19 0x80000003 0x637a 3
10.255.0.2     10.255.0.2        20 0x80000003 0x6d88 2

                Summary Link States (Area 0.0.0.1)

Link ID         ADV Router      Age  Seq#       CkSum  Route
10.0.2.0       10.255.0.2        20 0x80000001 0xbe7f 10.0.2.0/30
10.255.0.2     10.255.0.2        20 0x80000001 0x6ed6 10.255.0.2/32
10.255.0.3     10.255.0.2        20 0x80000001 0xc871 10.255.0.3/32
```

> **ospfd:** Area 1 only: a's router-LSA, b's, and no c. c's loopback arrives as a _summary-LSA_ sent by b: one network from area 0 and its cost, no links. Now my routes: `vtysh -c "show ip ospf route"`.

---

```
N IA 10.255.0.3/32         [20] area: 0.0.0.1
                           via 10.0.1.2, a-b
```

> **ospfd:** `IA`, inter-area: a route made from a summary. The `[20]` is b's 10 to c plus a's 10 to b. zebra's table shows it as a plain `O`.

## Debrief

> **ospfd:** Both ends of a link must agree on the area. An ABR keeps a map per area and hands each the other's networks as summaries, so a router behind it never sees how the backbone is built. In The Same Map in IPv6, OSPF learns a second address family.

## Real world

On an FRR router at the border, with one interface in each area:

```
vtysh
configure terminal
 interface eth1
  no ip ospf area 0
  ip ospf area 1
end
show ip ospf
show ip ospf database
show ip ospf route
```

`show ip ospf` says `This router is an ABR` once the router has interfaces in area 0 and in another area.
