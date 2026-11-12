# Debrief: the link that never went down

## Why the interfaces stayed up

An interface is "up" when the cable has a signal. That says nothing about whether packets get through. A bad optic, a broken device in the middle or a filter can drop every packet while both ends still show `UP`. Routers that only watch the interface never find out.

## What noticed, the first time

OSPF routers send each other a **hello** every 10 seconds. A router gives up on a neighbor when it has heard no hello for the **dead interval**, 40 seconds by default. Your first run shows it: a kept c as a neighbor, and kept sending traffic into the dead link, until that timer ran out. Depending on when the last hello arrived, that is 30 to 40 seconds of lost traffic.

Only then did OSPF remove the neighbor, work out the next best path (through b), and hand the new route to the Linux kernel, which is what forwards packets.

## What noticed, the second time

**BFD** (Bidirectional Forwarding Detection) does one thing: the two ends of a link send each other a small packet every 300 milliseconds, and when three in a row are missing, 900 milliseconds at most, BFD tells OSPF the neighbor is gone. OSPF does not wait for its dead timer.

Look at your second timeline. The order is the same as before: detection, neighbor removed, new route, first reply. Only the first step changed, from tens of seconds to under one.

## Why both ends

BFD is a conversation. With `ip ospf bfd` on one router only, that router has nobody to talk to, no session forms, and nothing is detected early. Each end also detects the failure for itself: in your timeline the router that noticed first may be c, with a moving its route because c told the network before a's own BFD gave up.

## Try it on real FRR

The same commands work on any FRR router:

```
vtysh
show ip ospf neighbor
show ip route 10.255.0.3
configure terminal
 interface a-c
  ip ospf bfd
end
show bfd peers
```

To repeat the whole exercise on a Linux machine, with the same three routers and the same fault, see `lab/` in the Peerfall repository.
