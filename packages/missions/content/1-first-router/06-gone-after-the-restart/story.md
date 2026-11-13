# Gone After the Restart

**Question:** What does a router remember when FRR restarts?

## Scene

> **zebra:** Last week someone gave router a's loopback, `lo`, a description, so the next engineer would know what it is for. It sat in the running configuration all week. Last night FRR on a restarted, and this morning the description is gone. Nobody removed it. Find out why, before it happens to something that matters.
>
> **watchfrr:** Don't look at me. I started everything again, exactly as I was told.

## See it

> **zebra:** Do what they did. Short words are fine in vtysh: `conf t`, `int lo`, `descr loopback of router a`, `end`. Then `show running-config`.

---

```
a# conf t
a(config)# int lo
a(config-if)# descr loopback of router a
a(config-if)# end
a# show running-config
Building configuration...

Current configuration:
!
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
interface lo
 description loopback of router a
exit
!
end
```

> **zebra:** There it is, in the running configuration. Now leave vtysh and read the file FRR starts from: `cat /etc/frr/a/frr.conf`.

---

```
a:~# cat /etc/frr/a/frr.conf
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
```

> **zebra:** No `interface lo` in the file, just as your label to c never reached it in What It Does Now. Now do what the night did: restart FRR with its script, `/usr/lib/frr/frrinit.sh restart a`. A _restart_ stops every daemon and starts them again.

---

```
a:~# /usr/lib/frr/frrinit.sh restart a
watchfrr[568]: [NG1AJ-FP2TQ] Terminating on signal
Stopped watchfrr
Stopped staticd
Stopped mgmtd
Stopped zebra
Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'
watchfrr[681]: [T83RR-8SM5G] watchfrr 10.6.1 starting: vty@0
watchfrr[681]: [ZCJ3S-SPH5S] mgmtd state -> down : initial connection attempt failed
watchfrr[681]: [ZCJ3S-SPH5S] zebra state -> down : initial connection attempt failed
watchfrr[681]: [ZCJ3S-SPH5S] staticd state -> down : initial connection attempt failed
watchfrr[681]: [YFT0P-5Q5YX] Forked background command [pid 682]: /usr/lib/frr/watchfrr.sh restart all
watchfrr[681]: [QDG3Y-BY5TN] mgmtd state -> up : connect succeeded
watchfrr[681]: [QDG3Y-BY5TN] staticd state -> up : connect succeeded
watchfrr[681]: [QDG3Y-BY5TN] zebra state -> up : connect succeeded
watchfrr[681]: [KWE5Q-QNGFC] all daemons up, doing startup-complete notify
Started watchfrr
watchfrr[681]: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:00
```

> **watchfrr:** `Terminating on signal`: that's me being stopped, then the other three. Then I start again, start them, and have the file read in. Same as every start.
>
> **zebra:** Ask what's running now: `vtysh -c "show running-config"`.

---

```
a:~# vtysh -c "show running-config"
Building configuration...

Current configuration:
!
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
end
```

> **zebra:** Gone, and nobody removed it: no daemon crashed, and nobody typed `no description`. The daemons held it in memory, and a stopped daemon forgets. A start knows only what `/etc/frr/a/frr.conf` says, and nobody had written it there.

## Build it

> **zebra:** That file is the _saved configuration_, and the change has to reach it. In vtysh, give `lo` its description again, then type `write memory` at `a#`.

---

```
a# write memory
Note: this version of vtysh never writes vtysh.conf
Building Configuration...
Integrated configuration saved to /etc/frr/a/frr.conf
[OK]
a# watchfrr[681]: [WFP93-1D146] configuration write completed with exit code 0
```

> **zebra:** `write memory` copies the whole running configuration into `frr.conf`. The note is about vtysh's own settings file, which it leaves alone. The last line is watchfrr's: vtysh asks watchfrr to do the writing. Leave vtysh and read the result: `cat /etc/frr/a/frr.conf`, then `ls /etc/frr/a`.

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
interface lo
 description loopback of router a
exit
!
a:~# ls /etc/frr/a
daemons       frr.conf      frr.conf.sav  vtysh.conf
```

> **zebra:** The file now holds what was running, block for block. `frr.conf.sav` is the file as it was before, kept in case you want it back. Think of a notebook beside a busy desk: the desk is lost each night, and the notebook is what the morning starts from. The picture stops at the writing: `write memory` never adds one line to the notebook, it writes the whole desk into a fresh one.

## Watch it

> **zebra:** Restart FRR on a once more, then ask again with `vtysh -c "show running-config"`. What comes back?
>
> - nothing, a restart starts empty
> - [x] everything in `frr.conf`, the description too
> - only what you typed last

---

```
a:~# vtysh -c "show running-config"
Building configuration...

Current configuration:
!
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
interface lo
 description loopback of router a
exit
!
end
```

> **zebra:** Back, and nobody typed it again. The restart read the file, and this time the file had it. `show interface lo` agrees: `Description: loopback of router a`. That is all a restart keeps: one file, read once at the start. Whatever was running before is gone, and the file alone decides what comes back.
>
> **watchfrr:** Told you. I start what the file says, nothing more and nothing less.

## Debrief

> **zebra:** A restart keeps only what was saved. After a change that should last, write it to the file, and read the file if you want to be sure. What if the saved file holds a mistake? In The Skipped Line.

## Real world

On a router of your own the file is `/etc/frr/frr.conf`, and systemd runs the same script:

```
sudo vtysh
configure terminal
interface lo
description loopback of this router
end
write memory
exit
sudo cat /etc/frr/frr.conf
sudo systemctl restart frr
sudo vtysh -c "show running-config"
```
