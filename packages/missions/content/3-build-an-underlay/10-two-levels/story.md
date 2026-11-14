# Two Levels

**Question:** a is a level-1 router. How does it reach a router in another area it has never heard of?

## Scene

> **isisd:** IS-IS splits its routers in two ways. Areas, named in the NET. And two levels: level 1 joins the routers of one area, level 2 joins the areas. Here b is a level-1-2 router, in both, in area `49.0001`. c is level 2 only, in area `49.0002`. a is level 1 only, and was meant to join b's area. Since it was set up, a has learned no route from anyone.

## See it

> **isisd:** On a, ask for my peers: `vtysh -c "show isis neighbor"`.

---

```
Area core:
 System Id           Interface   L  State         Holdtime SNPA
```

> **isisd:** None, although b is one link away. Ask about a itself: `vtysh -c "show isis summary"`.

---

```
vrf             : default
Process Id      : 513
System Id       : 0000.0000.0001
Up time         : 00:01:25 ago
Number of areas : 1
Area core:
  Net: 49.0002.0000.0000.0001.00
  TX counters per PDU type:
    P2P IIH: 30
   LSP RXMT: 0
  RX counters per PDU type:
    P2P IIH: 30
  Drop counters per PDU type:
    P2P IIH: 30
  Advertise high metrics: Disabled
  Level-1:
    LSP0 regenerated: 2
         LSPs purged: 0
    SPF:
      minimum interval  : 1
    IPv4 route computation:
      last run elapsed  : 00:00:55 ago
      last run duration : 4840 usec
      run count         : 2
```

> **isisd:** An IIH is my hello, and `P2P` says the link has two ends only. Every hello that arrived from b, I dropped: the drop counter matches the RX one. Below, only `Level-1`: a level-1 router, as planned. So the hellos arrive, and something in them doesn't agree. Click b and ask for its peers: `vtysh -c "show isis neighbor"`.

---

```
Area core:
 System Id           Interface   L  State         Holdtime SNPA
 c                   b-c         2  Up            28       2020.2020.2020
```

> **isisd:** c, at level 2, in the `L` column, and nobody on `b-a`: b's hellos to a go unanswered too. Now b's NET: `vtysh -c "show isis summary"`.

---

```
vrf             : default
Process Id      : 526
System Id       : 0000.0000.0002
Up time         : 00:01:32 ago
Number of areas : 1
Area core:
  Net: 49.0001.0000.0000.0002.00
```

> **isisd:** b is in `49.0001`, a in `49.0002`. Level-1 peers must share an area, so a's hellos and b's never match. b and c are in different areas too, and still peers: level 2 joins areas, so it doesn't compare them. In OSPF's words, level 2 is the backbone and b stands where an ABR would. Where that stops being true, you'll see in a moment.

## Build it

> **isisd:** Click a, and open `vtysh`.

---

> **isisd:** Then `configure terminal`, as always.

---

> **isisd:** Then `router isis core`. a's `is-type level-1` stays: the area is what's wrong, not the level.

---

> **isisd:** A router can hold more than one NET, so take the wrong one away first: `no net 49.0002.0000.0000.0001.00`. `no` takes a line away, as it took away `shutdown` in stage 1.

---

> **isisd:** Now the right area, with the same system id, a's name whatever its area: `net 49.0001.0000.0000.0001.00`.

---

> **isisd:** Look: `do show isis neighbor`.

---

```
Area core:
 System Id           Interface   L  State         Holdtime SNPA
 b                   a-b         1  Up            30       2020.2020.2020
```

> **isisd:** b, `Up` at level 1: a shares b's area now, so their hellos match. On b, a sits beside c, one peer at each level.

## Watch it

> **isisd:** c's loopback, `10.255.0.3`, is in the other area, and a only runs level 1. Will a get a route to it?
>
> - yes, an `I` route for `10.255.0.3/32`
> - [x] no, a default route through b instead
> - no, and a cannot reach c at all

> **isisd:** Give my map half a minute, then type `do show isis database`.

---

```
Area core:
IS-IS Level-1 link-state database:
LSP ID                  PduLen  SeqNumber   Chksum  Holdtime  ATT/P/OL
a.00-00              *     91   0x00000004  0x8090    1108    0/0/0
b.00-00                   100   0x00000003  0x12b3    1071    1/0/0
    2 LSPs
```

> **isisd:** Level 1 only: a's LSP and b's, nothing of c's, where an ABR would pass on summaries. b's `ATT` is `1`, the _attached bit_: b tells its area it reaches the others. Ask zebra for c's address: `do show ip route 10.255.0.3`.

---

```
Routing entry for 0.0.0.0/0
  Known via "isis", distance 115, metric 10, best
  Last update 00:00:55 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.1.2, via a-b, weight 1
```

> **isisd:** `0.0.0.0/0` covers c: the default route I made from b's attached bit. Packets for c leave through b, and b knows the rest.

## Debrief

> **isisd:** Level 1 keeps an area small: its routers know their own area and send everything else to a level-1-2 router, found by its attached bit. Level 2 carries every area's networks between those routers. Next, the capstone: four routers, bare FRR, and your own OSPF underlay. Build the Underlay.

## Real world

On an FRR router inside an area, with a level-1-2 router beside it:

```
vtysh
configure terminal
 router isis core
  is-type level-1
  net 49.0001.0000.0000.0001.00
end
show isis neighbor
show isis database
show ip route 0.0.0.0/0
```

A level-1 router needs no route to the other areas: the default route through its level-1-2 router covers them.
