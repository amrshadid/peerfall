# The Silent Router

**Question:** How is FRR started on a real router, and who keeps it running?

## Scene

> **zebra:** Router a was restarted, and FRR didn't come back. You could start each daemon by hand, but no router is run like that. FRR comes with a script that starts it.
>
> **watchfrr:** And the script starts me. When a daemon dies at three in the morning, somebody has to start it again. Somebody has to keep an eye on you lot.

## See it

> **zebra:** First, what should run on a: `cat /etc/frr/a/daemons`.

---

```
a:~# cat /etc/frr/a/daemons
# Which FRR daemons this router runs. zebra, mgmtd and staticd always start.
ospfd=no
ospf6d=no
isisd=no
bgpd=no
bfdd=no
```

> **zebra:** The line starting with `#` is a comment, for people. Then one line per protocol daemon, each `no`: they are for later stages, ospfd in stage 3, bfdd in stage 4, bgpd in stage 6, and a `yes` would start that daemon at the next start. The comment names the three that always start. You know me. _mgmtd_ takes the configuration you type and hands it to the daemons. _staticd_ keeps the routes written by hand. Now ask FRR's own script what runs: `/usr/lib/frr/frrinit.sh status a`.

---

```
a:~# /usr/lib/frr/frrinit.sh status a
Status of watchfrr: FAILED
Status of mgmtd: FAILED
Status of zebra: FAILED
Status of staticd: FAILED
```

> **zebra:** `FAILED` here means not running: the script looked for each daemon and found none, the same silence vtysh met in Nobody Answers. Four names, and the first, watchfrr, isn't in the `daemons` file at all. The script never starts the other three itself. It starts watchfrr, hands it their names, and watchfrr does the rest.

## Build it

> **zebra:** The same script starts FRR: `/usr/lib/frr/frrinit.sh start a`. Its last word is the router's name again, as `-N a` was for zebra.

---

```
a:~# /usr/lib/frr/frrinit.sh start a
Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'
watchfrr[609]: [T83RR-8SM5G] watchfrr 10.6.1 starting: vty@0
watchfrr[609]: [ZCJ3S-SPH5S] mgmtd state -> down : initial connection attempt failed
watchfrr[609]: [ZCJ3S-SPH5S] zebra state -> down : initial connection attempt failed
watchfrr[609]: [ZCJ3S-SPH5S] staticd state -> down : initial connection attempt failed
watchfrr[609]: [YFT0P-5Q5YX] Forked background command [pid 610]: /usr/lib/frr/watchfrr.sh restart all
watchfrr[609]: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:00
watchfrr[609]: [QDG3Y-BY5TN] mgmtd state -> up : connect succeeded
watchfrr[609]: [QDG3Y-BY5TN] zebra state -> up : connect succeeded
watchfrr[609]: [QDG3Y-BY5TN] staticd state -> up : connect succeeded
watchfrr[609]: [KWE5Q-QNGFC] all daemons up, doing startup-complete notify
Started watchfrr
a:~#
```

> **watchfrr:** That's me talking. `initial connection attempt failed`: I knocked on each daemon and nobody was there. `restart all`: so I started them. `Configuration Read in`: `frr.conf` was read into them. `connect succeeded`: all three answered. The order of my lines can change from one start to the next.
>
> **zebra:** Check from vtysh. `vtysh -c "show daemons"` runs one command and comes back to the shell.

---

```
a:~# vtysh -c "show daemons"
 mgmtd zebra staticd watchfrr
```

> **zebra:** Four names: the three from the comment, and watchfrr itself, which answers vtysh like any daemon. Ask it what it watches: `vtysh -c "show watchfrr"`.

---

```
a:~# vtysh -c "show watchfrr"
watchfrr global phase: Idle
 Restart Command: "/usr/lib/frr/watchfrr.sh restart %s"
 Start Command: "/usr/lib/frr/watchfrr.sh start %s"
 Stop Command: "/usr/lib/frr/watchfrr.sh stop %s"
 Min Restart Interval: 60
 Max Restart Interval: 600
 Restart Timeout: 90
 Reading Configuration: no
  mgmtd                Up
  zebra                Up
  staticd              Up
```

> **watchfrr:** My three, each `Up`. `Restart Command` is what I run when one stops answering, with its name in place of `%s`.

## Watch it

> **watchfrr:** Go on: `pkill staticd` stops staticd. What happens next?
>
> - staticd stays gone until you start it
> - [x] watchfrr starts it again by itself
> - FRR stops altogether

---

```
a:~# pkill staticd
watchfrr[591]: [HD38Q-0HBRT][EC 268435457] staticd state -> down : read returned EOF
```

> **watchfrr:** `read returned EOF`: staticd hung up on me. Ask: `vtysh -c "show daemons"`.

---

```
a:~# vtysh -c "show daemons"
 mgmtd zebra watchfrr
```

> **watchfrr:** Ask again in a few seconds.

---

```
a:~# watchfrr[591]: [YFT0P-5Q5YX] Forked background command [pid 637]: /usr/lib/frr/watchfrr.sh restart staticd
watchfrr[591]: [QDG3Y-BY5TN] staticd state -> up : connect succeeded
vtysh -c "show daemons"
 mgmtd zebra staticd watchfrr
```

> **zebra:** Back, and nobody typed a thing: about six seconds here. watchfrr is a _watchdog_. It keeps a line open to every daemon and restarts the one that goes silent, though never twice within a minute: `Min Restart Interval: 60`. Think of a night guard on rounds who finds a light out and switches it back on. The picture stops at the cause: watchfrr never finds out why a daemon died, it only starts it again.

## Debrief

> **zebra:** FRR is started by its script, which starts watchfrr, which starts the rest and keeps them running. You'll hear watchfrr again whenever a daemon stops. Now you can talk to a running router. In The Router's Language, you learn to ask it questions without knowing the words.

## Real world

On a Linux router, systemd runs the same script for you:

```
cat /etc/frr/daemons             # which daemons start: ospfd=no, bgpd=no, …
sudo systemctl start frr         # runs frrinit.sh start
sudo /usr/lib/frr/frrinit.sh status
sudo vtysh -c "show daemons"
sudo vtysh -c "show watchfrr"
```
