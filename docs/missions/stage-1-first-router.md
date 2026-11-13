# Stage 1: First Router

Mission specs for stage 1. Read [GAME.md](../GAME.md) for the story, the characters and the
vocabulary, [MISSIONS.md](../MISSIONS.md) for how a mission is built and checked, and
[concepts.md](concepts.md) for the concept chain.

**Who it's for:** someone who has never configured a router, never used FRR, and may not
know what an interface or a route is. Every word is explained the first time it appears,
next to the output that shows it, and every comparison with everyday life says where it
stops being true.

The stage is eight missions, about **2 hours 10 minutes**. It starts before FRR: what a
router is, as plain Linux shows it (1.1). Then FRR itself: its daemons and its console
(1.2), how it is started and kept running (1.3), how to ask it for help and where to stand
to change something (1.4), what it is doing now (1.5), what survives a restart (1.6), and
what happens when the saved file has a mistake (1.7). The capstone (1.8) brings a router up
from nothing with all of it.

| #   | Title                  | Id                       | Time    | The one new idea                                                        |
| --- | ---------------------- | ------------------------ | ------- | ----------------------------------------------------------------------- |
| 1.1 | The Dark Cable         | `the-dark-cable`         | ~15 min | a router is a computer with interfaces, and routes say which one to use |
| 1.2 | Nobody Answers         | `nobody-answers`         | ~15 min | FRR is a set of daemons, and vtysh is how you talk to them              |
| 1.3 | The Silent Router      | `the-silent-router`      | ~15 min | FRR is started by its script, and watchfrr keeps it running             |
| 1.4 | The Router's Language  | `the-routers-language`   | ~20 min | asking vtysh for help, and the mode a change is made in                 |
| 1.5 | What It Does Now       | `what-it-does-now`       | ~15 min | the running configuration                                               |
| 1.6 | Gone After the Restart | `gone-after-the-restart` | ~15 min | the saved configuration, and `write memory`                             |
| 1.7 | The Skipped Line       | `the-skipped-line`       | ~15 min | where FRR reports a mistake: the log, and checking a file               |
| 1.8 | A Router from Nothing  | `a-router-from-nothing`  | ~20 min | capstone: every step of the stage on one router                         |

Today's `the-silent-router` becomes 1.3 and `gone-after-the-restart` 1.6, both rewritten to
this spec; their ids stay.

**Where it leads:** stage 2, Follow a Packet, gives interfaces their addresses in FRR and
writes the routes a packet needs, there and back. Everything it types goes through the
vtysh, modes and saving this stage teaches.

## The network of stage 1

Every mission of the stage plays on the same three routers, so the player learns one place
well. Router a is the player's; b and c are its neighbours.

```
        10.0.1.0/30                10.0.2.0/30
  b ───────────────────── a ───────────────────── c
  b-a 10.0.1.2      a-b 10.0.1.1   a-c 10.0.2.1      c-a 10.0.2.2
                    lo 10.255.0.1/32
```

```yaml
routers:
  - name: a
    loopback: 10.255.0.1/32
    daemons: []
    startup: watchfrr # per mission: watchfrr or none
    config: "" # per mission
  - { name: b, daemons: [], config: "" }
  - { name: c, daemons: [], config: "" }
links:
  - ends: [{ router: a, address: 10.0.1.1/30 }, { router: b, address: 10.0.1.2/30 }]
  - ends: [{ router: a, address: 10.0.2.1/30 }, { router: c, address: 10.0.2.2/30 }]
```

Each mission below gives only a's `startup` and `config`.

## Facts about the Machine that stage 1 relies on

Seen on the Machine (FRR 10.6.1, Alpine 3.24, kernel `6.18.63-0-virt`), with the networks
above. Outputs in this file are copied from those runs. MAC addresses and `fe80::`
addresses are random per run; times and process numbers differ from run to run.

- **The terminal** is root's bash inside the selected router, prompt `a:~#`. In it, `vtysh`
  is already `vtysh -N a`. vtysh's prompts are `a#`, `a(config)#` and `a(config-if)#`.
- **`interface a-c` + `shutdown` in `frr.conf`** makes zebra hold `a-c` down: `ip -br link`
  shows `a-c@if2 DOWN … <BROADCAST,MULTICAST>`, and c's end shows `NO-CARRIER`. Linux can
  bring it up (`ip link set a-c up`) and zebra does not put it down again, but the running
  configuration still says `shutdown`, and an FRR restart puts `a-c` down again.
- **vtysh with nothing running** answers `Exiting: failed to connect to any daemons.` and
  exits with status 1.
- **zebra by hand:** `/usr/lib/frr/zebra -d -N a` prints
  `ZEBRA: [QBKSZ-0KHCW][EC 4043309138] Disabling MPLS support (no kernel support)` and runs;
  `vtysh` then reaches it and `show daemons` answers ` zebra`. Without `-N a`
  (`/usr/lib/frr/zebra -d`) it runs too, but `vtysh` (which is `vtysh -N a`) still answers
  `Exiting: failed to connect to any daemons.`
- **The init script:** `/usr/lib/frr/frrinit.sh start a` starts watchfrr, which starts
  mgmtd, zebra and staticd and has `frr.conf` read in; `status a` lists all four. Started
  without the name (`/usr/lib/frr/frrinit.sh start`), it starts an FRR with no name that
  `vtysh -N a` does not reach.
