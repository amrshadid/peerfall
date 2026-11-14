# Another Language

**Question:** b speaks IS-IS on the link to a, and a runs IS-IS too. What does a need before it can answer?

## Scene

> **isisd:** I'm isisd, FRR's daemon for IS-IS, another link-state protocol. As with OSPF, each router tells the others what it is connected to, and every router draws the same map. Unlike OSPF, my packets don't ride inside IP packets: they go straight onto the link, with no IP address at all. On b, I send a hello into the link to a every few seconds. a runs me too, and has no peer.

## See it

> **isisd:** On a, ask for my peers: `vtysh -c "show isis neighbor"`.

---

```
Area core:
 System Id           Interface   L  State         Holdtime SNPA
```

> **isisd:** None. `core` is only the name typed after `router isis`, not a part of the network. Read the end of a's log: `tail -n 2 /var/log/frr/a.log`.

---

```
2026/11/14 12:51:26.862 ISIS: [Q7SVW-YVKRH] %ADJCHANGE: Adjacency to 0000.0000.0002 (a-b) for level-2 changed from Unknown to Initializing, unspecified
2026/11/14 12:51:26.863 ISIS: [Q7SVW-YVKRH] %ADJCHANGE: Adjacency to 0000.0000.0002 (a-b) for level-2 changed from Initializing to Down, Area Mismatch
```

> **isisd:** `%ADJCHANGE`: my peer on `a-b` changed state. b's hello arrives, and I name b by its _system id_, `0000.0000.0002`: IS-IS's name for a router, as a router id is OSPF's. Then I turn it down: `Area Mismatch`. Every few seconds, the same two lines. Ask about a itself: `vtysh -c "show isis summary"`.

---

```
vrf             : default
Process Id      : 491
Up time         : 00:00:07 ago
Number of areas : 1
Area core:
```

> **isisd:** No `System Id` line, and no `Net` under `Area core`. Click b and ask the same: `vtysh -c "show isis summary"`.

---

```
vrf             : default
Process Id      : 504
System Id       : 0000.0000.0002
Up time         : 00:00:11 ago
Number of areas : 1
Area core:
  Net: 49.0001.0000.0000.0002.00
```

> **isisd:** b has both, in one line: its _NET_. `49.0001` is b's area, then its system id, then `00`, always 00 on a router. IS-IS was first written for another family of networks, before it carried IP routes, and its names come from there: no IP address in them. a has no NET, so it belongs to no area, and every hello is a mismatch.

## Build it

> **isisd:** Click a, and open `vtysh`.

---

> **isisd:** Then `configure terminal`.

---

> **isisd:** Then `router isis core`: my settings, as `router ospf` holds ospfd's. The name `core` stays on a and never travels, so it need not match b's.

---

> **isisd:** Now a's NET: `net 49.0001.0000.0000.0001.00`. b's area, and a system id no other router has: twelve hexadecimal digits in three groups of four, here ending in a's number, 1.

---

> **isisd:** Look: `do show isis neighbor`.

---

```
Area core:
 System Id           Interface   L  State         Holdtime SNPA
 b                   a-b         2  Up            29       2020.2020.2020
```

> **isisd:** b, `Up`: IS-IS's last state, as `Full` is OSPF's. I name b by its hostname now, which b's own packets told me. `Holdtime` counts down and starts again at every hello, as OSPF's `Dead Time` does. The `L` column waits for the next mission.

> **isisd:** Now wait. I send a new version of a router's own map at most every 30 seconds, and a sent its first one when it got its NET. So a learns b's loopback within half a minute.

## Watch it

> **isisd:** a has learned b's loopback. What distance did zebra give my route to it?
>
> - 110, like OSPF's
> - [x] 115
> - 0, like a connected route

> **isisd:** Type `do show ip route`.

---

```
I   10.0.1.0/30 [115/20] via 10.0.1.2, a-b inactive, weight 1, 00:00:06
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:01:06
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:01:06
L * 10.255.0.1/32 is directly connected, lo, weight 1, 00:01:06
C>* 10.255.0.1/32 is directly connected, lo, weight 1, 00:01:06
I>* 10.255.0.2/32 [115/20] via 10.0.1.2, a-b, weight 1, 00:00:06
```

> **isisd:** `I` is IS-IS, distance `115`. `20` is my metric: 10 for the link, 10 more for b's loopback. The `I` line without `>*` is the link's own network, where the connected route wins. Now my map: `do show isis database`.

---

```
Area core:
IS-IS Level-2 link-state database:
LSP ID                  PduLen  SeqNumber   Chksum  Holdtime  ATT/P/OL
a.00-00              *     91   0x00000002  0x868a    1132    0/0/0
b.00-00                    91   0x00000004  0x0109    1147    0/0/0
    2 LSPs
```

> **isisd:** One _LSP_ per router, IS-IS's word for what OSPF calls an LSA. The `*` marks a's own.

## Debrief

> **isisd:** IS-IS draws the same map in another language: a NET names each router, hellos go straight onto the link, and routes arrive at distance 115. Next, how IS-IS splits a network into areas, and how a router finds its way out of one: Two Levels.

## Real world

On an FRR router that runs `isisd`, with your own interface names and a system id of its own:

```
vtysh
configure terminal
 router isis core
  net 49.0001.0000.0000.0001.00
 exit
 interface eth0
  ip router isis core
end
show isis neighbor
show isis database
show ip route
```

Give every router its own system id. Many networks build it from the router's loopback address.
