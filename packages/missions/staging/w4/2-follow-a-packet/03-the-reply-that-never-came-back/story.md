# The Reply That Never Came Back

**Question:** a's packets reach c. Why does nothing come back?

## Scene

The same three routers in a line: a, then b, then c. a has its static route to c's network, like the one you wrote in One Hop Further.

> **zebra:** And still a can't reach c. This time I don't get it either: a's route is in my table and in the kernel's, and b is plugged into c's network. Let's follow the packets and see how far they get.

## See it

> **zebra:** On a, type `ping -c 3 10.0.2.2`.

---

```
a:~# ping -c 3 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2084ms
```

> **zebra:** No `Network unreachable` this time. a has a route, so Linux sent all three packets: `3 packets transmitted`. None was answered: `0 received`. `Network unreachable` came from a's own Linux, before anything left. Silence means the packets left, and somewhere on the path either they or their answers were lost. So where did they stop?
>
> - at a, which never sent them
> - at b, which had nowhere to pass them
> - [x] at c, which never answered

> **zebra:** Ask c. Click c in the topology and type `nstat -az IcmpInEchos IcmpOutEchoReps`. It prints two of c's packet counters.

---

```
c:~# nstat -az IcmpInEchos IcmpOutEchoReps
#kernel
IcmpInEchos                     3                  0.0
IcmpOutEchoReps                 0                  0.0
```

> **zebra:** The middle column is each count; the last is a rate you can leave aside. A ping sends echo requests and waits for echo replies. `IcmpInEchos` counts the requests that reached c since the network started, yours and any others. `IcmpOutEchoReps` counts the replies c sent: `0`. The packets got all the way to c, and c never answered.

## Build it

> **zebra:** A reply is a packet of its own, sent by c to the address the request came from, a's `10.0.1.1`. Before c can send it, Linux on c needs a route that covers that address. Ask: `ip route get 10.0.1.1`.

---

```
c:~# ip route get 10.0.1.1
RTNETLINK answers: Network unreachable
```

> **zebra:** The refusal you saw on a in One Hop Further, only now on c, where a couldn't see it: no error travels back, and a just waits for replies that never come. c has its connected route, `10.0.2.0/30`, and nothing else. Give c the way back. Open `vtysh`, type `configure terminal`, then `ip route 10.0.1.0/30 10.0.2.1`, whose next hop is b's address on c's own cable. Then `end`, and `show ip route`.

---

```
c# show ip route
Codes: K - kernel route, C - connected, L - local, S - static,
       R - RIP, O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric, t - Table-Direct,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

IPv4 unicast VRF default:
S>* 10.0.1.0/30 [1/0] via 10.0.2.1, c-b, weight 1, 00:00:02
C>* 10.0.2.0/30 is directly connected, c-b, weight 1, 00:00:47
L>* 10.0.2.2/32 is directly connected, c-b, weight 1, 00:00:47
```

> **zebra:** `S>*`: c's way back to a's network, through b.

## Watch it

> **zebra:** Click a, and ping c again: `ping -c 3 10.0.2.2`.

---

```
a:~# ping -c 3 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.
64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=0.896 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=63 time=0.573 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=63 time=1.27 ms

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2003ms
rtt min/avg/max/mdev = 0.573/0.914/1.274/0.286 ms
```

> **zebra:** Every reply came back, with `ttl=63`. TTL, time to live, is a hop count every packet carries. c starts its reply at 64, and each router that passes a packet on lowers it by one, so b made it 63. A router that would lower it to 0 drops the packet instead and tells the sender, so a packet caught between routers can't circle for ever. `traceroute -n 10.0.2.2` uses exactly that.

---

```
a:~# traceroute -n 10.0.2.2
traceroute to 10.0.2.2 (10.0.2.2), 30 hops max, 46 byte packets
 1  10.0.1.2  0.080 ms  0.052 ms  0.052 ms
 2  10.0.2.2  0.051 ms  0.050 ms  0.063 ms
```

> **zebra:** Its first packets carry a TTL of 1, so b drops them and tells a: line 1. Then a TTL of 2, which reaches c.

## Debrief

> **zebra:** Reaching an address takes a route at every router on the way there, and at every router on the way back. A missing route on the way back shows only as silence. Sometimes a route is written and still not used. In Written but Not Used.

## Real world

On any two Linux routers running FRR, one cable apart through a third, with your own addresses. On the far router:

```
nstat -az IcmpInEchos IcmpOutEchoReps
ip route get 10.0.1.1
vtysh
configure terminal
 ip route 10.0.1.0/30 10.0.2.1
end
show ip route
```

Then, on the near one, `ping -c 3 10.0.2.2` and `traceroute -n 10.0.2.2`.
