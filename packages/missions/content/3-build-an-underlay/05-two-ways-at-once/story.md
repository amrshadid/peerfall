# Two Ways at Once

**Question:** Both of a's paths to d cost 20. Why does a use only one?

## Scene

> **ospfd:** The square from The Cheaper Way, every interface back at its default cost of 10. From a to d's loopback, through b adds up to 20, and through c, 20 as well. A tie. In The Backup Path, zebra used two static routes that tied, both at once. Here every packet from a to d goes through b, and the link to c carries none of them. Find out who chose that.

## See it

> **ospfd:** Start with what I worked out. On a, open `vtysh`.

---

> **ospfd:** Then `show ip ospf route`.

---

```
============ OSPF network routing table ============
N    10.0.1.0/30           [10] area: 0.0.0.0
                           directly attached to a-b
N    10.0.2.0/30           [10] area: 0.0.0.0
                           directly attached to a-c
N    10.0.3.0/30           [20] area: 0.0.0.0
                           via 10.0.1.2, a-b
N    10.0.4.0/30           [20] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.255.0.1/32         [0] area: 0.0.0.0
                           directly attached to lo
N    10.255.0.2/32         [10] area: 0.0.0.0
                           via 10.0.1.2, a-b
N    10.255.0.3/32         [10] area: 0.0.0.0
                           via 10.0.2.2, a-c
N    10.255.0.4/32         [20] area: 0.0.0.0
                           via 10.0.1.2, a-b
                           via 10.0.2.2, a-c
```

> **ospfd:** My own table, as in The Cheaper Way, before zebra sees any of it: each network, its cost in brackets, and the way out. For d's loopback, `10.255.0.4/32`, two lines: through b and through c, each 10 to the neighbour plus 10 on to d. Neither is shorter, so my shortest path first kept both.

> **zebra:** Now mine: `show ip route 10.255.0.4`.

---

```
Routing entry for 10.255.0.4/32
  Known via "ospf", distance 110, metric 20, best
  Last update 00:00:23 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.1.2, via a-b, weight 1
```

> **zebra:** One next hop, through b, and `Status: Installed`: that one alone is in the kernel's table. ospfd found two and handed me one, so the limit sits between us. Look at what a runs now: `show running-config`.

---

```
router ospf
 ospf router-id 10.255.0.1
 log-adjacency-changes detail
 maximum-paths 1
exit
```

> **ospfd:** `maximum-paths 1`, under `router ospf`, the block of my own settings. It is the most equal paths I hand zebra for one network. With 1, I hand over the first and keep the others to myself.

## Build it

> **ospfd:** Lift the limit. Type `configure terminal`.

---

> **ospfd:** Then `router ospf`. The prompt becomes `a(config-router)#`: the mode for my settings.

---

> **ospfd:** Ask what the limit can be: type `maximum-paths ?` with no Enter, then Continue.

---

```
a(config-router)# maximum-paths 
  (1-256)  Number of paths
a(config-router)# maximum-paths 
```

> **ospfd:** `?` lists what can come next, as in The Router's Language: any number from 1 to 256. 256 is also what I use when no line says otherwise. Erase the line. `no` before a setting removes it, and the default comes back: `no maximum-paths 1`.

---

> **zebra:** Go back with `end`.

---

> **zebra:** Then ask me again: `show ip route 10.255.0.4`.

---

```
Routing entry for 10.255.0.4/32
  Known via "ospf", distance 110, metric 20, best
  Last update 00:00:04 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.1.2, via a-b, weight 1
  * 10.0.2.2, via a-c, weight 1
```

> **zebra:** Two next hops, both installed: equal-cost multipath, ECMP, as in The Backup Path, from OSPF this time. Read `Last update 00:00:04 ago`. A new limit made ospfd take back every route it had handed me and work them all out again, so each of its routes is a few seconds old now.

## Watch it

> **zebra:** Leave vtysh with `exit`.

---

> **zebra:** Read the kernel's route: `ip route show 10.255.0.4`.

---

```
10.255.0.4 nhid 25 proto ospf metric 20 
	nexthop via 10.0.1.2 dev a-b weight 1 
	nexthop via 10.0.2.2 dev a-c weight 1 
```

> **zebra:** One route, two `nexthop via` lines. You trace the way to d twice. Which way do the packets go?
>
> - through b the first time, through c the second
> - [x] the same way both times
> - half of each trace through b, half through c

> **zebra:** Type `traceroute -n 10.255.0.4`.

---

```
traceroute to 10.255.0.4 (10.255.0.4), 30 hops max, 46 byte packets
 1  10.0.2.2  0.000 ms  0.050 ms  0.000 ms
 2  10.255.0.4  0.094 ms  0.033 ms  0.032 ms
```

> **zebra:** Line 1 is the first router on the way: c's `10.0.2.2` here, or b's `10.0.1.2`. Once more, the same line.

---

```
traceroute to 10.255.0.4 (10.255.0.4), 30 hops max, 46 byte packets
 1  10.0.2.2  0.100 ms  0.063 ms  0.083 ms
 2  10.255.0.4  0.039 ms  0.050 ms  0.045 ms
```

> **zebra:** The same way as the first. Linux picks the next hop from the source and destination addresses together, so one pair of addresses always takes one path, and another pair may take the other. Many pairs share both links.

## Debrief

> **ospfd:** I find every equal path, `maximum-paths` says how many I hand zebra, and zebra puts them in the kernel as one route. Every route so far started inside OSPF. In Bring It In, one comes from outside.

## Real world

On any FRR router running `ospfd` with two equal paths to one network:

```
vtysh
show ip ospf route
show ip route 10.255.0.4
configure terminal
 router ospf
  maximum-paths 4
end
show ip route 10.255.0.4
exit
ip route show 10.255.0.4
```

`show ip ospf` prints the limit in use as `Maximum multiple paths(ECMP) supported`.