- **watchfrr speaks in the terminal.** Its messages go to the console, which is the
  player's terminal: `watchfrr[594]: [HD38Q-0HBRT][EC 268435457] staticd state -> down :
  read returned EOF` after `pkill staticd`, and
  `watchfrr[571]: [WFP93-1D146] configuration write completed with exit code 0` after
  `write memory`. A killed staticd answered vtysh again after 6.7 s in one run and 7.7 s in
  another.
- **`ps` is crowded.** All routers share one Linux, so `ps` lists b's and c's daemons too,
  and the Machine's own log readers (`tail -n +1 -F /var/log/frr/a.log`, `awk …`,
  `ip -o -ts monitor route`). Missions use `frrinit.sh status a` and `show daemons`
  instead.
- **`show startup-config` prints nothing** on the Machine. Missions read the saved file
  with `cat /etc/frr/a/frr.conf`.
- **`write memory`** prints `Note: this version of vtysh never writes vtysh.conf`, then
  `Building Configuration...`, `Integrated configuration saved to /etc/frr/a/frr.conf`,
  `[OK]`, and keeps the old file as `frr.conf.sav`.
- **A bad line in `frr.conf`** is skipped at start and the rest is applied. The log file
  says nothing about it; watchfrr prints
  `restart all process 628 exited with non-zero status 2` on a restart; `vtysh -C -f
  /etc/frr/a/frr.conf` prints `line 7: % Unknown command[21]:  descripton link to router c`.
- **The log** is `/var/log/frr/a.log` (the Machine writes `log file` into `frr.conf`);
  `show logging` names it for mgmtd, zebra and staticd. watchfrr logs to syslog, not to
  that file.
- **No `frr-reload`:** the image has no Python;
  `/usr/lib/frr/frrinit.sh reload a` prints
  `The frr-pythontools package is required for reload functionality.`
- **No `man`:** `man vtysh` prints `bash: man: command not found`. `vtysh --help` works.

**Not seen on the Machine:** what the browser terminal shows during the network's setup
(watchfrr's start lines may reach the console before the player's first prompt), and Tab
pressed twice on an empty vtysh line (the spike's terminal showed nothing).

---

## 1.1 — The Dark Cable

- **Id:** `the-dark-cable` · **Guide:** zebra · **Time:** ~15 min · **Prerequisites:** none
- **Question:** What is a router, and why can't router a reach router c?
- **The one new idea:** a router is a computer with interfaces, and a route tells it which
  interface a packet leaves by.
- **Teaches:** `router`, `interface`, `route` · **Names:** `ip-address`, `prefix`,
  `connected-route`, `frr-daemon`, `zebra`, `interface-shutdown`, `peer` · **Uses:** none

No FRR yet: the player meets a router through plain Linux, with three `ip` commands and
`ping`. The cable to c is dark because FRR's configuration on a says `shutdown`, which
1.4 reveals; here the player switches it on from Linux.

### Network

a: `startup: watchfrr`, `config: "interface a-c\n shutdown\n!\n"`.

### Objectives

| Id          | Text                                                                     | Check                                                                               |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `cable-lit` | Switch on a's interface to c, so that a's kernel has a route through it. | `{ kind: route, router: a, prefix: 10.0.2.0/30, protocol: kernel, interface: a-c }` |
| `reaches-c` | Send packets from a to c's address, 10.0.2.2, and see them answered.     | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                          |

### Hints

1. **Nudge:** "Each chip is a command. Run `ip -br link` and read the second column for
   each interface."
2. **The idea:** "An interface that is `DOWN` sends nothing, and Linux adds a route for an
   interface's network only while the interface is up."
3. **The spot:** "Switch on the interface named `a-c`." Command: `ip link set a-c up`

### Chips

| Command              | Explain                                      |
| -------------------- | -------------------------------------------- |
| `ip -br link`        | list a's interfaces and whether each is up   |
| `ip -br addr`        | list a's interfaces with their addresses     |
| `ip route`           | show a's routing table                       |
| `ping -c 3 10.0.1.2` | send three packets to b and wait for answers |
| `ping -c 3 10.0.2.2` | send three packets to c and wait for answers |
| `ip link set a-c up` | switch on the interface a-c                  |

### Predict

"Before you look: what will `ip route` show now?" — the same single line / **a second line,
for c's network, through `a-c`** / a line for every address. Seen: the second line
`10.0.2.0/30 dev a-c proto kernel scope link src 10.0.2.1` appears as soon as `a-c` is up.

### Codex (chapter: First Router)

- **A router** (`router`)
  - **Simple:** A computer that passes packets from one network to another. Router a is a
    Linux computer with three interfaces.
  - **Deep:** A packet carries a source and a destination address. A router reads the
    destination, looks it up in its routing table and sends the packet out of the
    interface the route names, usually to another router. Any Linux computer forwards
    packets once `net.ipv4.ip_forward` is 1, as on every router of the Machine; routing
    software such as FRR decides which routes the table holds.
  - **Sources:** `zebra/rt_netlink.c` · **Docs:** https://docs.frrouting.org/en/latest/introduction.html
  - **Try it:** `sysctl net.ipv4.ip_forward`
- **An interface** (`interface`)
  - **Simple:** One of a router's connections to a network. `a-c` is a's end of the cable
    to c; it is up or down.
  - **Deep:** Linux names each interface and keeps its state. `UP` in `ip -br link` means
    switched on and connected; `DOWN` with no `UP` flag means switched off; `NO-CARRIER`,
    as on c's end of a dark cable, means switched on with nothing alive at the other end.
    `lo`, the loopback, is the router's own interface with no cable. On the Machine every
    cable is a veth pair, two interfaces joined back to back.
  - **Sources:** `zebra/interface.c`, `zebra/if_netlink.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `ip -br link`
- **A route** (`route`)
  - **Simple:** One line of a routing table: packets for this network leave by this
    interface. `ip route` shows a's.
  - **Deep:** Linux looks up every packet's destination in its routing table and uses the
    most specific line that covers it. With no line, it refuses to send:
    `ping: connect: Network unreachable`. A route `proto kernel` was added by Linux itself
    for the network of an interface's address, the moment the interface came up. Stage 2
    writes routes by hand and follows them from FRR into Linux.
  - **Sources:** `zebra/rt_netlink.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `ip route get 10.0.2.2`

### Hand-off

"Linux did all of this by itself. So what am I for? In Nobody Answers, you meet FRR."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # The cable that already works: nothing changes.
  - id: wrong-cable
    passes: false
    changes:
      - router: a
        shell: [ip link set a-b up]
  - id: lit
    passes: true
    changes:
      - router: a
        shell: [ip link set a-c up]
```

### story.md

Word counts (prose words split at spaces, code blocks and Real world left out): Scene 63,
See it 197, Build it 131, Watch it 100, Debrief 36, story 527.

````markdown
# The Dark Cable

**Question:** What is a router, and why can't router a reach router c?

## Scene

The pager goes off after midnight. Every router in the network has lost its peers, the routers it talks to. The cables still carry light, and nothing gets across.

> **zebra:** You're the engineer on call? Good. I'm zebra, and I live on these routers. We start with one: router a, and its neighbours b and c. a reaches b. It can't reach c.

## See it

> **zebra:** A _router_ is a computer that passes packets from one network to another. A _packet_ is a small piece of data with an address on it. Router a is a Linux computer, so ask Linux for its interfaces: type `ip -br link`.

---

```
a:~# ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP>
a-b@if2          UP             e2:ea:2f:4e:c8:95 <BROADCAST,MULTICAST,UP,LOWER_UP>
a-c@if2          DOWN           1a:25:30:21:70:75 <BROADCAST,MULTICAST>
```

> **zebra:** Each line is an _interface_: one of a's connections to a network. `a-b` is a's end of the cable to b, `a-c` its end of the cable to c. `@if2` numbers the other end. `lo`, the loopback, is a's own interface, with no cable at all, so its state is `UNKNOWN`.

> **zebra:** The second column is the state. `a-b` is `UP`: switched on, and the flags at the end say so twice, `UP` for switched on and `LOWER_UP` for a live cable. `a-c` is `DOWN`, and neither flag is there: it is switched off, and nothing leaves through it.

> **zebra:** Now ask for the addresses: `ip -br addr`.

---

```
a:~# ip -br addr
lo               UNKNOWN        127.0.0.1/8 10.255.0.1/32 ::1/128
a-b@if2          UP             10.0.1.1/30 fe80::e0ea:2fff:fe4e:c895/64
a-c@if2          DOWN           10.0.2.1/30
```

> **zebra:** An address names an interface, the way a house number names a door, except that one router has an address on every cable. a is `10.0.1.1` towards b and `10.0.2.1` towards c. The `/30` and the long `fe80::` ones can wait for stage 2.

## Build it

> **zebra:** Try b first. `ping -c 3 10.0.1.2` sends three packets to b's address and waits for answers.

---

