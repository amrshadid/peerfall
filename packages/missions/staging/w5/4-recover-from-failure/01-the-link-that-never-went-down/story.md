# The Link That Never Went Down

**Question:** Why did traffic stop for half a minute on a link that never went down?

## Scene

> **zebra:** Welcome to stage 4, Recover from failure. These three routers run OSPF, a routing protocol: nobody writes their routes, each router learns them from the others. Last night the cable between a and c stopped carrying packets. Both its ends stayed up, and a lost c for half a minute.
>
> **bfdd:** I'm bfdd, the guide of this stage. Noticing a silent neighbour fast is my only job. Break that cable yourself, then make the network notice in under two seconds.

## See it

> **bfdd:** First, who OSPF talks to. In a's vtysh, type `show ip ospf neighbor`.

---

```
Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.255.0.2        1 Full/-          17.315s           32.607s 10.0.1.2        a-b:10.0.1.1                         0     0     0
10.255.0.3        1 Full/-          16.680s           33.227s 10.0.2.2        a-c:10.0.2.1                         0     0     0
```

> **bfdd:** ospfd, FRR's OSPF daemon, talks to the neighbour at the end of each cable: b and c, named by their loopback addresses, which OSPF uses as each router's name. A router that a protocol talks to is a _peer_, and the Peerfall is named after them. `Full` means a and that peer have swapped everything they know of the network: in OSPF's word, an _adjacency_. From what it learned, each router works out its own routes.

> **bfdd:** To stay peers, each end sends a _hello_, a small OSPF packet, every 10 seconds. `Dead Time` counts down from 40 seconds and starts again at every hello: that is OSPF's _dead timer_. When it reaches zero, the peer is dropped. Now the route to c's loopback: `show ip route 10.255.0.3`.

---

```
Routing entry for 10.255.0.3/32
  Known via "ospf", distance 110, metric 10, best
  Last update 00:00:07 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.2.2, via a-c, weight 1
```

> **bfdd:** An OSPF route, distance 110, straight over `a-c`. If c is dropped on that cable, OSPF's next best way goes through b.

## Build it

> **bfdd:** First, the failure. Press **Send probe**: a sends packets to c's loopback again and again, replies on the timeline. Then press **Break the link**: the cable between a and c drops every packet, both ways, while both interfaces stay up.

---

> **bfdd:** The timeline shows replies back through b only once OSPF's dead timer ran out: 30 to 39 seconds of loss in three runs on the Machine, depending on when the last hello arrived. Turn me on: in `a-c`'s interface mode, type `ip ospf bfd`, then `show bfd peers`.

---

```
BFD Peers:
	peer 10.0.2.2 local-address 10.0.2.1 vrf default interface a-c
		ID: 2472268457
		Remote ID: 0
		Active mode
		Status: down
```

> **bfdd:** A _session_ to c, `down`, and `Remote ID: 0`: nobody answers. BFD, Bidirectional Forwarding Detection, is a conversation between the two ends of a cable. Do the same on c for `c-a`, then look again on a.

---

```
BFD Peers:
	peer 10.0.2.2 local-address 10.0.2.1 vrf default interface a-c
		ID: 2472268457
		Remote ID: 1563095722
		Active mode
		Status: up
		Uptime: 10 second(s)
		Diagnostics: ok
		Remote diagnostics: ok
		Peer Type: dynamic
		RTT min/avg/max: 0/0/0 usec
		Local timers:
			Detect-multiplier: 3
			Receive interval: 300ms
			Transmission interval: 300ms
			Transmission interval (actual with jitter): 228ms
			Detection timeout: 900ms
```

> **bfdd:** `up`. Each end now sends a packet every 300 ms, and `Detection timeout: 900ms` is three of them missed. Press **Break the link** again.

---

## Watch it

> **bfdd:** How long until a's traffic to c is back, through b?
>
> - about as long as before, half a minute
> - [x] about a second
> - it never comes back

---

> **bfdd:** About a second: between 0.82 and 0.96 s in six runs on the Machine. Read what a's log says about me: `grep BFD /var/log/frr/a.log`.

---

```
2026/11/13 20:35:59.071 OSPF: [KYGCS-7CT60] ospf_bfd_session_change: NSM[a-c:10.0.2.1:10.0.2.2]: BFD Up
2026/11/13 20:36:15.070 OSPF: [X1ZWK-2050W] ospf_bfd_session_change: NSM[a-c:10.0.2.1:10.0.2.2]: BFD Down
```

> **bfdd:** That is ospfd writing what I told it: the session came up, then went down. ospfd dropped c at once instead of waiting for its dead timer. The order is the same as the first time: noticed, peer dropped, new route, replies back. Only the first step got shorter.

## Debrief

> **bfdd:** An interface that is up says nothing about packets getting through. OSPF's hellos noticed the silence after half a minute; my packets, every 300 ms from both ends, noticed it in under one. Stage 4 goes on with other ways a network rides out a failure.

## Real world

The same commands work on any FRR router that runs `ospfd` and `bfdd`:

```
vtysh
show ip ospf neighbor
show ip ospf interface
show ip route 10.255.0.3
configure terminal
 interface a-c
  ip ospf bfd
end
show bfd peers
```

Turn BFD on at both ends of the cable. To repeat the whole exercise on a Linux computer, with the same three routers and the same fault, see `lab/` in the Peerfall repository.
