# The Link That Never Went Down

**Question:** Why did traffic stop for half a minute on a link that never went down?

## Scene

**What users saw.** Traffic from router a to router c stopped for about 35 seconds, then came back by itself.

**What the network looked like.** Three routers, a, b and c, each connected to the other two. a normally sends traffic to c over their direct link.

**What is strange.** The direct link between a and c never went down. Both interfaces stayed up the whole time. Nothing was unplugged and no alarm fired. The link was up, and it was passing nothing.

## Build it

**Your job.** Find out why the network took so long to notice, and make it recover in under two seconds the next time the same thing happens.

You can break the link yourself, as often as you like, and watch what each router does.

## Debrief

**Why the interfaces stayed up.** An interface is "up" when the cable has a signal. That says nothing about whether packets get through. A bad optic, a broken device in the middle or a filter can drop every packet while both ends still show `UP`. Routers that only watch the interface never find out.

**What noticed, the first time.** OSPF routers send each other a **hello** every 10 seconds. A router gives up on a neighbor when it has heard no hello for the **dead interval**, 40 seconds by default. Your first run shows it: a kept c as a neighbor, and kept sending traffic into the dead link, until that timer ran out. Depending on when the last hello arrived, that is 30 to 40 seconds of lost traffic.

Only then did OSPF remove the neighbor, work out the next best path (through b), and hand the new route to the Linux kernel, which is what forwards packets.

**What noticed, the second time.** **BFD** (Bidirectional Forwarding Detection) does one thing: the two ends of a link send each other a small packet every 300 milliseconds, and when three in a row are missing, 900 milliseconds at most, BFD tells OSPF the neighbor is gone. OSPF does not wait for its dead timer.

Look at your second timeline. The order is the same as before: detection, neighbor removed, new route, first reply. Only the first step changed, from tens of seconds to under one.

**Why both ends.** BFD is a conversation. With `ip ospf bfd` on one router only, that router starts a session and nobody answers: `show bfd peers` shows it `down`, it never comes up, and nothing is detected early. Each end also detects the failure for itself: in your timeline the router that noticed first may be c, with a moving its route because c told the network before a's own BFD gave up.

## Real world

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