```
a:~# ping -c 3 10.0.1.2
PING 10.0.1.2 (10.0.1.2) 56(84) bytes of data.
64 bytes from 10.0.1.2: icmp_seq=1 ttl=64 time=4.20 ms
64 bytes from 10.0.1.2: icmp_seq=2 ttl=64 time=0.423 ms
64 bytes from 10.0.1.2: icmp_seq=3 ttl=64 time=0.379 ms

--- 10.0.1.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2006ms
rtt min/avg/max/mdev = 0.379/1.666/4.197/1.789 ms
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
> - a line for every address in the network

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
64 bytes from 10.0.2.2: icmp_seq=1 ttl=64 time=3.11 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=64 time=0.405 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=64 time=0.413 ms

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2008ms
rtt min/avg/max/mdev = 0.405/1.310/3.112/1.274 ms
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
````

---

## 1.2 — Nobody Answers

- **Id:** `nobody-answers` · **Guide:** zebra (speaking from b) · **Time:** ~15 min ·
  **Prerequisites:** `the-dark-cable`
- **Question:** What is FRR, and who answers when you type into its console?
- **The one new idea:** FRR is a set of daemons, each a program with one job, and vtysh is
  the console that talks to the ones that run.
- **Teaches:** `frr-daemon`, `zebra`, `vtysh` · **Names:** `pathspace`, `saved-config`,
  `daemons-file`, `frr-init-script` · **Uses:** `router`, `interface`

The player starts one daemon by hand, zebra, and talks to it. Starting daemons one by one
is not how a router is run; 1.3 shows the proper way, and this mission's debrief says so.

### Network

a: `startup: none`, `config: ""`. Both cables are up (nothing of FRR runs to hold one down).

### Objectives

| Id              | Text                                               | Check                                            |
| --------------- | -------------------------------------------------- | ------------------------------------------------ |
| `zebra-answers` | Start zebra on router a, so that vtysh reaches it. | `{ kind: daemons, router: a, daemons: [zebra] }` |

### Hints

1. **Nudge:** "Type `vtysh` and read what it answers. Who is it trying to reach?"
2. **The idea:** "FRR's daemons are programs in `/usr/lib/frr`. A daemon started with `-d`
   runs in the background, and `-N a` tells it which router it belongs to."
3. **The spot:** "Start the daemon named zebra, for router a." Command:
   `/usr/lib/frr/zebra -d -N a`

### Chips

| Command                      | Explain                                     |
| ---------------------------- | ------------------------------------------- |
| `vtysh`                      | open FRR's console on this router           |
| `ls /etc/frr/a`              | list FRR's files for router a               |
| `/usr/lib/frr/zebra -d -N a` | start zebra in the background, for router a |
| `show daemons`               | in vtysh: list the daemons that answered    |
| `show interface brief`       | in vtysh: list the interfaces FRR knows     |
| `exit`                       | leave vtysh, back to the shell              |

### Predict

"Will FRR see the same cables Linux showed you?" — **yes, the same interfaces and
addresses** / no, FRR keeps its own / none, until you configure them. Seen:
`show interface brief` lists `a-b`, `a-c` and `lo` with the addresses `ip -br addr` showed.

### Codex (chapter: First Router)

- **FRR and its daemons** (`frr-daemon`)
  - **Simple:** FRR is routing software made of daemons: background programs with one job
    each. zebra, mgmtd and staticd always run.
  - **Deep:** Each routing protocol is a daemon of its own (ospfd, bgpd, bfdd), and all of
    them talk to zebra, which talks to the Linux kernel. One daemon can stop and start
    without the others. FRR's programs live in `/usr/lib/frr` on the Machine; its files
    for router a in `/etc/frr/a`: `frr.conf`, `daemons`, `vtysh.conf`.
  - **Sources:** `lib/libfrr.c`, `zebra/main.c` · **Docs:** https://docs.frrouting.org/en/latest/introduction.html
  - **Try it:** `ls /usr/lib/frr`
- **zebra** (`zebra`)
  - **Simple:** FRR's core daemon. It learns the interfaces from Linux and hands routes to
    the kernel. Every router runs its own.
  - **Deep:** zebra asks the kernel for every interface and address over netlink, and keeps
    listening, so FRR sees a change as soon as Linux makes it. Every other daemon connects
    to zebra to offer routes; zebra picks the best for each network and installs it in the
    kernel. Started by hand it prints
    `Disabling MPLS support (no kernel support)` on the Machine: the kernel lacks MPLS,
    which stage 9 needs.
  - **Sources:** `zebra/main.c`, `zebra/if_netlink.c`, `zebra/zebra_mpls.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show interface brief"`
- **vtysh** (`vtysh`)
  - **Simple:** FRR's console. It passes what you type to the running daemons; with none
    running it has nobody to talk to.
  - **Deep:** vtysh connects to each daemon's socket and merges their answers into one
    console. With none it prints `Exiting: failed to connect to any daemons.` and exits
    with status 1. `vtysh -c "<command>"` runs one command and returns to the shell.
    `show daemons` names the daemons that answered.
  - **Sources:** `vtysh/vtysh_main.c`, `vtysh/vtysh.c` · **Docs:** https://docs.frrouting.org/en/latest/vtysh.html
  - **Try it:** `vtysh -c "show version"`
- **One Machine, many routers** (`pathspace`)
  - **Simple:** Every router here lives in one Linux computer. FRR's `-N a` keeps a's
    daemons, sockets and files apart from b's.
  - **Deep:** Each router is a Linux network namespace: its own interfaces and routing
    table inside one kernel. FRR's `-N`, its pathspace, puts the router's name into every
    path: `/etc/frr/a`, `/run/frr/a`. On a router that is a computer of its own you leave
    `-N` out and the files are in `/etc/frr`. In the game's terminal `vtysh` already means
    `vtysh -N a`.
  - **Sources:** `lib/libfrr.c` · **Docs:** https://docs.frrouting.org/en/latest/setup.html
  - **Try it:** `ls /run/frr/a`

### Hand-off

"You started one daemon by hand, and if it dies, nothing starts it again. In The Silent
Router, you start FRR the way a real router does, and meet the daemon that watches the
others."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Started without the router's name: zebra runs, and vtysh -N a cannot reach it.
  - id: zebra-without-name
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/zebra -d]
  - id: zebra-by-hand
    passes: true
    changes:
      - router: a
        shell: [/usr/lib/frr/zebra -d -N a]
  # FRR's script also starts zebra: the outcome is the same.
  - id: init-script
    passes: true
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start a]
```

### story.md

Word counts (prose words split at spaces, code blocks and Real world left out): Scene 64,
See it 166, Build it 130, Watch it 108, Debrief 46, story 514.

````markdown
# Nobody Answers

**Question:** What is FRR, and who answers when you type into its console?

## Scene

> **zebra:** Linux moved the packets in The Dark Cable, but it can only follow routes. It can't ask other routers where an address is, so without help every route is typed by hand, on every router. That is FRR's work: the routing software that runs on Linux. On router a, FRR isn't running. I'm talking to you from router b, where I still am.

## See it

> **zebra:** FRR has a console of its own, called `vtysh`, where you ask FRR questions and give it orders. Type it.

---

```
a:~# vtysh
Exiting: failed to connect to any daemons.
```

> **zebra:** vtysh is only a console. It doesn't route anything itself: it passes your words to FRR's programs and prints their answers, and on a, none is running. FRR isn't one program but several _daemons_: programs that run in the background, without a window, each with one job. One knows the interfaces and talks to Linux. Another keeps the routes typed by hand. Each routing protocol has one of its own. Look at FRR's files for a: `ls /etc/frr/a`.

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
2026/11/13 19:54:55 ZEBRA: [QBKSZ-0KHCW][EC 4043309138] Disabling MPLS support (no kernel support)
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

> **zebra:** One daemon: me. Will I see the same cables Linux showed you?
>
> - [x] yes, the same interfaces and addresses
> - no, FRR keeps interfaces of its own
> - none, until someone configures them

---

```
a# show interface brief
Interface       Status  VRF             Addresses
---------       ------  ---             ---------
a-b             up      default         10.0.1.1/30
                                        fe80::6cfb:9cff:fef2:3331/64
a-c             up      default         10.0.2.1/30
                                        fe80::909f:63ff:fec4:b9f9/64
