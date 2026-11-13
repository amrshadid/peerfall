# Written but Not Used

**Question:** The route is in the configuration. Why doesn't a use it?

## Scene

The same three routers in a line: a, b, c. Overnight someone worked on a, and left a note: route to c written, done.

> **zebra:** It's in a's configuration, I'm told, and c has its way back. And still a can't reach c. A route that is written and not used. You know how to read a route now; this time, follow one from where it is written to where packets use it, and find where it stops.

## See it

> **zebra:** See for yourself. On a, type `ping -c 2 10.0.2.2`.

---

```
a:~# ping -c 2 10.0.2.2
ping: connect: Network unreachable
```

> **zebra:** Linux has no route for c's address. Now the configuration: open `vtysh`.

---

> **zebra:** Then `show running-config`.

---

```
a# show running-config
Building configuration...

Current configuration:
!
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
ip route 10.0.2.0/30 10.0.2.1
!
end
```

> **zebra:** There it is, `ip route 10.0.2.0/30 10.0.2.1`: a static route to c's network, held by staticd. Next, my table. Before you type `show ip route`: will it list this route?
>
> - yes, marked as not working
> - [x] no, it isn't there at all
> - yes, like any other route

---

```
a# show ip route
Codes: K - kernel route, C - connected, L - local, S - static,
       R - RIP, O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric, t - Table-Direct,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

IPv4 unicast VRF default:
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:22
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:22
```

> **zebra:** No `S` line. Ask for that network by name: `show ip route 10.0.2.0/30`.

---

```
a# show ip route 10.0.2.0/30
% Network not in table
```

> **zebra:** I never received it. And the kernel? Type `exit`.

---

> **zebra:** Then `ip route`.

---

```
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1
```

> **zebra:** Only the connected route. A written route passes through three places on its way to being used. The running configuration holds what you told FRR. My table holds every route I know, from every source, and from it I pick what to use. The kernel's table holds what Linux forwards packets with, and only what I put there. This route reached the first place and stopped.

## Build it

> **zebra:** staticd offers me a route only once I tell it the route's next hop can be reached. Ask me which next hops I'm tracking: open `vtysh`.

---

> **zebra:** Then `show ip nht`, for next-hop tracking.

---

```
a# show ip nht
VRF default:
 Resolve via default: on
10.0.2.1
 unresolved
 Client list: static(fd 32)
```

> **zebra:** The first two lines name my table and one of its settings; read the lines below them. `10.0.2.1` is `unresolved`: no route of mine covers it. It is b's address, but on b's far cable, towards c. A next hop must be reachable through a route a already has, and b's near address, `10.0.1.2`, is in a's connected network. Replace the route. Type `configure terminal`.

---

> **zebra:** Then `no ip route 10.0.2.0/30 10.0.2.1`: `no` in front of a line removes it.

---

> **zebra:** Now `ip route 10.0.2.0/30 10.0.1.2`.

---

> **zebra:** Type `end`.

---

> **zebra:** And `show ip nht` again.

---

```
a# show ip nht
VRF default:
 Resolve via default: on
10.0.1.2
 resolved via connected, prefix 10.0.1.0/30
 is directly connected, a-b (vrf default), weight 1
 Client list: static(fd 32)
```

> **zebra:** `resolved via connected`: b's near address is inside `10.0.1.0/30`, out of `a-b`.

## Watch it

> **zebra:** Follow the route again. `show ip route`.

---

```
a# show ip route
Codes: K - kernel route, C - connected, L - local, S - static,
       R - RIP, O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric, t - Table-Direct,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

IPv4 unicast VRF default:
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:28
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:28
S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:02
```

> **zebra:** In my table now: the RIB, Routing Information Base. `>` says I selected this route for its network. `*` says it is in the kernel's table: the FIB, Forwarding Information Base. Type `exit`.

---

> **zebra:** Then `ip route`.

---

```
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1
10.0.2.0/30 nhid 6 via 10.0.1.2 dev a-b proto static metric 20
```

> **zebra:** There, `proto static`. The route went through all three places in one go: the moment its next hop resolved, I told staticd, staticd offered me the route, I selected it and installed it in the kernel. Now `ping -c 2 10.0.2.2`.

---

```
a:~# ping -c 2 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.
64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=1.45 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=63 time=0.701 ms

--- 10.0.2.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1002ms
rtt min/avg/max/mdev = 0.701/1.074/1.447/0.373 ms
```

> **zebra:** Two answers, each with `ttl=63`: one router on the way, b, as the route says. The note was right that the route was written. It never said whether anything used it.

## Debrief

> **zebra:** The configuration, my table, the kernel's table: a route can stop at any of them, and its next hop decides the first step. What if two routes for one network both get through? In The Backup Path.

## Real world

On any Linux router running FRR, with your own addresses:

```
vtysh
show running-config
show ip route
show ip nht
configure terminal
 no ip route 10.0.2.0/30 10.0.2.1
 ip route 10.0.2.0/30 10.0.1.2
end
show ip route 10.0.2.0/30
exit
ip route
```
