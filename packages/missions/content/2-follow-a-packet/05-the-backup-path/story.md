# The Backup Path

**Question:** a has two ways to c. How does it choose, and how do you keep the other one ready?

## Scene

> **zebra:** A new network: three routers in a triangle. a reaches c the long way, through b, while a cable runs straight from a to c. What a wants is c's loopback address, `10.255.0.3`: on c's own interface with no cable, so it answers whichever cable a packet comes in by. Send that traffic straight, and keep the long way ready in case the direct cable fails.

## See it

> **zebra:** Start with what a has now. Open `vtysh`.

---

> **zebra:** Then `show ip route`.

---

```
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:50
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:50
C>* 10.0.2.0/30 is directly connected, a-c, weight 1, 00:00:50
L>* 10.0.2.1/32 is directly connected, a-c, weight 1, 00:00:50
S>* 10.255.0.3/32 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:13
```

> **zebra:** One static route to c's loopback, through b's address `10.0.1.2`, marked `>*`: I selected it, and it is in the kernel's table. Now the brackets. The first number, `1`, is the route's _administrative distance_. For one network, I select the route with the lowest distance. A static route gets 1 unless you write another. The second number, the metric, compares routes of one protocol and waits for stage 3.

> **zebra:** I can say the same in words. Ask about that one address: `show ip route 10.255.0.3`.

---

```
Routing entry for 10.255.0.3/32
  Known via "static", distance 1, metric 0, best
  Last update 00:00:13 ago
  Flags: Recursion Selected RR Distance 
  Status: Installed 
  * 10.0.1.2, via a-b, weight 1
```

> **zebra:** `best` is my choice, and `Status: Installed` means the route is in the kernel's table. Keep this command in mind: it also lists the routes I know and did not choose.

> **zebra:** Now follow a packet. Type `exit` to go back to the shell.

---

> **zebra:** Then `traceroute -n 10.255.0.3`.

---

```
traceroute to 10.255.0.3 (10.255.0.3), 30 hops max, 46 byte packets
 1  10.0.1.2  0.128 ms  0.202 ms  0.690 ms
 2  10.255.0.3  0.083 ms  0.197 ms  0.231 ms
```

> **zebra:** Two hops: b first, then c. The cable `a-c` is up and carries none of it, because no route sends anything for `10.255.0.3` that way.

## Build it

> **zebra:** Add the direct route, through c's address on that cable. Open `vtysh`.

---

> **zebra:** Then `configure terminal`.

---

> **zebra:** Now `ip route 10.255.0.3/32 10.0.2.2`.

---

> **zebra:** Look with `do show ip route`.

---

```
S>* 10.255.0.3/32 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:02
  *                     via 10.0.2.2, a-c, weight 1, 00:00:02
```

> **zebra:** Two next hops, both distance 1, both in the kernel's table. A tie: I install one route with two next hops, and Linux may send a packet out of either. That is _equal-cost multipath_, ECMP. In the shell, `ip route` shows it as one route with two `nexthop via` lines.

> **zebra:** Shared is not what you want. Write the route through b again, with a distance after it: `ip route 10.255.0.3/32 10.0.1.2 10`.

---

> **zebra:** And look again: `do show ip route`.

---

```
S   10.255.0.3/32 [10/0] via 10.0.1.2, a-b, weight 1, 00:00:02
S>* 10.255.0.3/32 [1/0] via 10.0.2.2, a-c, weight 1, 00:00:02
```

> **zebra:** The new distance replaced the old line. The route through b is still in my table, without `>*`: known, not selected, not in the kernel. A backup like this is a _floating static route_.

## Watch it

> **zebra:** Now the test. You are about to shut the direct cable. What happens to a's way to c?
>
> - c is unreachable until someone changes the routes
> - [x] the route through b takes over by itself
> - both routes go

> **zebra:** Type `interface a-c`.

---

> **zebra:** Then `shutdown`.

---

> **zebra:** And `do show ip route`.

---

```
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:01:07
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:01:07
S>* 10.255.0.3/32 [10/0] via 10.0.1.2, a-b, weight 1, 00:00:08
```

> **zebra:** With `a-c` down, its connected route left my table, and the direct route's next hop could no longer be reached. The backup was the best route left, so I selected it and put it in the kernel. a still reaches c, through b, and nobody touched a route. Type `no shutdown`.

---

> **zebra:** And `do show ip route`.

---

```
S>* 10.255.0.3/32 [1/0] via 10.0.2.2, a-c, weight 1, 00:00:03
S   10.255.0.3/32 [10/0] via 10.0.1.2, a-b, weight 1, 00:00:15
```

> **zebra:** The direct route is back and selected, and the backup waits under it.

## Debrief

> **zebra:** The lowest distance wins, a tie shares the traffic, and a higher distance waits as a backup until the better route leaves my table. Time to build a line of routers alone: Bring the Line Up.

## Real world

The same commands work on any FRR router that runs `staticd`:

```
vtysh
show ip route
configure terminal
 ip route 10.255.0.3/32 10.0.2.2
 ip route 10.255.0.3/32 10.0.1.2 10
end
show ip route 10.255.0.3
```

`show ip route 10.255.0.3` names each route's distance in words, and `Status: Installed` for the one in the kernel.