lo              up      default         10.255.0.1/32
```

> **zebra:** The same. I don't make interfaces: I ask Linux for them and keep listening, so a cable switched on in Linux shows up here too. `Status` is up or down; `VRF default` means a's one routing table, until stage 8 gives a router several. The `fe80::` lines are IPv6 addresses Linux gives each cable by itself. Every router runs its own zebra, so now there are two of me, one on b and one on a.

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
````

---

## 1.3 — The Silent Router

- **Id:** `the-silent-router` · **Guide:** zebra, then watchfrr · **Time:** ~15 min ·
  **Prerequisites:** `nobody-answers`
- **Question:** How is FRR started on a real router, and who keeps it running?
- **The one new idea:** FRR is started by its own script, which starts watchfrr, and
  watchfrr starts the other daemons and starts one again when it dies.
- **Teaches:** `watchfrr`, `frr-init-script`, `daemons-file` · **Names:** `mgmtd`,
  `staticd` · **Uses:** `frr-daemon`, `zebra`, `vtysh`

Today's 1.1 rewritten. watchfrr speaks for the first time, and its first words are its own
log lines in the terminal.

### Network

a: `startup: none`, `config: ""`.

### Objectives

| Id                 | Text                                                                    | Check                                                            |
| ------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `daemons-answer`   | Start FRR on router a, so that zebra, mgmtd and staticd run and answer. | `{ kind: daemons, router: a, daemons: [zebra, mgmtd, staticd] }` |
| `watchfrr-watches` | Have watchfrr running beside them.                                      | `{ kind: daemons, router: a, daemons: [watchfrr] }`              |

### Hints

1. **Nudge:** "Read `/etc/frr/a/daemons`, then ask FRR's own script what runs:
   `/usr/lib/frr/frrinit.sh status a`."
2. **The idea:** "The script that reports the status also starts FRR. It starts watchfrr
   first, and watchfrr starts the rest. Its last word is the router's name."
3. **The spot:** "Start FRR on a with its script." Command:
   `/usr/lib/frr/frrinit.sh start a`

### Chips

| Command                            | Explain                                          |
| ---------------------------------- | ------------------------------------------------ |
| `cat /etc/frr/a/daemons`           | show which daemons router a should run           |
| `/usr/lib/frr/frrinit.sh status a` | ask FRR's script which daemons run on a          |
| `/usr/lib/frr/frrinit.sh start a`  | start FRR on a, the way a router starts it       |
| `vtysh -c "show daemons"`          | run one vtysh command: the daemons that answered |
| `vtysh -c "show watchfrr"`         | ask watchfrr what it watches                     |
| `pkill staticd`                    | stop the daemon staticd                          |

### Predict

"`pkill staticd` ends staticd. What happens next?" — staticd stays gone until you start it
/ **watchfrr starts it again by itself** / FRR stops altogether. Seen: watchfrr prints
`staticd state -> down : read returned EOF`, `show daemons` answers ` mgmtd zebra watchfrr`,
and seconds later ` mgmtd zebra staticd watchfrr` (6.7 s in the run shown).

### Codex (chapter: First Router)

- **watchfrr** (`watchfrr`, deepens: `frr-daemon`)
  - **Simple:** FRR's watchdog. It starts the other daemons and starts one again when it
    dies.
  - **Deep:** watchfrr keeps a connection open to every daemon it was given. When one
    closes (`read returned EOF`) it runs its restart command,
    `/usr/lib/frr/watchfrr.sh restart %s`, as `show watchfrr` lists. It waits at least
    `Min Restart Interval: 60` seconds before restarting the same daemon again, and it is
    also the one that has `frr.conf` read in after a start. It logs to syslog, which on the
    Machine is the terminal.
  - **Sources:** `watchfrr/watchfrr.c`, `watchfrr/watchfrr_vty.c` · **Docs:** https://docs.frrouting.org/en/latest/watchfrr.html
  - **Try it:** `vtysh -c "show watchfrr"`
- **FRR's init script** (`frr-init-script`)
  - **Simple:** `frrinit.sh` starts, stops, restarts and reports FRR on a router: `start a`,
    `restart a`, `status a`.
  - **Deep:** The script reads the router's `daemons` file, starts watchfrr with the list of
    daemons, and watchfrr does the rest. `restart` stops everything and starts it again
    from `frr.conf`. Its last word is a pathspace: left out on the Machine, it starts an FRR
    with no name that `vtysh -N a` cannot reach. With systemd, `systemctl start frr` runs
    the same script.
  - **Sources:** `tools/frrinit.sh.in`, `tools/frrcommon.sh.in` · **Docs:** https://docs.frrouting.org/en/latest/setup.html
  - **Try it:** `/usr/lib/frr/frrinit.sh status a`
- **The daemons file** (`daemons-file`)
  - **Simple:** A list of FRR's protocol daemons with `yes` or `no` beside each: which ones
    this router starts.
  - **Deep:** zebra, mgmtd and staticd always start; the file switches on the protocols:
    `ospfd=yes`, `bgpd=yes`. On the Machine each router's file lists the daemons a mission
    may use; on an installed router `/etc/frr/daemons` lists them all, with other settings
    for each daemon. A change takes effect at the next start.
  - **Sources:** `tools/frrcommon.sh.in` · **Docs:** https://docs.frrouting.org/en/latest/setup.html
  - **Try it:** `cat /etc/frr/a/daemons`

### Hand-off

"Now you can talk to a running router. In The Router's Language, you learn to ask it
questions without knowing the words."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # One daemon by hand: vtysh answers, and FRR is not whole.
  - id: zebra-by-hand
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/zebra -d -N a]
  # Every daemon by hand: they answer, and nothing watches them.
  - id: daemons-by-hand
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/zebra -d -N a, /usr/lib/frr/mgmtd -d -N a, /usr/lib/frr/staticd -d -N a]
  # The script without the router's name: an FRR runs that vtysh -N a cannot reach.
  - id: init-script-without-name
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start]
  - id: init-script
    passes: true
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start a]
```

### story.md

Word counts (prose words split at spaces, code blocks and Real world left out): Scene 62,
See it 151, Build it 124, Watch it 118, Debrief 48, story 503. The `content:report` counts
may differ by a few words; trim or add in See it, which has the most room.

````markdown
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

> **zebra:** The same script starts FRR: `/usr/lib/frr/frrinit.sh start a`. `start` is the word that matters; the script also knows `stop`, `restart` and `status`. Its last word is the router's name again, as `-N a` was for zebra.

---

```
a:~# /usr/lib/frr/frrinit.sh start a
Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'
watchfrr[594]: [T83RR-8SM5G] watchfrr 10.6.1 starting: vty@0
watchfrr[594]: [ZCJ3S-SPH5S] mgmtd state -> down : initial connection attempt failed
watchfrr[594]: [ZCJ3S-SPH5S] zebra state -> down : initial connection attempt failed
watchfrr[594]: [ZCJ3S-SPH5S] staticd state -> down : initial connection attempt failed
watchfrr[594]: [YFT0P-5Q5YX] Forked background command [pid 595]: /usr/lib/frr/watchfrr.sh restart all
watchfrr[594]: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:00
watchfrr[594]: [QDG3Y-BY5TN] mgmtd state -> up : connect succeeded
watchfrr[594]: [QDG3Y-BY5TN] zebra state -> up : connect succeeded
watchfrr[594]: [QDG3Y-BY5TN] staticd state -> up : connect succeeded
watchfrr[594]: [KWE5Q-QNGFC] all daemons up, doing startup-complete notify
Started watchfrr
```

> **watchfrr:** That's me talking, line by line. `state -> down : initial connection attempt failed`: I knocked on each daemon and nobody was there. `Forked background command … restart all`: so I started them. `Configuration Read in`: I had `frr.conf` read into them. `state -> up : connect succeeded`: all three answered.
>
> **zebra:** Check from vtysh. `vtysh -c "show daemons"` runs one command and comes back to the shell.

---

```
a:~# vtysh -c "show daemons"
 mgmtd zebra staticd watchfrr
```

> **zebra:** Four names: the three from the comment, and watchfrr itself, which answers vtysh like any daemon. That's how `show watchfrr` reaches it.

## Watch it

> **watchfrr:** Go on, stop one. `pkill staticd` ends staticd. What happens next?
>
> - staticd stays gone until you start it
> - [x] watchfrr starts it again by itself
> - FRR stops altogether

