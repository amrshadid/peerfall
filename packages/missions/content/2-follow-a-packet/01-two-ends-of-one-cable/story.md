# Two Ends of One Cable

**Question:** What does a router need before it can send anything over a new cable?

## Scene

> **zebra:** Router a runs, and it survives a restart. But a router alone routes nothing: its whole job is passing packets on to other routers. So in this stage we follow packets from one router to the next, and we start with the smallest piece: a new cable between a and b. Both ends are up. Nothing crosses it.

## See it

> **zebra:** Ask Linux what a has on that cable: `ip -br addr`.

---

```
a:~# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
a-b@if2          UP             fe80::d47e:63ff:feb5:6a1a/64 
```

> **zebra:** `a-b` is `UP`, and it has no address like the `10.0.1.1` you saw in The Dark Cable. The long `fe80::` one is an IPv6 address Linux gives each interface on a cable by itself; IPv6 waits for later. Try to reach b anyway: `ping -c 2 10.0.1.2`.

---

```
a:~# ping -c 2 10.0.1.2
ping: connect: Network unreachable
```

> **zebra:** The Dark Cable's refusal: no route covers b's address, so Linux won't even send. Now ask me: type `vtysh`.

---

> **zebra:** At `a#`, type `show interface brief`.

---

```
a# show interface brief
Interface       Status  VRF             Addresses
---------       ------  ---             ---------
a-b             up      default         fe80::d47e:63ff:feb5:6a1a/64
lo              up      default         

```

> **zebra:** I see what Linux sees: `a-b` up, with only its `fe80::` address. Now `show ip route`, the routes I, zebra, hold for a.

---

```
a# show ip route
a# 
```

> **zebra:** Nothing at all, and `ip route` in Linux prints nothing either. With no address on `a-b`, a has no network on that cable, so there is no route into it. What the cable lacks is an _address_ at each end: a number that names one interface, for packets to be sent to and from. An address is 32 bits, written as four numbers.

## Build it

> **zebra:** An address is a setting of its interface, typed in that interface's mode. Type `configure terminal`.

---

> **zebra:** `interface a-b`.

---

> **zebra:** Give it its address: `ip address 10.0.1.1/30`.

---

> **zebra:** Back to `a#` with `end`.

---

> **zebra:** `show ip route` again.

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
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:00
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:00
```

> **zebra:** Two routes from one line. `C` is the _connected route_: all of a's network `10.0.1.0/30` is straight out of `a-b`. `L`, the local route, is a's own address. `>` and `*` wait for later in this stage. Leave vtysh with `exit`.

---

> **zebra:** Only a has its address. You ping b: `ping -c 3 10.0.1.2`. What happens?
>
> - `Network unreachable`, as before
> - [x] a tries, and nobody answers
> - b answers

---

```
a:~# ping -c 3 10.0.1.2
PING 10.0.1.2 (10.0.1.2) 56(84) bytes of data.
From 10.0.1.1 icmp_seq=1 Destination Host Unreachable
From 10.0.1.1 icmp_seq=2 Destination Host Unreachable
From 10.0.1.1 icmp_seq=3 Destination Host Unreachable

--- 10.0.1.2 ping statistics ---
3 packets transmitted, 0 received, +3 errors, 100% packet loss, time 2087ms
pipe 3
```

> **zebra:** With a route, a asks on the cable who owns `10.0.1.2`. Nobody does, so a itself reports `Destination Host Unreachable`. Click b in the topology: the terminal moves to b's shell, `b:~#`. Type `vtysh` there.

---

> **zebra:** `configure terminal`.

---

> **zebra:** `interface b-a`.

---

> **zebra:** `ip address 10.0.1.2/30`, in a's network.

---

> **zebra:** Both ends have their address now.

## Watch it

> **zebra:** Click a, and ping b again: `ping -c 3 10.0.1.2`.

---

```
a:~# ping -c 3 10.0.1.2
PING 10.0.1.2 (10.0.1.2) 56(84) bytes of data.
64 bytes from 10.0.1.2: icmp_seq=1 ttl=64 time=1.07 ms
64 bytes from 10.0.1.2: icmp_seq=2 ttl=64 time=0.446 ms
64 bytes from 10.0.1.2: icmp_seq=3 ttl=64 time=0.883 ms

--- 10.0.1.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2006ms
rtt min/avg/max/mdev = 0.446/0.800/1.073/0.262 ms
```

> **zebra:** Three answers. On the way, a learned b's _MAC address_, the one b's interface uses on the cable itself: `ip neigh` shows it.

---

```
a:~# ip neigh
10.0.1.2 dev a-b lladdr f2:c8:83:fc:92:be REACHABLE 
```

> **zebra:** `lladdr` is b's MAC address. a needs it before it can put a packet for b on the cable. Linux has its copy of the connected route too: `ip route`.

---

```
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1 
```

> **zebra:** `proto kernel`: Linux added it itself, as in The Dark Cable. `/30` is the _prefix length_: the first 30 bits name the network, so `10.0.1.0/30` holds `.0` to `.3`. The first names the network and the last reaches all of it at once, so `.1` and `.2` are left for the two ends.

## Debrief

> **zebra:** One address gives a router its network and a route into it. Both ends need one, in the same network. Typed in FRR, it is in the running configuration that `write memory` saves. a reaches b; what about a router one cable further? In One Hop Further.

## Real world

The same commands work on any FRR router, with your own interface name:

```
vtysh
show interface brief
configure terminal
 interface a-b
  ip address 10.0.1.1/30
end
show ip route
exit
ip route
ip neigh
ping -c 3 10.0.1.2
```

`ip addr add 10.0.1.1/30 dev a-b` in Linux gives the kernel the same address and route, but FRR's running configuration never shows it, so `write memory` cannot save it.
