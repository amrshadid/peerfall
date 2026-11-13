# The Reply That Never Came Back

**Question:** Why can a reach b, and b reach c, but a not reach c?

## Scene

**What was reported.** Router a cannot reach router c. Each of them reaches router b, which sits between them, without trouble.

**What the network looks like.** Three routers in a line: a, then b, then c. The link between a and b is the network `10.0.1.0/30`. The link between b and c is `10.0.2.0/30`. Every interface is up and has its address.

**What is strange.** Nothing is broken, and no cable is missing. A packet from a to c only has to pass through b.

## Build it

**Your job.** Make a reach c's address, `10.0.2.2`. Find out what a is missing, fix it, and then find out why that alone is not enough.

You can send a probe from a to c at any time, and have your work checked whenever you like. Nothing is timed.

## Debrief

**A router knows only its own cables.** Each router starts with one route per network it is plugged into, the connected routes. a is plugged into `10.0.1.0/30` and nothing else, so its table had no line that covers `10.0.2.2`, and Linux refused to send:

```
ping: connect: Network unreachable
```

b is plugged into both networks, so b already had a route to each. Among its routes:

```
C>* 10.0.1.0/30 is directly connected, b-a, weight 1, 00:00:37
C>* 10.0.2.0/30 is directly connected, b-c, weight 1, 00:00:37
```

That is why a and c could each reach b from the start.

**A static route and its next hop.** A **static route** is a route you write yourself. `ip route 10.0.2.0/30 10.0.1.2` says: packets for the network `10.0.2.0/30` are handed to `10.0.1.2`. That address is the **next hop**, the neighbor that takes the packet one step further. It has to be an address the router can already reach, and a reaches `10.0.1.2` over its connected route, so FRR also knows which interface to use:

```
S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:04
```

`S` is static. Zebra then put the route into the kernel, where `ip route` shows it with `proto static`:

```
10.0.2.0/30 nhid 6 via 10.0.1.2 dev a-b proto static metric 20
```

a does not need to know anything beyond b. It hands the packet to b, and b forwards it out of its own connected route.

**Why the reply needs a route too.** With a's route in place the packets left a, crossed b and arrived at c. Still nothing came back:

```
3 packets transmitted, 0 received, 100% packet loss, time 2043ms
```

A reply is a packet of its own, addressed to a at `10.0.1.1`. c is plugged into `10.0.2.0/30` only, and had no route that covers `10.0.1.1`, so c had nowhere to send it. From a the two failures look alike, but they are different: the first time a had no route and nothing was sent, the second time the packets arrived and the replies were never sent.

Once c had `ip route 10.0.1.0/30 10.0.2.1`, with b as its next hop, the replies came back:

```
64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=1.77 ms
```

`ttl=63` instead of 64 shows the reply passed through one router, b, on its way.

Reaching an address always takes a route at every router on the way there, and a route at every router on the way back.

## Real world

The same commands work on any FRR router that runs `staticd`:

```
vtysh
show ip route
configure terminal
 ip route 10.0.2.0/30 10.0.1.2
end
show ip route 10.0.2.2
exit
ip route
ping -c 3 10.0.2.2
```
