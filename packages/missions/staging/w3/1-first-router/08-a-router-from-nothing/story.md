# A Router from Nothing

**Question:** Can you bring a router up alone, so that it is still right after a restart?

## Scene

> **zebra:** This is router a as the Peerfall left it: FRR installed, configured once, never started. Bring it up, give its cable to c a description, and make both survive a restart. You know every step. This time I'll only say which mission to look back at.
>
> **watchfrr:** And I'll say nothing at all until somebody starts me. When I do talk, read it: I only say what happened, never why.

## See it

> **zebra:** Read the router before you touch it. Does FRR run? Nobody Answers and The Silent Router asked that two ways.

---

```
a:~# vtysh
Exiting: failed to connect to any daemons.
a:~# /usr/lib/frr/frrinit.sh status a
Status of watchfrr: FAILED
Status of mgmtd: FAILED
Status of zebra: FAILED
Status of staticd: FAILED
```

> **zebra:** Nothing runs. vtysh found no daemon to talk to, and `FAILED` is the script's word for not running. I'm not even awake on a yet: the zebra talking to you is b's. Now the interfaces, as The Dark Cable read them, and the saved file, as Gone After the Restart read it.

---

```
a:~# ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP> 
a-b@if2          UP             92:9a:57:30:e6:d2 <BROADCAST,MULTICAST,UP,LOWER_UP> 
a-c@if2          UP             6e:76:3a:2c:f4:63 <BROADCAST,MULTICAST,UP,LOWER_UP> 
a:~# cat /etc/frr/a/frr.conf
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
interface a-c
 shutdown
!
```

> **zebra:** Both interfaces are up: with FRR stopped, only Linux runs them. The file has its own idea about `a-c`: `shutdown`, the setting you met in The Router's Language, which has zebra hold an interface down. Before FRR reads it, is every line sound? The Skipped Line showed you how to ask.

---

```
a:~# vtysh -C -f /etc/frr/a/frr.conf
a:~# echo $?
0
```

> **zebra:** Clean, and that is the catch. In The Skipped Line a bad line was the trouble. Here nothing will be skipped: FRR will apply every line of that file, the `shutdown` too. Keep that in mind when you start it.

## Build it

> **zebra:** Start FRR the way an installed router starts it.

---

> **watchfrr:** Awake, and all three answering. Before you read the interfaces again: what happened to the one to c?
>
> - nothing, it stayed up
> - [x] it went down
> - FRR refused to start

---

```
a:~# ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP> 
a-b@if2          UP             92:9a:57:30:e6:d2 <BROADCAST,MULTICAST,UP,LOWER_UP> 
a-c@if2          DOWN           6e:76:3a:2c:f4:63 <BROADCAST,MULTICAST> 
```

> **zebra:** Down. FRR applied the file, and the file says `shutdown`. Switching it on from Linux, as in The Dark Cable, would last only until the next start reads the same file. Make the change in FRR, in `a-c`'s own mode, as in The Router's Language. Give the interface its description while you are there, as in What It Does Now. Then save, as in Gone After the Restart, and read the file again.

---

```
a:~# cat /etc/frr/a/frr.conf
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
interface a-c
 description link to router c
exit
!
```

> **zebra:** No `shutdown` left. Undoing a setting removes its line, and the file was written from what is running.

## Watch it

> **zebra:** Now the test that counts, the one the Peerfall failed. Restart FRR with its script, then read the interfaces and the routing table, and ping c.

---

```
a:~# ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP> 
a-b@if2          UP             92:9a:57:30:e6:d2 <BROADCAST,MULTICAST,UP,LOWER_UP> 
a-c@if2          UP             6e:76:3a:2c:f4:63 <BROADCAST,MULTICAST,UP,LOWER_UP> 
a:~# ip route
10.0.1.0/30 dev a-b proto kernel scope link src 10.0.1.1 
10.0.2.0/30 dev a-c proto kernel scope link src 10.0.2.1 
a:~# ping -c 3 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.
64 bytes from 10.0.2.2: icmp_seq=1 ttl=64 time=4.17 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=64 time=0.428 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=64 time=0.425 ms

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2005ms
rtt min/avg/max/mdev = 0.425/1.673/4.167/1.763 ms
```

> **watchfrr:** Stopped, started, every daemon back, and the cable to c stayed up. Nobody had to touch it after me.
>
> **zebra:** `a-c` is `UP`, the routing table has its second line again, the one Linux adds for c's network, and c answers three times out of three. The restart read your file, and your file is right. That is a router you can leave alone for the night, and the first one the Peerfall has given back.

## Debrief

> **zebra:** One router, fully yours: started, read, changed in the right mode, saved, checked and restarted, and still right afterwards. That is stage 1. Stage 2 sends packets across routers like this one. In Two Ends of One Cable, you give interfaces their addresses.

## Real world

On a router of your own, with systemd:

```
sudo systemctl status frr                 # does FRR run?
sudo vtysh -C -f /etc/frr/frr.conf        # is the saved file sound?
sudo systemctl start frr
sudo vtysh                                # then configure terminal, interface …, write memory
sudo systemctl restart frr
ip -br link
```
