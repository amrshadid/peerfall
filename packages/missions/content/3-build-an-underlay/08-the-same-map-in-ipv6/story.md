# The Same Map in IPv6

**Question:** Every router here has an IPv6 address, and a has no IPv6 route to anyone. Which daemon draws that map?

## Scene

> **ospf6d:** Every address so far was IPv4, four numbers like `10.255.0.1`. IPv6 is the newer kind: longer, written in hexadecimal with colons. Each loopback here has one: a is `fd00::1`, b `fd00::2`, c `fd00::3`. ospfd carries only IPv4, so these routers run me, ospf6d, FRR's daemon for OSPFv3: OSPF for IPv6. I run on every interface of b and c. On a, everywhere but its link to b.

## See it

> **ospf6d:** On a, ask zebra for its IPv6 routes: `vtysh -c "show ipv6 route"`.

---

```
IPv6 unicast VRF default:
O   fd00::1/128 [110/0] is directly connected, lo, weight 1, 00:00:22
L * fd00::1/128 is directly connected, lo, weight 1, 00:00:51
C>* fd00::1/128 is directly connected, lo, weight 1, 00:00:51
C>* fe80::/64 is directly connected, a-b, weight 1, 00:00:51
```

> **ospf6d:** IPv6 has a table of its own. `/128` is one address, as `/32` is in IPv4: a's own loopback, nothing from b or c. `fe80::/64` is the network of the long addresses Linux gives every interface. Here `O` means OSPFv3. Now my peers: `vtysh -c "show ipv6 ospf6 neighbor"`.

---

```
Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
```

> **ospf6d:** None. Ask about a's end of the link: `vtysh -c "show ipv6 ospf6 interface a-b"`.

---

```
a-b is up, type BROADCAST
  Interface ID: 2
  Operating as type POINTOPOINT
  Internet Address:
    inet : 10.0.1.1/30
    inet6: fe80::d42f:a2ff:fea9:71c1/64
  Not Attached to Area
```

> **ospf6d:** `Not Attached to Area`: no area, so I stay silent there. Look at `inet6`: the `fe80::` address Linux gave the interface by itself, met in Two Ends of One Cable. It is a _link-local_ address: valid on this one link, never routed beyond it. Click b and ask for its peers: `vtysh -c "show ipv6 ospf6 neighbor"`.

---

```
Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
10.255.0.3        1    00:00:35     Full/PointToPoint    00:00:14 b-c[PointToPoint]
```

> **ospf6d:** b and c are peers already, `Full`. Now b's link-local addresses: `ip -6 addr show scope link`.

---

```
2: b-a: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP qlen 1000
    inet6 fe80::6cf9:98ff:fea3:5c34/64 scope link proto kernel_ll
3: b-c@b-a: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP qlen 1000
    inet6 fe80::2883:ebff:fe99:efce/64 scope link proto kernel_ll
```

> **ospf6d:** One per interface. The links have no other IPv6 address, and need none: my peers talk from these.

## Build it

> **ospf6d:** Click a, and open `vtysh`.

---

> **ospf6d:** Then `configure terminal`.

---

> **ospf6d:** Then `interface a-b`.

---

> **ospf6d:** Now `ipv6 ospf6 area 0`. Where ospfd's commands say `ip ospf`, mine say `ipv6 ospf6`.

---

> **ospf6d:** b says hello every 10 seconds. Give it that long, then look: `do show ipv6 ospf6 neighbor`.

---

```
Neighbor ID     Pri    DeadTime    State/IfState         Duration I/F[State]
10.255.0.2        1    00:00:35     Full/PointToPoint    00:00:04 a-b[PointToPoint]
```

> **ospf6d:** b, named by its router id, `Full` as ospfd's peers are. If the table is still empty, ask again. Now my map: `do show ipv6 ospf6 database`.

---

```
        Area Scoped Link State Database (Area 0)

Type LSId           AdvRouter       Age   SeqNum                        Payload
Rtr  0.0.0.0        10.255.0.1       14 80000002             10.255.0.2/0.0.0.2
Rtr  0.0.0.0        10.255.0.2       15 80000003             10.255.0.1/0.0.0.2
Rtr  0.0.0.0        10.255.0.2       15 80000003             10.255.0.3/0.0.0.2
Rtr  0.0.0.0        10.255.0.3       85 80000002             10.255.0.2/0.0.0.3
INP  0.0.0.0        10.255.0.1       14 80000002                    fd00::1/128
INP  0.0.0.0        10.255.0.2       15 80000003                    fd00::2/128
INP  0.0.0.0        10.255.0.3       85 80000002                    fd00::3/128

        I/F Scoped Link State Database (I/F lo in Area 0)

Type LSId           AdvRouter       Age   SeqNum                        Payload

        I/F Scoped Link State Database (I/F a-b in Area 0)

Type LSId           AdvRouter       Age   SeqNum                        Payload
Lnk  0.0.0.2        10.255.0.1       17 80000001      fe80::d42f:a2ff:fea9:71c1
Lnk  0.0.0.2        10.255.0.2       95 80000001      fe80::6cf9:98ff:fea3:5c34

        AS Scoped Link State Database

Type LSId           AdvRouter       Age   SeqNum                        Payload
```

> **ospf6d:** The same idea as ospfd's database, cut differently. `Rtr` LSAs list each router's peers, one line per peer, with no address at all. `INP` LSAs carry each router's networks. Below, one `Lnk` LSA per end of `a-b` carries that end's link-local address. Go back with `end`.

---

> **ospf6d:** And leave the console: `exit`.

---

## Watch it

> **ospf6d:** a's route to c's loopback goes through b. Which address of b's will be its next hop?
>
> - `10.0.1.2`, b's IPv4 address
> - [x] b's `fe80::` address on the link
> - `fd00::2`, b's loopback

> **ospf6d:** Type `vtysh -c "show ipv6 route"`.

---

```
O>* fd00::2/128 [110/10] via fe80::6cf9:98ff:fea3:5c34, a-b, weight 1, 00:00:19
O>* fd00::3/128 [110/20] via fe80::6cf9:98ff:fea3:5c34, a-b, weight 1, 00:00:19
```

> **ospf6d:** b's link-local address on `b-a`, with `a-b` beside it: every link has `fe80::` addresses, so the interface says which link. `20` is two links at cost 10. Ping c: `ping -c 3 fd00::3`.

---

```
64 bytes from fd00::3: icmp_seq=1 ttl=63 time=2.07 ms
64 bytes from fd00::3: icmp_seq=2 ttl=63 time=1.15 ms
64 bytes from fd00::3: icmp_seq=3 ttl=63 time=0.778 ms
```

> **ospf6d:** `ttl=63`: one router, b, on the way, as in IPv4. The same links carry both kinds of packet, and each kind has its own daemon: ospfd could run beside me here, for IPv4.

## Debrief

> **ospf6d:** OSPFv3 draws the same map for IPv6: peers, areas and costs, with next hops on link-local addresses that never leave their link. OSPF is not the only language for that map. Next, another one, which names its routers without any IP address: Another Language, with isisd.

## Real world

On an FRR router that runs `ospf6d`, with your own interface names:

```
vtysh
configure terminal
 interface eth0
  ipv6 ospf6 area 0
 exit
 router ospf6
  ospf6 router-id 10.255.0.1
end
show ipv6 ospf6 neighbor
show ipv6 route
```

Put both ends of each link in the same area, and give each router its own router id.
