# Bring the Line Up

**Question:** From bare cables, can you make a reach c, and keep it so after every router restarts?

## Scene

> **zebra:** Three routers in a line, two new cables, and nothing configured. FRR runs on each, started by its init script. The plan is on the topology: `10.0.1.0/30` between a and b, `10.0.2.0/30` between b and c. Make a reach c, and make it last.
>
> **watchfrr:** And when a router restarts, I start its daemons from its `frr.conf`. What isn't in that file, they never hear of.

## See it

> **zebra:** This time I only say where to look. Start on a: `ip -br addr`.

---

```
a:~# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
a-b@if2          UP             fe80::98ea:bdff:feb4:762c/64 
```

> **zebra:** Then `ping -c 2 10.0.2.2`.

---

```
a:~# ping -c 2 10.0.2.2
ping: connect: Network unreachable
```

> **zebra:** `a-b` is up with only the `fe80::` address Linux gives every interface by itself. No IPv4 address means no connected route, so Linux has no line for c and refuses to send, as in Two Ends of One Cable.

> **zebra:** Count what the plan needs before you type. Every cable has two ends, so four addresses, each in its own interface's mode, on its own router. a needs a static route to c's network, through b. c's replies are addressed to `10.0.1.1`, so c needs a route back, as in The Reply That Never Came Back. b needs none: it is plugged into both networks, and its connected routes cover them.

> **zebra:** Then follow one packet in your head. It leaves a by a's static route and reaches b. b hands it into c's network by a connected route. c answers, and the reply leaves c by c's static route, back to b, then by b's connected route to a. One missing line anywhere, and nothing comes back.

## Build it

> **zebra:** Give the four addresses and a's route to c's network. Then ping c from a.

---

```
--- 10.0.2.2 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2065ms
```

> **zebra:** When a's ping shows this, no error, only silence: the packets reached c, and its replies had nowhere to go. You have met it before. Write c's way back, then ping again until c answers.

---

> **zebra:** Once c answers, everything works, and all of it lives in three running configurations, which a restart forgets. Save each one with `write memory`, on a, on b and on c, as in Gone After the Restart.

---

```
c# write memory
Note: this version of vtysh never writes vtysh.conf
Building Configuration...
Integrated configuration saved to /etc/frr/c/frr.conf
[OK]
c# watchfrr[599]: [WFP93-1D146] configuration write completed with exit code 0
```

> **zebra:** `Integrated configuration saved to /etc/frr/c/frr.conf`: that file is what watchfrr reads. Now prove it. Restart FRR on each router with its init script: `/usr/lib/frr/frrinit.sh restart a`, and the same on b and on c, each with its own name.

---

## Watch it

> **zebra:** One question first. An address given in FRR and never saved: FRR restarts. Is the address still on the interface?
>
> - no, gone from Linux and from FRR
> - [x] Linux still has it, and FRR's running configuration doesn't
> - yes, in both

---

> **zebra:** From another run, with a's address given, never saved, then a restart:

```
a:~# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
a-b@if2          UP             10.0.1.1/30 fe80::c007:81ff:fe8a:8dae/64 
```

> **zebra:** Linux keeps an address until someone removes it. I still see it, but the running configuration came back from `frr.conf` alone, with no `interface a-b` at all. Your routers were saved. On a, read the routes: `vtysh -c "show ip route"`.

---

```
C>* 10.0.1.0/30 is directly connected, a-b, weight 1, 00:00:32
L>* 10.0.1.1/32 is directly connected, a-b, weight 1, 00:00:32
S>* 10.0.2.0/30 [1/0] via 10.0.1.2, a-b, weight 1, 00:00:31
```

> **zebra:** And ping c: `ping -c 3 10.0.2.2`.

---

```
64 bytes from 10.0.2.2: icmp_seq=1 ttl=63 time=0.656 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=63 time=0.614 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=63 time=0.791 ms
```

> **zebra:** Everything came back from the saved files: the address, its connected route, the static route through b, and replies with `ttl=63`.

## Debrief

> **zebra:** Every route here was written by hand, on every router, both ways. Imagine a hundred routers. In stage 3, the routers learn the routes from each other, and the peers come back.

## Real world

On a line of three FRR routers, each router's own lines, then the same two commands on each:

```
vtysh
configure terminal
 interface eth0
  ip address 10.0.1.1/30
 exit
 ip route 10.0.2.0/30 10.0.1.2
end
write memory
exit
sudo systemctl restart frr
```

On an installed router FRR has no name to add: its files are in `/etc/frr/`, and the service manager restarts it.