---

```
a:~# pkill staticd
watchfrr[594]: [HD38Q-0HBRT][EC 268435457] staticd state -> down : read returned EOF
a:~# vtysh -c "show daemons"
 mgmtd zebra watchfrr
```

> **watchfrr:** "read returned EOF": staticd hung up on me. Ask again in a few seconds.

---

```
a:~# vtysh -c "show daemons"
 mgmtd zebra staticd watchfrr
```

> **zebra:** Back, and nobody typed a thing: here it took under seven seconds. watchfrr is a _watchdog_. It keeps a line open to every daemon, and when one goes silent it runs its restart command. Think of a night guard on rounds who finds a light out and switches it back on. The guard stops being the right picture at the cause: watchfrr never finds out why a daemon died, it only starts it again.

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
````

---

## 1.4 — The Router's Language

- **Id:** `the-routers-language` · **Guide:** zebra · **Time:** ~20 min · **Prerequisites:**
  `the-silent-router`
- **Question:** How do you ask FRR for help, and where do you have to be to change something?
- **The one new idea:** vtysh tells you its own words (`?`, Tab, abbreviations), and every
  change is made in a mode: exec, configure, then the interface itself.
- **Teaches:** `cli-help`, `cli-modes`, `interface-shutdown` · **Names:** `running-config` ·
  **Uses:** `vtysh`, `interface`, `route`

