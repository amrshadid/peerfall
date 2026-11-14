# Nobody Answers

**Question:** What is FRR, and who answers when you type into its console?

## Scene

> **zebra:** Linux moved the packets in The Dark Cable, but it can only follow routes. It can't ask other routers where an address is, so without help every route beyond a router's own cables is typed by hand, on every router. That is FRR's work: the routing software that runs on Linux. On router a, FRR isn't running. I'm talking to you from router b, where I still am.

## See it

> **zebra:** FRR has a console of its own, where you ask FRR questions and give it orders. Type `vtysh`.

---

```
a:~# vtysh
Exiting: failed to connect to any daemons.
```

> **zebra:** vtysh is only a console. It doesn't route anything itself: it passes your words to FRR's programs and prints their answers, and on a, none is running. FRR isn't one program but several _daemons_: programs that run in the background, without a window, each with one job. One knows the interfaces and talks to Linux. Another keeps the routes typed by hand. Each _routing protocol_, a set of rules routers follow to tell each other where addresses are, has one of its own. Look at FRR's files for a: `ls /etc/frr/a`.

---

```
a:~# ls /etc/frr/a
daemons     frr.conf    vtysh.conf
```

> **zebra:** `frr.conf` is a's configuration, which FRR reads when it starts. `daemons` lists the daemons a should run, and `vtysh.conf` is the console's own settings. On a router of its own these files sit in `/etc/frr`; here every router keeps a folder named after it. Everything is in place, and nobody has started anything. The programs themselves live in `/usr/lib/frr`, and one of them is me.

## Build it

> **zebra:** Start one daemon by hand: me. Type `/usr/lib/frr/zebra -d -N a`. `-d` sends me to the background. `-N a` names the router: here every router lives in one Linux computer, and the name keeps a's files apart from b's.

---

```
a:~# /usr/lib/frr/zebra -d -N a
2026/11/13 20:26:21 ZEBRA: [QBKSZ-0KHCW][EC 4043309138] Disabling MPLS support (no kernel support)
```

> **zebra:** That's me starting up, and the prompt came straight back because I went to the background. My one line is a warning, not an error: MPLS is a feature this Linux was built without, and nothing before stage 9 needs it. Now `vtysh` again.

---

```
a:~# vtysh

Hello, this is FRRouting (version 10.6.1).
Copyright 1996-2005 Kunihiro Ishiguro, et al.

a#
```

> **zebra:** A greeting, and a new _prompt_, the text that waits for your next command. `a:~#` was the shell's, where Linux commands run. `a#` is vtysh's: you are talking to FRR on a now, and only FRR's commands work here. Ask who answered: `show daemons`.

---

```
a# show daemons
 zebra
```

## Watch it

> **zebra:** One daemon: me. Will I see the same cables Linux showed you? Answer, then type `show interface brief`.
>
> - [x] yes, the same interfaces
> - no, FRR keeps interfaces of its own
> - none, until someone configures them

---

```
a# show interface brief
Interface       Status  VRF             Addresses
---------       ------  ---             ---------
a-b             up      default         10.0.1.1/30
                                        fe80::f4dc:a6ff:fe36:858f/64
a-c             up      default         10.0.2.1/30
                                        fe80::20ba:6cff:fee5:2fd9/64
lo              up      default         10.255.0.1/32

```

> **zebra:** The same. I don't make interfaces: I ask Linux for them and keep listening, so an interface switched off in Linux shows `down` here too. `Status` is up or down; `VRF default` means a's one routing table, until stage 8 gives a router several. The `fe80::` lines are IPv6 addresses Linux gives each interface by itself. Every router runs its own zebra, so now there are three of me: on a, on b and on c.

## Debrief

> **zebra:** FRR is daemons, and vtysh is how you talk to them. You started one by hand, and if it dies, nothing starts it again. In The Silent Router, you start FRR the way a real router does, and meet the daemon that watches the others.

## Real world

On a Linux router with FRR installed, the files are in `/etc/frr` and no `-N` is needed:

```
ls /usr/lib/frr          # FRR's daemons
ls /etc/frr              # frr.conf, daemons, vtysh.conf
sudo vtysh               # FRR's console; it needs the daemons running
show daemons
show interface brief
exit
```
