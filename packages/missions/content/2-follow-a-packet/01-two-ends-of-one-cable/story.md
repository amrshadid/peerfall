# Two Ends of One Cable

**Question:** Why does a new cable carry nothing?

## Scene

**What was reported.** A cable was plugged in between router a and router b this morning. Both ends show the interface up. Nothing gets across: a cannot reach b, and b cannot reach a.

**What the network looks like.** Two routers and one link. On a the interface is called `a-b`, on b it is `b-a`.

**What is strange.** The link is fine. Neither interface has an IPv4 address yet, so neither router has anywhere to send a packet.

## Build it

**Your job.** Give each end its address, in FRR: `10.0.1.1/30` on a and `10.0.1.2/30` on b. Then watch what each router's routing table gains, in FRR and in Linux, and reach b from a.

Have your work checked whenever you like. Nothing is timed.

## Debrief

**Up, and still unreachable.** An interface that is up can carry packets. It does not say where to send them. Before you gave a its address, a's kernel routing table was empty, and Linux refused even to try:

```
ping: connect: Network unreachable
```

**What one address gives a router.** `10.0.1.1/30` says two things. `10.0.1.1` is this router's own address on the link. `/30` says the first 30 bits name the network, so the link is the network `10.0.1.0/30`: four addresses, of which `10.0.1.1` and `10.0.1.2` can be given to routers.

From that one line zebra made two routes. `show ip route` lists them:

```
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:07
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:07
```

`C` is a **connected** route: everything in `10.0.1.0/30` is reached by sending it straight out of `a-b`, with no router in between. `L` is the router's own address. `>` marks the route FRR chose and `*` says it is in the kernel.

**From Zebra into Linux.** FRR does not forward packets. The Linux kernel does, from its own routing table. Zebra is the daemon that talks to the kernel: it handed Linux the address, and Linux added the route for the address's network itself. `ip route` shows the kernel's table:

```
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1
```

`dev a-b` is the way out, and `proto kernel` says the kernel put the route there. The two tables agree, and that is the thing to check whenever a packet does not go where FRR says it should.

**Why one end is not enough.** With only a addressed, a had its route and sent its packets out of `a-b`. Nobody at the other end owned `10.0.1.2`, so nobody answered:

```
From 10.0.1.1 icmp_seq=1 Destination Host Unreachable
```

Each router knows only its own end of the cable. Both ends need an address, and both addresses have to be in the same network.

**Why in FRR.** `ip addr add 10.0.1.1/30 dev a-b` in Linux gives the kernel the same address and the same route, and packets flow just the same. But the address is then missing from FRR's configuration, so `write memory` cannot save it. Configure the address in FRR and it is part of the router's configuration like everything else.

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
ping -c 3 10.0.1.2
```
