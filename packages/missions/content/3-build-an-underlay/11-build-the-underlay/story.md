# Build the Underlay

**Question:** Four routers, FRR running, nothing configured. Can you build the map alone?

## Scene

> **ospfd:** Four routers in a square: a, b, c and d. FRR runs on each, started by its init script, and nothing is configured. The links and loopbacks have their addresses. Make every router learn every loopback from OSPF, with a using both of its ways to d, and make it last. Routes like these make an _underlay_: what every later protocol rides on.
>
> **watchfrr:** And when a router restarts, I start its daemons from `frr.conf`. Nothing else.

## See it

> **ospfd:** This time I only say where to look. Start on a, with the addresses: `ip -br addr`.

---

```
lo               UNKNOWN        127.0.0.1/8 10.255.0.1/32 ::1/128 
a-b@if2          UP             10.0.1.1/30 fe80::fcae:1ff:fe75:3266/64 
a-c@if2          UP             10.0.2.1/30 fe80::9c92:a5ff:fe57:1bf9/64 
```

> **ospfd:** Every address the plan needs, from Linux. Now ask me for a's peers.

---

```
% OSPF is not enabled in vrf default
```

> **ospfd:** I run, and have nothing to do: there is no `router ospf` on a, the block you entered in Two Ways at Once. Without it, an interface's area means nothing to me.

> **ospfd:** Count what the plan needs before you type. On each router: `router ospf`. Each link's interface in area 0, both ends, as in Say Hello. Each loopback in area 0 too, or no other router hears of it, and passive, as in The Shared Map. Leave every cost alone: d is two links from a either way, and equal costs share the load, as in Two Ways at Once. Then save each router, as in Gone After the Restart.

> **ospfd:** One more thing. These links are not set point-to-point, as the earlier ones were. On them, a new peer can wait in `2-Way` for up to 40 seconds, the `Wait` timer `show ip ospf interface` prints, before it goes on to `Full`.

## Build it

> **ospfd:** Configure all four routers, in any order, then save each one. Peers start to form as soon as both ends of a link are in.

---

> **ospfd:** Once every router has its lines, wait a minute, then ask for a's peers.

---

```
Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.255.0.2        1 Full/DR         12.633s           32.337s 10.0.1.2        a-b:10.0.1.1                         0     0     0
10.255.0.3        1 Full/DR         10.758s           33.220s 10.0.2.2        a-c:10.0.2.1                         0     0     0
```

> **ospfd:** When a's peers look like this, b and c `Full`, the routes follow. `DR` is a role I elect on links that could hold more than two routers; it changes nothing here. Check what a saved: `cat /etc/frr/a/frr.conf`.

---

```
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
interface a-b
 ip ospf area 0
exit
!
interface a-c
 ip ospf area 0
exit
!
interface lo
 ip ospf area 0
 ip ospf passive
exit
!
router ospf
exit
!
```

> **ospfd:** No router id typed, and none needed: I took a's loopback address. Once saved, b, c and d hold the same lines with their own interface names, and a restart brings every one of them back.

## Watch it

> **ospfd:** a's route to d's loopback: how many next hops will it have?
>
> - one, the first path found
> - [x] two, through b and through c
> - four, one per router

> **ospfd:** Ask the kernel: `ip route`.

---

```
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1 
10.0.2.0/30 dev a-c proto kernel scope link src 10.0.2.1 
10.0.3.0/30 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 
10.0.4.0/30 nhid 18 via 10.0.2.2 dev a-c proto ospf metric 20 
10.255.0.2 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 
10.255.0.3 nhid 18 via 10.0.2.2 dev a-c proto ospf metric 20 
10.255.0.4 nhid 24 proto ospf metric 20 
	nexthop via 10.0.1.2 dev a-b weight 1 
	nexthop via 10.0.2.2 dev a-c weight 1 
```

> **ospfd:** Two, cost 20 each way: 10 per link, as in The Cheaper Way. Nobody wrote a route: four routers worked them all out from one shared map. Ping d: `ping -c 3 10.255.0.4`.

---

```
PING 10.255.0.4 (10.255.0.4) 56(84) bytes of data.
64 bytes from 10.255.0.4: icmp_seq=1 ttl=63 time=0.576 ms
64 bytes from 10.255.0.4: icmp_seq=2 ttl=63 time=1.30 ms
64 bytes from 10.255.0.4: icmp_seq=3 ttl=63 time=0.650 ms

--- 10.255.0.4 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2009ms
rtt min/avg/max/mdev = 0.576/0.842/1.300/0.325 ms
```

> **ospfd:** One router on the way, whichever path the packet took, and the replies came home on routes d worked out the same way. Break a link now and I'd find the other path by myself.

## Debrief

> **ospfd:** Four routers, every route worked out by the routers themselves, both paths in use, all saved. That is stage 3. Stage 4 breaks a link between routers like these, and counts how long I take to notice: The Link That Never Went Down.

## Real world

On each FRR router of your own, with its own interface names:

```
vtysh
configure terminal
 router ospf
 exit
 interface eth0
  ip ospf area 0
 exit
 interface lo
  ip ospf area 0
  ip ospf passive
end
write memory
show ip ospf neighbor
```

Without `ospf router-id` under `router ospf`, ospfd takes the router id zebra chooses: the highest loopback address when there is one. Setting it keeps the id from changing when addresses do.