The cable to c is dark again: the same state as 1.1. This time the player finds out who
keeps it down (FRR's own configuration says `shutdown`) and switches it on in FRR. A player
who switches it on from Linux, as in 1.1, also meets the objectives: they are judged by
outcome. The Watch it shows why the FRR way is the one that lasts (1.6 and 1.8 build on it).

### Network

a: `startup: watchfrr`, `config: "interface a-c\n shutdown\n!\n"`.

### Beats

- **Scene.** zebra: "Remember the dark cable? FRR was restarted, and it is dark again.
  Something on a keeps putting it out. Ask FRR, even if you don't know the words yet."
- **See it.** `vtysh`, then `?` at `a#`: vtysh lists every command it knows here, each with a
  line of help (`configure  Configuration from vty interface`, `show  Show running system
  information`, … `write  Write running configuration to memory, network, or terminal`).
  Then `show ?` (48 words, from `babel` to `zebra`), then `show i?`:

  ```
  a# show i
    interface  Interface status and configuration
    ip         IP information
    ipv6       IPv6 Information
    isis       IS-IS routing protocol
  ```

  Tab: `sh` + Tab completes to `show `, `show int` + Tab to `show interface `. Short words
  are enough when they are not ambiguous: `sh int br` prints the same as
  `show interface brief`, with `a-c  down`. A misspelt word is refused:
  `% Unknown command: show interfaces brief`. `show interface a-c` says why it is down:
  `Shutdown config is Enabled by CLI`.
- **Build it.** At `a#`, `no shutdown` is refused: `% Unknown command: no shutdown`. A
  change needs a mode. `configure terminal` → `a(config)#` (`?` here lists configuration
  commands, `interface  Select an interface to configure` among them); `no shutdown` is
  still refused there. `interface a-c` → `a(config-if)#`; `?` now lists
  `shutdown     Shutdown the selected interface`; `sh?` shows only `shutdown`.
  `no shutdown`. In this mode `show interface brief` is refused; `do show interface brief`
  runs it from where you stand and shows `a-c  up`. `end` returns to `a#`; `exit` goes back
  one mode at a time.
- **Watch it.** Predict below, then `exit` vtysh, `ip -br link` (`a-c@if2 UP`), `ip route`
  (the second line from 1.1), `ping -c 3 10.0.2.2` (three answers).
- **Debrief.** "vtysh tells you its words when you ask, and a change is made where it
  belongs: in the interface's own mode. FRR is running with your change now. Where can you
  read everything it is doing? In What It Does Now."

### Objectives

| Id          | Text                                                                     | Check                                                                               |
| ----------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `cable-lit` | Switch a's interface to c back on, so that a's kernel routes through it. | `{ kind: route, router: a, prefix: 10.0.2.0/30, protocol: kernel, interface: a-c }` |
| `reaches-c` | Reach c's address, 10.0.2.2, from a.                                     | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                          |

### Hints

1. **Nudge:** "In vtysh, `show interface a-c` says why the interface is down. Read the line
   that starts with `Shutdown`."
2. **The idea:** "A change is typed in the mode it belongs to. An interface's settings are
   changed inside that interface: `configure terminal`, then `interface a-c`. Type `?`
   there to see what you can say."
3. **The spot:** "In `a(config-if)#`, undo the shutdown." Command: `no shutdown`

### Chips

From this mission on, a chip shows a command without its arguments.

| Command              | Explain                                                |
| -------------------- | ------------------------------------------------------ |
| `?`                  | in vtysh: list the words that can come next, with help |
| `show interface`     | in vtysh: an interface's state; add `brief` for all    |
| `configure terminal` | in vtysh: enter configure mode                         |
| `interface`          | in configure mode: enter one interface's mode          |
| `no`                 | undo a setting: `no` before the setting's own words    |
| `do`                 | run an exec command, such as a `show`, from any mode   |
| `end`                | back to `a#` from any mode                             |

### Predict

"You type `no shutdown` at `a#`. What does vtysh do?" — switches the interface on / **refuses
it** / asks which interface. Seen: `% Unknown command: no shutdown`. And at the end of Watch
it: "FRR is restarted now. Does `a-c` stay up?" — this is shown only in 1.6, where the
change is saved; here the Guide says that a restart starts from `frr.conf`, which still
says `shutdown` (`cat /etc/frr/a/frr.conf` shows it).

### Codex (chapter: First Router)

- **Asking vtysh** (`cli-help`, deepens: `vtysh`)
  - **Simple:** `?` lists what can come next, Tab finishes a word, and a short word works
    when only one command starts with it.
  - **Deep:** vtysh matches each word against a tree of commands. `?` prints the words
    possible at that point, each with its help line, and leaves your line as it was. Tab
    completes a word when one choice fits. `sh int br` is `show interface brief`. A line
    that matches nothing gets `% Unknown command:`, one that stops too early
    `% Command incomplete:`.
  - **Sources:** `lib/command.c`, `vtysh/vtysh.c` · **Docs:** https://docs.frrouting.org/en/latest/basic.html
  - **Try it:** `vtysh`, then `show ?`
- **Modes** (`cli-modes`)
  - **Simple:** Where vtysh is: `a#` to look, `a(config)#` to change the router, and
    `a(config-if)#` to change one interface.
  - **Deep:** `configure terminal` enters configure mode; `interface a-c` enters that
    interface's mode. Each mode knows its own commands, which is why `no shutdown` is
    unknown at `a#`. `exit` goes back one mode, `end` straight to `a#`, and `do` runs an
    exec command such as `do show interface brief` from any mode.
  - **Sources:** `lib/command.c`, `vtysh/vtysh.c` · **Docs:** https://docs.frrouting.org/en/latest/basic.html
  - **Try it:** `configure terminal`, then `?`
- **shutdown** (`interface-shutdown`, deepens: `interface`)
  - **Simple:** An interface setting in FRR: zebra keeps the interface down while the
    configuration says `shutdown`. `no shutdown` undoes it.
  - **Deep:** `show interface a-c` reports it as `Shutdown config is Enabled by CLI`.
    zebra applies it when the configuration is read, so a restart from a `frr.conf` that
    says `shutdown` takes the interface down again, even after Linux brought it up with
    `ip link set a-c up`.
  - **Sources:** `zebra/interface.c`, `zebra/zebra_cli.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show interface a-c"`

### Hand-off

"FRR is running with your change. Where can you read everything it is doing? In What It
Does Now."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Typed where it doesn't belong: refused at a# and at a(config)#.
  - id: wrong-mode
    passes: false
    changes:
      - router: a
        lines: [no shutdown, configure terminal, no shutdown]
  - id: no-shutdown
    passes: true
    changes:
      - router: a
        lines: [configure terminal, interface a-c, no shutdown]
  # Abbreviated: the same commands.
  - id: abbreviated
    passes: true
    changes:
      - router: a
        lines: [conf t, int a-c, no shut]
  # Switched on from Linux, as in The Dark Cable: judged by outcome, it passes.
  - id: from-linux
    passes: true
    changes:
      - router: a
        shell: [ip link set a-c up]
```

---

## 1.5 — What It Does Now

- **Id:** `what-it-does-now` · **Guide:** zebra · **Time:** ~15 min · **Prerequisites:**
  `the-routers-language`
- **Question:** Where can you read everything FRR is doing right now?
- **The one new idea:** the running configuration: every setting the daemons hold now, in
  one text, changed the moment you type.
- **Teaches:** `running-config`, `interface-description` · **Names:** `saved-config` ·
  **Uses:** `vtysh`, `cli-modes`, `cli-help`, `interface`

### Network

a: `startup: watchfrr`, `config: ""`.

### Beats

- **Scene.** zebra: "The next engineer on call won't know what a's cables are for. Label
  them, and learn where FRR keeps what it is doing."
- **See it.** `show running-config` on a fresh router:

  ```
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
  end
  ```

  Line by line: the version, FRR's defaults, the router's name, where it logs (1.7), and
  `service integrated-vtysh-config`, which keeps every daemon's settings in one file. `!`
  separates blocks. Nothing about interfaces yet: a setting appears only when it differs
  from the default.
- **Build it.** `configure terminal`, then `description link to router c` is refused at
  `a(config)#` (`% Unknown command: description link to router c`): a description belongs to
  an interface. `interface a-c`, `description link to router c`, `end`.
- **Watch it.** Predict below. `show running-config` now holds
  `interface a-c` / ` description link to router c` / `exit`. `show interface description`:

  ```
  Interface       Status  Protocol  Description
  a-b             up      up
  a-c             up      up        link to router c
  lo              up      up
  ```

  Then `cat /etc/frr/a/frr.conf`: the file has no `interface a-c` block. The running
  configuration changed; the file did not.
- **Debrief.** "The running configuration is what FRR does now, and it changes as you type.
  The file didn't change. What happens to your label when FRR restarts? In Gone After the
  Restart."

### Objectives

| Id         | Text                                   | Check                                                                                     |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `labelled` | Give a's interface to c a description. | `{ kind: config, router: a, source: running, block: [interface a-c], line: description }` |

### Hints

1. **Nudge:** "`show running-config` prints everything FRR is doing now. Read it before and
   after you change something."
2. **The idea:** "A description is a setting of one interface, so it is typed in that
   interface's mode, after `configure terminal`."
3. **The spot:** "In `a(config-if)#` for `a-c`, give it any words you like." Command:
   `description link to router c`

### Chips

| Command                      | Explain                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `show running-config`        | everything FRR is doing now, as configuration            |
| `show interface description` | every interface with its description                     |
| `description`                | in interface mode: label the interface                   |
| `cat`                        | at the shell: show a file, such as `/etc/frr/a/frr.conf` |

### Predict

"You gave `a-c` a description. Is it in `/etc/frr/a/frr.conf` now?" — yes, FRR wrote it
there / **no, the file is unchanged** / only after `end`. Seen: the file still holds only
the Machine's five lines and `!`.

### Codex (chapter: First Router)

- **The running configuration** (`running-config`)
  - **Simple:** Every setting FRR's daemons hold now, as text. `show running-config` prints
    it; each change you type is in it at once.
  - **Deep:** vtysh asks each daemon for its part and prints them as one configuration,
    in the same language you type. Only settings that differ from the defaults appear.
    It lives in the daemons' memory: a restart loses whatever was never saved. `write
    terminal` prints the same text.
  - **Sources:** `vtysh/vtysh_config.c`, `lib/command.c` · **Docs:** https://docs.frrouting.org/en/latest/basic.html
  - **Try it:** `vtysh -c "show running-config"`
- **An interface's description** (`interface-description`)
  - **Simple:** A label for an interface, for the people who read the configuration. FRR
    does nothing else with it.
  - **Deep:** Typed in interface mode as `description <words>`. It shows in
    `show interface a-c` as `Description: link to router c` and in
    `show interface description`. Linux knows nothing of it: `ip link` shows no label.
  - **Sources:** `zebra/interface.c` · **Docs:** https://docs.frrouting.org/en/latest/zebra.html
  - **Try it:** `vtysh -c "show interface description"`

### Hand-off

"What happens to your label when FRR restarts? In Gone After the Restart."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Labelled the cable to b instead.
  - id: wrong-interface
    passes: false
    changes:
      - router: a
        lines: [configure terminal, interface a-b, description link to router b]
  # Typed in configure mode: refused.
  - id: wrong-mode
    passes: false
    changes:
      - router: a
        lines: [configure terminal, description link to router c]
  - id: labelled
    passes: true
    changes:
      - router: a
        lines: [configure terminal, interface a-c, description link to router c]
```

---

## 1.6 — Gone After the Restart

- **Id:** `gone-after-the-restart` · **Guide:** zebra, watchfrr · **Time:** ~15 min ·
  **Prerequisites:** `what-it-does-now`
- **Question:** What does a router remember when FRR restarts?
- **The one new idea:** the saved configuration, `frr.conf`, is all a restart leaves, and
  `write memory` copies the running configuration into it.
- **Teaches:** `saved-config`, `write-memory` · **Names:** none · **Uses:**
  `running-config`, `interface-description`, `frr-init-script`, `watchfrr`, `cli-modes`

Today's 1.2 rewritten, on stage 1's network. The player restarts FRR themselves: checks
never restart FRR, and the `started` source holds only once they have.

### Network

a: `startup: watchfrr`, `config: ""`.

### Beats

- **Scene.** The existing incident, told by zebra: someone labelled `lo` last week, the
  router restarted last night, and the label is gone. Nobody removed it.
- **See it.** Give `lo` a description (`conf t`, `int lo`, `descr loopback of router a`,
  `end`: abbreviations from 1.4). `show running-config` has it; `cat /etc/frr/a/frr.conf`
  does not. Restart without saving: `/usr/lib/frr/frrinit.sh restart a` (watchfrr's lines
  in the terminal: `Terminating on signal`, `Stopped watchfrr`, … `Started watchfrr`);
  `show running-config` no longer has the description.
- **Build it.** Give it again, then `write memory`:

  ```
  a# write memory
  Note: this version of vtysh never writes vtysh.conf
  Building Configuration...
  Integrated configuration saved to /etc/frr/a/frr.conf
  [OK]
  ```

  watchfrr adds its line in the terminal:
  `watchfrr[571]: [WFP93-1D146] configuration write completed with exit code 0`.
  `cat /etc/frr/a/frr.conf` now holds the same text as the running configuration, and
  `ls /etc/frr/a` shows `frr.conf.sav`, the file as it was before.
- **Watch it.** Predict below, then the restart, and `show running-config` with the
  description back.
- **Debrief.** "A restart keeps only what was saved. After a change that should last, save
  it, and read the file if you want to be sure. What if the saved file holds a mistake? In
  The Skipped Line."

### Objectives

| Id         | Text                                                             | Check                                                                                    |
| ---------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `saved`    | Give a's interface lo a description and save it in a's frr.conf. | `{ kind: config, router: a, source: saved, block: [interface lo], line: description }`   |
| `survives` | Restart FRR on a, and have it come back with the description.    | `{ kind: config, router: a, source: started, block: [interface lo], line: description }` |

### Hints

1. **Nudge:** "Compare `show running-config` with `cat /etc/frr/a/frr.conf` after you change
   something. Which one does FRR read when it starts?"
2. **The idea:** "The running configuration is copied into `frr.conf` only when you ask,
   from `a#`. Then restart FRR with its script to see what it comes back with."
3. **The spot:** "Save, then restart." Commands: `write memory`, then
   `/usr/lib/frr/frrinit.sh restart a`

### Chips

| Command              | Explain                                                 |
| -------------------- | ------------------------------------------------------- |
| `write memory`       | in vtysh: save the running configuration in `frr.conf`  |
| `frrinit.sh restart` | at the shell: stop FRR and start it again from the file |
| `cat`                | show the saved file                                     |

### Predict

"You saved, then restarted FRR. What comes back?" — nothing, a restart starts empty /
**everything in `frr.conf`, the description too** / only what you typed last. Seen:
`show running-config` after the restart has `interface lo` / ` description loopback of
router a`. Before the save, the same restart had brought back no description (seen on the
Machine with `lo` on stage 1's network).

### Codex (chapter: First Router)

- **The saved configuration** (`saved-config`, deepens: `running-config`)
  - **Simple:** The file `frr.conf`. FRR reads it once, when it starts; a restart brings
    back only what is in it.
  - **Deep:** With `service integrated-vtysh-config`, every daemon's settings are in one
    file: `/etc/frr/a/frr.conf` on the Machine, `/etc/frr/frr.conf` on a router of its own.
    watchfrr has it read in after a start. A setting that was only running is lost at the
    restart. `show startup-config` prints nothing on the Machine; `cat` the file instead.
  - **Sources:** `vtysh/vtysh_config.c`, `watchfrr/watchfrr.c` · **Docs:** https://docs.frrouting.org/en/latest/vtysh.html
  - **Try it:** `cat /etc/frr/a/frr.conf`
- **write memory** (`write-memory`)
  - **Simple:** Copies the running configuration into `frr.conf`, so that the next start
    brings it back.
  - **Deep:** vtysh gathers the whole running configuration and writes it in place of the
    file, keeping the old one as `frr.conf.sav`. The whole file is rewritten, so a line
    that was in the file but not running is gone afterwards (1.7 uses this). It prints
    `Integrated configuration saved to /etc/frr/a/frr.conf` and `[OK]`.
  - **Sources:** `vtysh/vtysh.c` · **Docs:** https://docs.frrouting.org/en/latest/vtysh.html
  - **Try it:** `vtysh -c "write memory"`

### Hand-off

"What if the saved file holds a mistake? In The Skipped Line."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Configured and never saved.
  - id: not-saved
    passes: false
    changes:
      - router: a
        lines: [configure terminal, interface lo, description loopback of router a]
  # Saved, and never restarted: started has not happened.
  - id: saved-not-restarted
    passes: false
    changes:
      - router: a
        lines: [configure terminal, interface lo, description loopback of router a, end, write memory]
  # Restarted, then configured: the restart came before the change, from a file without it.
  - id: restarted-then-saved
    passes: false
    changes:
      - router: a
        restart: true
      - router: a
        lines: [configure terminal, interface lo, description loopback of router a, end, write memory]
  - id: saved-and-restarted
    passes: true
    changes:
      - router: a
        lines: [configure terminal, interface lo, description loopback of router a, end, write memory]
      - router: a
        restart: true
```

`restarted-then-saved` and `saved-not-restarted` read `started` from a start whose file had
no description; both depend on the live checker's `started` source (see the end of this
file).

---

## 1.7 — The Skipped Line

- **Id:** `the-skipped-line` · **Guide:** watchfrr, zebra · **Time:** ~15 min ·
  **Prerequisites:** `gone-after-the-restart`
- **Question:** When FRR starts from a file with a mistake in it, where does it say so?
- **The one new idea:** FRR skips a line it doesn't understand and applies the rest; the
  log, watchfrr and `vtysh -C -f` are where to look, and `write memory` rewrites the file
  without the bad line.
- **Teaches:** `frr-log`, `config-check` · **Names:** none · **Uses:** `saved-config`,
  `write-memory`, `running-config`, `watchfrr`, `frr-init-script`, `interface-description`

### Network

a: `startup: watchfrr`, `config: "interface a-c\n descripton link to router c\n!\n"` (the
typo is the mission).

### Beats

- **Scene.** watchfrr: "Someone labelled the cable to c in the file, by hand, and went home.
  FRR started fine. The label isn't there."
- **See it.** `show running-config`: no `interface a-c` at all. `cat /etc/frr/a/frr.conf`:
  ` descripton link to router c`. Where would FRR say so? `show logging` names the log for
  mgmtd, zebra and staticd: `File logging: level debugging, filename /var/log/frr/a.log`,
  and watchfrr's `Syslog logging: level informational, facility daemon, ident watchfrr`.
  `tail /var/log/frr/a.log` shows the daemons' own news (`STATIC: [VTVCM-Y2NW3]
  Configuration Read in Took: 00:00:00`) and nothing about the line.
- **Build it.** Ask vtysh to check the file without applying it:

  ```
  a:~# vtysh -C -f /etc/frr/a/frr.conf
  line 7: % Unknown command[21]:  descripton link to router c
  Configuration file[/etc/frr/a/frr.conf] processing failure: 2
  ```

  Line 7, the word FRR didn't know. Type the line properly in `a-c`'s mode, then
  `write memory`: the whole file is written from the running configuration, so the bad line
  is gone. `vtysh -C -f /etc/frr/a/frr.conf` now prints nothing, and `echo $?` says `0`.
- **Watch it.** Predict below, then `/usr/lib/frr/frrinit.sh restart a` and
  `show running-config` with the description.
- **Debrief.** "FRR skips what it can't read and says little about it. Check a file before
  you trust it. You can now run a router; in A Router from Nothing, you bring one up alone."

### Objectives

| Id         | Text                                                                                | Check                                                                                     |
| ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `fixed`    | Put the description of a's interface to c in a's frr.conf, spelled so FRR reads it. | `{ kind: config, router: a, source: saved, block: [interface a-c], line: description }`   |
| `survives` | Restart FRR on a, and have it come back with the description.                       | `{ kind: config, router: a, source: started, block: [interface a-c], line: description }` |

The `saved` check reads FRR's parse of `frr.conf`: a `descripton` line is not a
`description` line, so the mission does not start passed.

### Hints

1. **Nudge:** "Compare `show running-config` with the file. Which line from the file never
   made it into the running configuration?"
2. **The idea:** "`vtysh -C -f <file>` checks a file without applying it and names every
   line it refuses. Typing the line in vtysh and saving rewrites the whole file."
3. **The spot:** "Check the file, fix the line in `a-c`'s mode, save, restart." Command:
   `vtysh -C -f /etc/frr/a/frr.conf`

### Chips

| Command        | Explain                                                      |
| -------------- | ------------------------------------------------------------ |
| `show logging` | in vtysh: where each daemon writes its log                   |
| `tail`         | at the shell: the last lines of a file, such as the log      |
| `vtysh -C -f`  | at the shell: check a configuration file without applying it |
| `echo $?`      | at the shell: how the last command ended; 0 means no error   |

### Predict

"Where did FRR report the bad line when it started?" — in the log file / **nowhere you
would see without asking** / it refused to start. Seen: nothing in `/var/log/frr/a.log`;
FRR started with the rest of the file. A restart from the bad file adds only watchfrr's
`restart all process 628 exited with non-zero status 2` in the terminal.

### Codex (chapter: First Router)

- **FRR's log** (`frr-log`)
  - **Simple:** The file each daemon writes its news to. `show logging` says where:
    `/var/log/frr/a.log` on the Machine.
  - **Deep:** The `log file` line of the configuration sends every daemon's messages there,
    each with a time, the daemon (`ZEBRA:`, `STATIC:`) and a code such as `[VTVCM-Y2NW3]`
    that FRR's documentation can look up. watchfrr logs to syslog instead. Protocol
    debugging, from stage 3 on, adds far more lines to the same file.
  - **Sources:** `lib/zlog.c`, `lib/log.c` · **Docs:** https://docs.frrouting.org/en/latest/basic.html
  - **Try it:** `tail -5 /var/log/frr/a.log`
- **Checking a file** (`config-check`, deepens: `saved-config`)
  - **Simple:** `vtysh -C -f <file>` reads a configuration file, applies nothing, and names
    each line FRR would refuse.
  - **Deep:** `-C` is a dry run: each line is matched against the commands as if typed, in
    its mode. A refused line is reported with its number,
    `line 7: % Unknown command[21]:`, and vtysh exits with status 2; a clean file prints
    nothing and exits with 0. At start, FRR skips the same lines and applies the rest.
  - **Sources:** `vtysh/vtysh.c`, `vtysh/vtysh_main.c` · **Docs:** https://docs.frrouting.org/en/latest/vtysh.html
  - **Try it:** `vtysh -C -f /etc/frr/a/frr.conf; echo $?`

### Hand-off

"You can now run a router. In A Router from Nothing, you bring one up alone."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Fixed in the running configuration and never saved.
  - id: fixed-not-saved
    passes: false
    changes:
      - router: a
        lines: [configure terminal, interface a-c, description link to router c]
      - router: a
        restart: true
  - id: fixed-and-saved
    passes: true
    changes:
      - router: a
        lines: [configure terminal, interface a-c, description link to router c, end, write memory]
      - router: a
        restart: true
```

---

## 1.8 — A Router from Nothing (capstone)

- **Id:** `a-router-from-nothing` · **Guide:** zebra, watchfrr · **Time:** ~20 min ·
  **Prerequisites:** `the-skipped-line`
- **Question:** Can you bring a router up alone, so that it is still right after a restart?
- **The one new idea:** none: the capstone uses the stage's skills together, with less
  guidance.
- **Teaches:** none · **Names:** none · **Uses:** `frr-init-script`, `watchfrr`,
  `vtysh`, `cli-help`, `cli-modes`, `interface-shutdown`, `running-config`,
  `interface-description`, `saved-config`, `write-memory`, `config-check`, `route`

FRR is installed on a and not running, and its saved file still says `shutdown` for `a-c`.
Starting FRR darkens the cable (the twist the player has to read), and only a fix made in
FRR and saved survives the restart. Hints point at the earlier mission for each step.

### Network

a: `startup: none`, `config: "interface a-c\n shutdown\n!\n"`. Before FRR starts, `a-c` is up
(`ip -br link` shows `a-c@if2 UP`); after `frrinit.sh start a`, `a-c@if2 DOWN`.

### Beats

- **Scene.** zebra: "This is a after the Peerfall: installed, configured once, never
  started. Bring it up, label the cable to c, and make it all survive a restart. I'll only
  say which mission to look back at."
- **See it.** The player reads the state alone: `vtysh` fails, `frrinit.sh status a`.
- **Build it.** Start FRR; Predict below; `no shutdown` and a description for `a-c` in its
  mode; `write memory`; `vtysh -C -f` on the saved file.
- **Watch it.** `/usr/lib/frr/frrinit.sh restart a`, then `ip -br link`, `ip route` and a
  ping to c.
- **Debrief.** "One router, fully yours: started, configured, saved and checked. Stage 2
  sends packets across it: in Two Ends of One Cable, you give interfaces their addresses."

### Objectives

| Id          | Text                                                                     | Check                                                                                                |
| ----------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `frr-runs`  | FRR runs on a, started the way FRR is started.                           | `{ kind: daemons, router: a, daemons: [watchfrr, zebra, mgmtd, staticd] }`                           |
| `labelled`  | a's interface to c has a description in a's frr.conf.                    | `{ kind: config, router: a, source: saved, block: [interface a-c], line: description }`              |
| `restarted` | After you restart FRR on a, the description comes back with it.          | `{ kind: config, router: a, source: started, block: [interface a-c], line: description }`            |
| `stays-lit` | After the restart, the cable to c is not shut down in a's configuration. | `{ kind: config, router: a, source: started, block: [interface a-c], line: shutdown, absent: true }` |
| `reaches-c` | Reach c's address, 10.0.2.2, from a.                                     | `{ kind: reaches, from: a, to: 10.0.2.2 }`                                                           |

`stays-lit` needs a new field, `absent: true` (see the end of this file): without it, a
cable switched on from Linux would pass, though the restart puts it out again.

### Hints

1. **Nudge:** "Start where The Silent Router started, then read `ip -br link` again. Did
   anything change when FRR came up?"
2. **The idea:** "The saved file decides what a restart does (Gone After the Restart). A
   fix made from Linux is not in it; a fix made in FRR is, once saved."
3. **The spot:** "Switch `a-c` on and label it in its own mode, save, check the file,
   restart." Command: `write memory`

### Chips

Names only, as from 1.4: `frrinit.sh`, `show interface`, `configure terminal`, `interface`,
`no`, `description`, `write memory`, `vtysh -C -f`, `ip -br link`, `ping`.

### Predict

"You start FRR on a. What happens to the cable to c?" — nothing, it stays up / **it goes
down** / FRR refuses to start. Seen: `ip -br link` shows `a-c@if2 UP` before and
`a-c@if2 DOWN … <BROADCAST,MULTICAST>` after `frrinit.sh start a`.

### Codex

No new cards. The chapter ends with **You can now…**: "start FRR on a Linux router and say
which daemons run and what keeps them running; use vtysh, its help and its modes; read the
running configuration, save it and know what a restart leaves; and find a line FRR refused."

### Hand-off

"Stage 2 sends packets across it. In Two Ends of One Cable, you give interfaces their
addresses."

### Golden runs

```yaml
runs:
  - id: start
    passes: false
    changes: []
  # Lit from Linux, labelled and saved: the saved file still says shutdown.
  - id: lit-from-linux
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start a, ip link set a-c up]
      - router: a
        lines: [configure terminal, interface a-c, description link to router c, end, write memory]
      - router: a
        restart: true
  # Everything right in the running configuration, never saved.
  - id: not-saved
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start a]
      - router: a
        lines: [configure terminal, interface a-c, no shutdown, description link to router c]
      - router: a
        restart: true
  - id: from-nothing
    passes: true
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start a]
      - router: a
        lines: [configure terminal, interface a-c, no shutdown, description link to router c, end, write memory]
      - router: a
        restart: true
```

---

## What stage 1 needs that does not exist yet

- **`absent: true` on a `config` check** (1.8, `stays-lit`). It passes when the source exists
  and has **no** line starting with `line` inside `block`. It reads the same text the
  `config` check reads today (`source: started` here: the `frr.conf` FRR last started from
  with its init script). Why: a setting that is removed (`no shutdown`) leaves no line
  behind, so the only way to judge that a restart keeps the cable up is that the started
  file lacks `shutdown`. The `route` check cannot judge it, because an objective once met
  stays met: the route appears when the cable comes up, before the restart.
- **The `started` source** (1.6, 1.7, 1.8) is described in [MISSIONS.md](../MISSIONS.md);
  these missions rely on it holding only after the player's own restart, and on it being
  read from the file as it was at that start.
- **Live checks after shell commands.** 1.1, 1.2 and 1.3 are met by shell commands, not
  vtysh lines; the live checker must read the state after those too.
