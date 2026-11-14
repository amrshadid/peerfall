# The Shared Map

**Question:** Every router keeps a copy of the same map. Why is c's loopback missing from it?

## Scene

Three routers in a triangle, every link running OSPF in area 0, every router a peer of the other two.

> **ospfd:** a learned b's loopback from me, as in Say Hello. It never learned c's, `10.255.0.3`, and a ping to it can't even leave a: no route covers it. Every router here keeps the same map of the network, and works out its routes from that map. Read it, and find what c left out.

## See it

> **ospfd:** On a, open `vtysh`.

---

> **ospfd:** Then `show ip ospf database`.

---

```

       OSPF Router with ID (10.255.0.1)

                Router Link States (Area 0.0.0.0)

Link ID         ADV Router      Age  Seq#       CkSum  Link count
10.255.0.1     10.255.0.1        29 0x80000005 0x5234 5
10.255.0.2     10.255.0.2        30 0x80000005 0xd2ae 5
10.255.0.3     10.255.0.3        25 0x80000004 0x7228 4
```

> **ospfd:** My _link-state database_: the map. Each line is one LSA, a link-state advertisement, and these are _router-LSAs_: each router's own list of what it is connected to, sent by the router in `ADV Router`. `Age` counts seconds since it was sent, and `Seq#` goes up by one with each new copy. `Link count`: a and b list 5 things, c only 4. Look inside c's: `show ip ospf database router 10.255.0.3`.

---

```

       OSPF Router with ID (10.255.0.1)


                Router Link States (Area 0.0.0.0)

  LS age: 25
  Options: 0x2  : *|-|-|-|-|-|E|-
  LS Flags: 0x6  
  Flags: 0x0
  LS Type: router-LSA
  Link State ID: 10.255.0.3 
  Advertising Router: 10.255.0.3
  LS Seq Number: 80000004
  Checksum: 0x7228
  Length: 72

   Number of Links: 4

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 10.255.0.1
     (Link Data) Router Interface address: 10.0.2.2
      Number of TOS metrics: 0
       TOS 0 Metric: 10

    Link connected to: Stub Network
     (Link ID) Net: 10.0.2.0
     (Link Data) Network Mask: 255.255.255.252
      Number of TOS metrics: 0
       TOS 0 Metric: 10

    Link connected to: another Router (point-to-point)
     (Link ID) Neighboring Router ID: 10.255.0.2
     (Link Data) Router Interface address: 10.0.3.2
      Number of TOS metrics: 0
       TOS 0 Metric: 10

    Link connected to: Stub Network
     (Link ID) Net: 10.0.3.0
     (Link Data) Network Mask: 255.255.255.252
      Number of TOS metrics: 0
       TOS 0 Metric: 10
```

> **ospfd:** For each link, c lists two things: the router at the other end, and the link's network, a _stub network_, with `Metric: 10`, the price of using it. That makes four. a and b list their loopbacks as a fifth, a stub network with mask `255.255.255.255`, one single address. Nothing for `10.255.0.3`: OSPF doesn't run on c's `lo`, so it isn't on the map. Is b's copy any different? Click b, and type `vtysh -c "show ip ospf database"`.

---

```

       OSPF Router with ID (10.255.0.2)

                Router Link States (Area 0.0.0.0)

Link ID         ADV Router      Age  Seq#       CkSum  Link count
10.255.0.1     10.255.0.1        31 0x80000005 0x5234 5
10.255.0.2     10.255.0.2        30 0x80000005 0xd2ae 5
10.255.0.3     10.255.0.3        26 0x80000004 0x7228 4
```

> **ospfd:** The same LSAs, the same sequence numbers and checksums. Peers pass every LSA on to each other, so every copy matches. A map like a shared document, except that each router writes only its own line.

## Build it

> **ospfd:** The fix is c's, since only c writes c's router-LSA: a and b pass it on and never change it. Click c, and open `vtysh`.

---

> **ospfd:** Then `configure terminal`.

---

> **ospfd:** Then `interface lo`.

---

> **ospfd:** First `ip ospf passive`. A _passive_ interface is on the map, but I send no hellos out of it: no router listens on a loopback.

---

> **ospfd:** Now `ip ospf area 0`, which puts `lo` into OSPF.

---

> **ospfd:** Check: `do show ip ospf interface lo`.

---

```
lo is up
  ifindex 1, MTU 65536 bytes, BW 0 Mbit <UP,LOWER_UP,LOOPBACK,RUNNING>
  Internet Address 10.255.0.3/32, Broadcast 10.255.0.3, Area 0.0.0.0
  MTU mismatch detection: enabled
  Router ID 10.255.0.3, Network Type LOOPBACK, Cost: 0
  Transmit Delay is 1 sec, State Loopback, Priority 1
  No backup designated router on this network
  Multicast group memberships: <None>
  Timer intervals configured, Hello 10s, Dead 40s, Wait 40s, Retransmit 5
    No Hellos (Passive interface)
  Neighbor Count is 0, Adjacent neighbor count is 0
  Graceful Restart hello delay: 10s
  LSA retransmissions: 0
```

> **ospfd:** `Area 0.0.0.0`, `No Hellos (Passive interface)`, and `Cost: 0`: reaching c's own loopback from c costs nothing. The moment `lo` joined, I wrote c a new router-LSA and sent it to both peers.

## Watch it

> **ospfd:** Click a. Before you type `vtysh -c "show ip ospf database"`: what does a's copy show for c?
>
> - nothing new: a must ask c for it
> - [x] sequence number one higher, 5 links
> - a second line for c

---

```

       OSPF Router with ID (10.255.0.1)

                Router Link States (Area 0.0.0.0)

Link ID         ADV Router      Age  Seq#       CkSum  Link count
10.255.0.1     10.255.0.1        34 0x80000005 0x5234 5
10.255.0.2     10.255.0.2        35 0x80000005 0xd2ae 5
10.255.0.3     10.255.0.3         4 0x80000005 0x2359 5
```

> **ospfd:** `0x80000005`, `Age` 4: c's new list replaced the old one within seconds, with `10.255.0.3` as its fifth link. a never asked: peers pass each new LSA on as it arrives. From the new map, a worked out a route. Ask zebra: `vtysh -c "show ip route 10.255.0.3"`.

---

```
Routing entry for 10.255.0.3/32
  Known via "ospf", distance 110, metric 10, best
  Last update 00:00:05 ago
  Flags: Selected 
  Status: Installed 
  * 10.0.2.2, via a-c, weight 1
```

> **ospfd:** Through `a-c`, straight to c. Try it: `ping -c 3 10.255.0.3`.

---

```
PING 10.255.0.3 (10.255.0.3) 56(84) bytes of data.
64 bytes from 10.255.0.3: icmp_seq=1 ttl=64 time=1.03 ms
64 bytes from 10.255.0.3: icmp_seq=2 ttl=64 time=0.438 ms
64 bytes from 10.255.0.3: icmp_seq=3 ttl=64 time=0.450 ms

--- 10.255.0.3 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2004ms
rtt min/avg/max/mdev = 0.438/0.637/1.025/0.273 ms
```

## Debrief

> **ospfd:** Each router writes what it is connected to in its router-LSA, and every router keeps the same copy of all of them. A network nobody lists is on nobody's map. But a database needs two peers to swap it: Never Reached Full.

## Real world

On any FRR router that runs `ospfd`:

```
vtysh
show ip ospf database
show ip ospf database router 10.255.0.3
show ip ospf database router self-originate
configure terminal
 interface lo
  ip ospf passive
  ip ospf area 0
end
show ip ospf interface lo
```
