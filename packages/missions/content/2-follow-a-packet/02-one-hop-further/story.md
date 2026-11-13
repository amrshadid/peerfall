# One Hop Further

**Question:** How does a router send to a network it has no cable into?

## Scene

Three routers now, in a line: a, then b, then c. Every interface has its address, and every cable is up.

> **zebra:** a reaches b. b reaches c. And a can't reach c. Nothing is broken this time: a is missing something nobody has given it yet. c already has its way back to a; someone wrote that for you. Find what a lacks.

## See it

> **zebra:** Start where the packets start. On a, type `ping -c 2 10.0.2.2`, c's address.

---

```
a:~# ping -c 2 10.0.2.2
ping: connect: Network unreachable
```

> **zebra:** You met this in stage 1: Linux refused even to send. Ask it which way it would send to c: `ip route get 10.0.2.2`.

---

```
a:~# ip route get 10.0.2.2
RTNETLINK answers: Network unreachable
```

> **zebra:** `ip route get` looks one address up in the kernel's routing table, as Linux does for every packet. No route covers `10.0.2.2`. a has the connected route of its own cable, `10.0.1.0/30`, and nothing else. Now look from the middle: click b in the topology, and type `vtysh -c "show ip route"`.

---

```
b:~# vtysh -c "show ip route"
Codes: K - kernel route, C - connected, L - local, S - static,
       R - RIP, O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric, t - Table-Direct,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

IPv4 unicast VRF default:
C>* 10.0.1.0/30 is directly connected, b-a, weight 1, 00:00:48
L>* 10.0.1.2/32 is directly connected, b-a, weight 1, 00:00:48
C>* 10.0.2.0/30 is directly connected, b-c, weight 1, 00:00:48
L>* 10.0.2.1/32 is directly connected, b-c, weight 1, 00:00:48
```

> **zebra:** `vtysh -c` runs one vtysh command straight from the shell, and you stay at the shell. b has two cables, so it has two addresses and two connected routes, the `C` lines: `10.0.1.0/30` out of `b-a` towards a, and `10.0.2.0/30` out of `b-c` towards c. b is plugged into c's network. a is not, but a shares a cable with b, and anything a hands to b, b can pass on to c.

## Build it

> **zebra:** A route you write yourself is a _static route_. It names a network and a _next hop_: the address of a neighbour closer to that network. Here that is b's `10.0.1.2`, on a's own cable. Click a, open `vtysh`, type `configure terminal`, then `ip route 10.0.2.0/30 10.0.1.2`, then `end`.

---

> **staticd:** That one's mine to keep. I'm staticd, the daemon that holds the routes written by hand. Once zebra tells me it can reach the next hop, I offer zebra the route.
>
> **zebra:** And I put it in my table. Type `show ip route`.

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
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:01:24
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:01:24
S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:02
```

> **zebra:** `S` is static. `via 10.0.1.2` is the next hop, and `a-b` the interface I found for it, because b's address is in a's connected network. Type `exit`, then `ip route`.

---

```
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1
10.0.2.0/30 nhid 6 via 10.0.1.2 dev a-b proto static metric 20
```

> **zebra:** The same route, now in the kernel's table, marked `proto static`. I put it there.

## Watch it

> **zebra:** Before you try: you ping c now. What happens?
>
> - no answer: b drops the packets
> - [x] c answers, three times
> - only the first packet is answered

---

```
a:~# ping -c 3 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.
64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=1.85 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=63 time=0.650 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=63 time=0.622 ms

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2005ms
rtt min/avg/max/mdev = 0.622/1.041/1.852/0.573 ms
```

> **zebra:** Three answers. b passed each packet on, using its own connected route to c. Look at `ttl=63`: when b answered you in Two Ends of One Cable, it said `ttl=64`. One router on the way made that difference, and the next mission says how. Now list the routers on the way: `traceroute -n 10.0.2.2`.

---

```
a:~# traceroute -n 10.0.2.2
traceroute to 10.0.2.2 (10.0.2.2), 30 hops max, 46 byte packets
 1  10.0.1.2  0.114 ms  0.088 ms  0.073 ms
 2  10.0.2.2  0.077 ms  0.080 ms  0.063 ms
```

> **zebra:** Line 1 is b, line 2 is c. a knew only the first step, and b took care of the second.

## Debrief

> **zebra:** A static route names a network and the neighbour to hand its packets to. a never needs to know what lies past b. But c had a route back that someone wrote for you. In The Reply That Never Came Back, it doesn't.

## Real world

On any Linux router running FRR, with your own addresses. FRR's init script always starts staticd:

```
vtysh
configure terminal
 ip route 10.0.2.0/30 10.0.1.2
end
show ip route
show ip route 10.0.2.2
exit
ip route
ip route get 10.0.2.2
traceroute -n 10.0.2.2
```
