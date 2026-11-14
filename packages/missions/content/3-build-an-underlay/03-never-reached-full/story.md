# Never Reached Full

**Question:** a and b say hello and never become Full. What is different about their two ends?

## Scene

> **ospfd:** This is how the Peerfall began, in small. a and b run OSPF on their link, both ends in area 0, every line of FRR's configuration in place, both interfaces up. We said hello all night and never shared our maps, so neither learned the other's loopback. Small packets cross this link. Something larger doesn't. Find what differs between its two ends.

## See it

> **ospfd:** On a, open `vtysh`.

---

> **ospfd:** Then `show ip ospf neighbor`.

---

```

Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.255.0.2        1 ExStart/-       35.995s           34.002s 10.0.1.2        a-b:10.0.1.1                         0     0     0
```

> **ospfd:** b is there, so our hellos cross. But `ExStart`, not `Full`. To reach Full, two peers swap databases: in ExStart they agree who leads, in Exchange each lists the LSAs it holds, in Loading each asks for what it lacks. We never leave the first step. Type `exit`.

---

> **ospfd:** At the shell, read the end of a's log: `tail -n 3 /var/log/frr/a.log`.

---

```
2026/11/14 12:19:54.748 OSPF: [Q1R6D-XS42D] NSM[a-b:10.0.1.1:10.0.1.2:default]: Timer (DD Retransmit timer expire)
2026/11/14 12:19:54.748 OSPF: [XGKSD-28KJC] default:Packet[DD]: 10.255.0.2 DB Desc resend with seqnum:209188e7 , flags:7
2026/11/14 12:19:54.761 OSPF: [XZZ9Y-NNTMQ][EC 134217741] Packet[DD]: Neighbor 10.255.0.2 MTU 9000 is larger than [a-b:10.0.1.1]'s MTU 1500
```

> **ospfd:** The last line is my warning. b's database description, the packet that starts the swap, says b's _MTU_ is 9000, and a's end is 1500. The MTU is the largest packet an interface sends. b could send me packets a can't take, so I refuse its list. Compare the two ends: `ip link show a-b`.

---

```
2: a-b@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether da:94:5f:47:9a:d4 brd ff:ff:ff:ff:ff:ff link-netns b
```

> **ospfd:** `mtu 1500`, Linux's usual. Click b, and type `ip link show b-a`.

---

```
2: b-a@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9000 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 22:aa:d1:67:f7:20 brd ff:ff:ff:ff:ff:ff link-netns a
```

> **ospfd:** `mtu 9000`. Click a, and send packets with 2000 bytes of data: `ping -c 2 -s 2000 10.0.1.2`.

---

```
PING 10.0.1.2 (10.0.1.2) 2000(2028) bytes of data.

--- 10.0.1.2 ping statistics ---
2 packets transmitted, 0 received, 100% packet loss, time 1009ms
```

> **ospfd:** Lost, while a plain ping is answered. b answers each in one packet of 2028 bytes, and a's end refuses anything over 1500.

## Build it

> **ospfd:** FRR has no command for an interface's MTU on Linux: Linux sets it, and I only read it. Click b, and set its end back to Linux's usual: `ip link set b-a mtu 1500`.

---

> **ospfd:** Check it: `ip link show b-a`.

---

```
2: b-a@if2: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT group default qlen 1000
    link/ether 22:aa:d1:67:f7:20 brd ff:ff:ff:ff:ff:ff link-netns a
```

> **ospfd:** `mtu 1500`, the same as a's end. Nothing in FRR changed. Click a, and open `vtysh`.

---

> **ospfd:** Give b's next hello up to 10 seconds, then `show ip ospf neighbor`.

---

```

Neighbor ID     Pri State           Up Time         Dead Time Address         Interface                        RXmtL RqstL DBsmL
10.255.0.2        1 Full/-          6.368s            35.837s 10.0.1.2        a-b:10.0.1.1                         0     0     0
```

> **ospfd:** `Full`, and FRR never restarted. b's ospfd saw its MTU change and started its end of the link over, and this time I could take b's database description. We went through Exchange and Loading, and now we hold the same database. Two peers that have done that are an _adjacency_. Type `exit`.

---

## Watch it

> **ospfd:** Before you type `ping -c 2 -s 2000 10.0.1.2` again: does it cross now?
>
> - no, 2000 bytes is more than 1500
> - [x] yes, both ways
> - only the first packet

---

```
PING 10.0.1.2 (10.0.1.2) 2000(2028) bytes of data.
2008 bytes from 10.0.1.2: icmp_seq=1 ttl=64 time=0.606 ms
2008 bytes from 10.0.1.2: icmp_seq=2 ttl=64 time=0.715 ms

--- 10.0.1.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss, time 1003ms
rtt min/avg/max/mdev = 0.606/0.660/0.715/0.054 ms
```

> **ospfd:** Both ends now cut a large packet into pieces of 1500 bytes at most, and the other end puts them back together. There was a shortcut: `ip ospf mtu-ignore` tells me to stop comparing. On this network, with it at both ends and b still at 9000, we went Full and every 2000-byte ping was still lost: Full peers over a link that drops large packets. Full alone proves nothing about the largest packet a link carries.

## Debrief

> **ospfd:** Hellos are small and cross any link. Swapping databases, and any large packet, needs both ends to agree on the MTU, and that is Linux's setting. On the night of the Peerfall, it was wrong on every router. Which path does OSPF choose? The Cheaper Way.

## Real world

On any Linux router running FRR, with your own interface names:

```
vtysh -c "show ip ospf neighbor"
ip link show eth0
ping -c 2 -s 2000 10.0.1.2
ip link set eth0 mtu 1500
vtysh -c "show ip ospf interface eth0"
```

`ip link set` lasts until the router boots again. To keep it, write the MTU into Linux's network configuration, which the router reads when it boots, and check both ends of every link.
