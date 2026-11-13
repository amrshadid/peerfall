# The Dark Cable

**Question:** What is a router, and why can't router a reach router c?

## Scene

The pager goes off after midnight. Every router here has lost its peers, the routers it talks to. The cables still carry light, and nothing gets across.

> **zebra:** You're the engineer on call? Good. I'm zebra, and I live on these routers. We start with one: router a, and its neighbours b and c. a reaches b. It can't reach c. Lines already on a's screen, above where you type, are its routing software starting; they wait for Nobody Answers.

## See it

> **zebra:** A _router_ is a computer that passes packets from one network to another. A _packet_ is a small piece of data with an address on it. Router a is a Linux computer, so ask Linux for its interfaces: type `ip -br link`.

---

```
a:~# ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
a-b@if2          UP             d2:de:74:d0:37:cf <BROADCAST,MULTICAST,UP,LOWER_UP>
a-c@if2          DOWN           22:dc:84:0f:5f:5f <BROADCAST,MULTICAST>
```

> **zebra:** Each line is an _interface_: one of a's connections to a network. `a-b` is a's end of the cable to b, `a-c` its end of the cable to c. `@if2` numbers the other end. `lo`, the loopback, is a's own interface, with no cable at all, so its state is `UNKNOWN`.

> **zebra:** The second column is the state. `a-b` is `UP`: the flags at the end say `UP` for switched on and `LOWER_UP` for a live cable. `a-c` is `DOWN`, and neither flag is there: it is switched off, and nothing leaves through it.

> **zebra:** Now ask for the addresses: `ip -br addr`.

---

```
a:~# ip -br addr
lo               UNKNOWN        127.0.0.1/8 10.255.0.1/32 ::1/128
a-b@if2          UP             10.0.1.1/30 fe80::d0de:74ff:fed0:37cf/64
a-c@if2          DOWN           10.0.2.1/30
```

> **zebra:** An address names an interface, the way a house number names a door, except that one router has an address on every cable. a is `10.0.1.1` towards b and `10.0.2.1` towards c. The `/30` and the long `fe80::` ones can wait for stage 2.

## Build it

> **zebra:** Try b first. `ping -c 3 10.0.1.2` sends three packets to b's address and waits for answers.

---

```
a:~# ping -c 3 10.0.1.2
PING 10.0.1.2 (10.0.1.2) 56(84) bytes of data.
64 bytes from 10.0.1.2: icmp_seq=1 ttl=64 time=1.98 ms
64 bytes from 10.0.1.2: icmp_seq=2 ttl=64 time=0.411 ms
64 bytes from 10.0.1.2: icmp_seq=3 ttl=64 time=0.880 ms

--- 10.0.1.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2005ms
rtt min/avg/max/mdev = 0.411/1.091/1.982/0.658 ms
```

> **zebra:** Each `64 bytes from 10.0.1.2` line is one answer from b, and `time` is how long it took there and back, in thousandths of a second. Three sent, three answered. Now c: `ping -c 3 10.0.2.2`.

---

```
a:~# ping -c 3 10.0.2.2
ping: connect: Network unreachable
```

> **zebra:** No answers, and no packets either: Linux refused even to send. Before a packet leaves, Linux must choose an interface for it, and for that it reads its _routing table_. Show it with `ip route`.

---

```
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1
```

> **zebra:** One line, one _route_: packets for the addresses in `10.0.1.0/30`, b's among them, leave by `dev a-b`. No line covers c's address, so Linux has nowhere to send it. Switch the dark interface on: `ip link set a-c up`.

---

## Watch it

> **zebra:** Before you look: what will `ip route` show now?
>
> - the same single line
> - [x] a second line, for c's network, through `a-c`
> - a line for every router there is

---

```
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1
10.0.2.0/30 dev a-c proto kernel scope link src 10.0.2.1
```

> **zebra:** A second line, and nobody typed it. `proto kernel` says Linux added it itself, the moment `a-c` came up with its address: whatever is in c's network can be reached straight out of that cable. A route works like a signpost: this way for those addresses. Unlike a signpost, it shows only the next step, never the whole way, and only its own router reads it. Ping c again.

---

```
a:~# ping -c 3 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.
64 bytes from 10.0.2.2: icmp_seq=1 ttl=64 time=11.2 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=64 time=0.425 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=64 time=0.873 ms

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2006ms
rtt min/avg/max/mdev = 0.425/4.152/11.158/4.957 ms
```

## Debrief

> **zebra:** So a router is a computer with interfaces, and its routes say which one each packet takes. Linux did all of this by itself. So what am I for? In Nobody Answers, you meet FRR.

## Real world

On any Linux computer:

```
ip -br link          # its interfaces: lo, and names like eth0, enp0s3 or wlan0
ip -br addr          # their addresses
ip route             # its routing table
ip route get 10.0.2.2
```

A laptop's routing table usually has a `default` line too: the route for every address no other line covers. Stage 2 explains it.
