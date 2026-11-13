# Peerfall: the game

Peerfall is a free, open-source, story-driven game that teaches FRRouting from zero: what a
router is, how FRR runs on Linux, how packets find their way, and then every protocol FRR
speaks, from OSPF to BGP and EVPN. It runs entirely in the browser: every router you type
into is real FRR on a real Linux kernel, so there is nothing to install and no server.

This page is what we're building. [MISSIONS.md](MISSIONS.md) says how a mission is made,
[ROADMAP.md](ROADMAP.md) what comes next, and [`missions/`](missions/) holds the spec of
every mission and the [concept list](missions/concepts.md).

## 1. Who it's for

- People who have never configured a router and want to understand how networks really
  work: developers, students, system administrators.
- Network engineers who know another vendor's routers and want to learn FRR.
- Anyone preparing to run FRR in a data centre, a lab or a home network.

Players don't need to know what a router, an interface, an address or a daemon is: the first
stage starts there. Each stage names the FRR daemons it works with, and the README's
[What you'll learn](../README.md#what-youll-learn) lists all eleven.

## 2. The promise

After the last stage, a player can honestly say:

> **"I can build a network with FRR from nothing, explain why every packet goes where it
> goes, and find out why it stopped."**

After the first two stages, already:

> **"I can start FRR on a Linux router, configure and save it, give its interfaces
> addresses, write the routes a packet needs there and back, and check what reached the
> kernel."**

## 3. Design pillars

1. **Real FRR, real Linux.** Every router is FRR 10.6.1 in its own network namespace on a
   real Linux kernel. What the player reads is what FRR and Linux print; nothing is
   re-implemented. Where the Machine differs from a router of its own, the game says so.
2. **See the invisible.** The topology, the timeline and the probes show what the routers
   decide, from the same events FRR logs.
3. **Show, then explain.** The player runs a command and reads its answer before any word
   explains it. One new idea per mission.
4. **The story carries the curriculum.** Every character is a real FRR or Linux program and
   speaks as what it really does. The game always names the real term.
5. **Judged by outcome.** A mission is passed by what the network does (a route in the
   kernel, a reply that comes back, a daemon that answers), never by which command was typed.
6. **Failure teaches.** No timers, free retries, Start over at any moment. A broken network
   is something to read, never a penalty.
7. **Take it home.** Every mission ends with the commands to do the same on a real router.

## 4. Story

### Premise

Peerfall takes place in a small network of routers, each one a Linux computer running FRR.
On a normal night they talk to each other all the time, and each one learns from its
**peers**, the routers it talks to, where every address in the network is.

One night every router lost its peers. The cables still carried light and every interface
stayed up, but session after session dropped, routes drained away, and the network went
dark. That night is called **the Peerfall**.

The player is the network engineer on call. They start from a single router, a, with two
neighbours, b and c, and bring the network back stage by stage: first one router fully in
their hands (stage 1), then packets crossing from router to router on routes they write
themselves (stage 2), then routers that find each other again (stage 3), and so on through
the README's eleven stages.

### What really happened (revealed later)

Weeks before the Peerfall, a change was saved on every router, in the files the routers read
when they start, and never tried. That night a power cut restarted every router at once, and
each came back from what was saved, not from what had been running. The saved change gave
the interfaces a larger largest-packet size (their MTU) than the links between them carried.
Small packets still crossed, so pings worked and interfaces stayed up; the large ones were
dropped. OSPF neighbours stopped exchanging their databases, and BGP sessions came up, then
dropped each time a large update was lost.

Stage 1 plants the seed ("Gone After the Restart": the saved file is what a restart leaves),
stage 3 shows the first half on the Machine (OSPF neighbours that never reach Full) and
stage 6 the second (BGP sessions that drop when their updates are lost). This account is the
plan for those stages; each part is shown on the Machine before its stage ships.

### Characters

The player never speaks; they act. Every character is a real program and speaks as what it
does. A metaphor names its real term the first time it appears, and says where it stops
being true. Tone: calm, playful, exact.

| Character                   | Real thing                                                                                                                               | Role                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **You**                     | root at a router's shell, `a:~#`                                                                                                         | Protagonist: the engineer on call. Types every command                                                                                               |
| **zebra**                   | FRR's core daemon: it learns the interfaces and addresses from Linux, keeps the routing table, and hands the chosen routes to the kernel | Mentor and hint-giver. Calm, exact. Every router runs its own zebra, so in the first missions the zebra speaking is b's, until the player starts a's |
| **watchfrr**                | FRR's watchdog: started by FRR's init script, it starts the other daemons and starts one again when it dies                              | Gruff companion. Its real log lines appear in the player's terminal (`watchfrr[594]: … staticd state -> down`), and that is how it speaks first      |
| **mgmtd**                   | FRR's management daemon: it takes configuration changes from vtysh and hands them to the daemons it manages                              | The clerk. Named in stage 1, met properly with the northbound API in stage 11                                                                        |
| **staticd**                 | the daemon that keeps the routes written by hand and offers them to zebra                                                                | The quiet one. Stage 2                                                                                                                               |
| **ospfd, ospf6d, isisd**    | the link-state protocols: each router floods what it is connected to, and every router draws the same map                                | Guides of stage 3, Build an underlay                                                                                                                 |
| **bfdd**                    | Bidirectional Forwarding Detection: a fast heartbeat between two routers                                                                 | Guide of stage 4, Recover from failure (the mission The Link That Never Went Down)                                                                   |
| **ripd, eigrpd, babeld, …** | the distance-vector and specialised protocols                                                                                            | Guides of stage 5                                                                                                                                    |
| **bgpd**                    | the Border Gateway Protocol: sessions between peers that exchange routes and rules about them                                            | Guide of stages 6 to 8                                                                                                                               |
| **ldpd, pathd**             | label distribution and engineered paths                                                                                                  | Guides of stage 9                                                                                                                                    |
| **pimd**                    | multicast routing                                                                                                                        | Guide of stage 10                                                                                                                                    |
| **the Peerfall**            | a failure pattern, not a creature: a saved change, a restart, and packets too large for the path                                         | The antagonist. Never speaks                                                                                                                         |

`vtysh` is not a character: it is FRR's console, the way the player talks to the daemons.

## 5. Core systems

### The Machine

One Linux computer runs in the browser, and every router is a network namespace inside it,
with its own interfaces, its own routing table and its own FRR daemons, told apart by FRR's
`-N <router>`. That is why FRR's files for router a are in `/etc/frr/a`, and why its init
script ends with the router's name. The game says so the first time it matters (stage 1,
Nobody Answers) and each mission's Real world shows the same commands without the name.

### Hints, help and the Guide

The Guide speaks the story step by step and waits for the player's command before it
explains the answer. Each mission has exactly three hints: a nudge, the idea, then the spot.
Hints never paste the whole fix and cost nothing. Commands the player can click (**chips**)
come with a one-line explanation; in the first missions a chip is a whole line, later only a
command's name.

### The Codex

Every concept the player learns becomes a **card**: the real term, a **Simple** explanation
in plain words (≤ 25 words), a **Deep** one with FRR's source files behind it (≤ 80 words),
a link to FRR's documentation and a "try it on real FRR" line.

- **One chapter per stage**, in play order, so the Codex reads from a single router to a
  whole network. Each chapter's title page names its guide and the FRR daemons it covers.
- **Cards in teaching order.** A card not found yet is a blank outline with its mission's
  number ("3 / 9 filed"), never a spoiler.
- **Deepens.** When a later mission goes deeper into an idea (stage 1's route, then stage
  2's connected route, RIB and FIB), it adds to the same card's chain.
- **You can now…** A finished chapter ends with what the player can now do, in the words of
  the README's stage.

The Codex also holds the **Field Guide**, one entry per command (`ip -br link`, `vtysh`,
`show ip route`, `write memory`, …) with what it does and the mission that first used it,
and a **glossary** of every first-meeting word.

### The Peer Map

The map of the network is also the journey: one region per stage, one stop per mission.
Stops light up as they are passed, so the player always knows where they are and what comes
next.

## 6. The mission loop (10–20 minutes each)

1. **Scene:** a character sets up the problem in under a minute.
2. **See it:** the player looks at the network with real commands, and the Guide names
   what they see.
3. **Build it:** the player changes one thing, with guidance.
4. **Watch it:** the network reacts. It often opens with a **Predict** beat: the player
   commits to what will happen, then the Machine shows it. A wrong answer costs nothing; it
   is an in-world moment, never a quiz.
5. **Debrief:** what was learned, in a few lines, and the hand-off to the next mission.
6. **Real world:** the same commands on a router of your own. Its cards go into the Codex.

There is no Submit button. Objectives are judged from the network's state after every
command, tick by themselves, and stay met.

## 7. Vocabulary

A word in the story, the hints and the Codex has one meaning only, so a player never has to
unlearn one. `pnpm content:report` flags a word used outside its meaning. Inline code and
code blocks are the Machine's own text and are never flagged.

| Word                  | Means                                                                                                                                | Never                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| the Machine           | the one Linux computer in the browser that every router runs in                                                                      | a router; "the emulator", "the VM", "the game"                                              |
| router                | one of the network's routers (a, b, c): a network namespace with its own interfaces, routing table and FRR                           | the Machine; "node", "box", "device", "host"                                                |
| interface             | a router's end of a link, named `<router>-<peer>` (`a-c`), or its loopback `lo`                                                      | the link itself; "port", "card"                                                             |
| link                  | the cable between two interfaces (on the Machine, a veth pair)                                                                       | a session; "connection", "circuit"                                                          |
| up, down              | an interface's state, as `ip -br link` and `show interface brief` show it                                                            | a daemon's state (running, stopped) or a session's (Established, Full, Up as BFD prints it) |
| neighbour             | a router at the other end of a link                                                                                                  | a peer, before stage 3                                                                      |
| peer                  | a router a routing protocol talks to (from stage 3); the Peerfall is named after them                                                | a neighbour on a link with no protocol                                                      |
| packet                | one piece of data with a source and a destination address                                                                            | "message", "frame" (except a link-layer frame, named so)                                    |
| address               | an IPv4 or IPv6 address on an interface, written with its prefix length: `10.0.2.1/30`                                               | a MAC address (always called "MAC address")                                                 |
| network               | a range of addresses, written as a prefix: `10.0.2.0/30`                                                                             | the whole set of routers ("the network" in that sense is "the routers")                     |
| route                 | one line of a routing table: a network, and where packets for it go next                                                             | a path                                                                                      |
| path                  | the routers a packet passes through, one after another                                                                               | a route                                                                                     |
| next hop              | the neighbour's address a route hands packets to                                                                                     | the destination                                                                             |
| routing table         | a list of routes. Said alone in stage 1, it means the kernel's; from stage 2 on, "zebra's table" (RIB) or "the kernel's table" (FIB) | a configuration                                                                             |
| FRR                   | the routing software: its daemons and vtysh together                                                                                 | one daemon                                                                                  |
| daemon                | one FRR program running in the background with one job (zebra, staticd, watchfrr)                                                    | FRR as a whole; "service", "agent"                                                          |
| running, stopped      | a daemon's state                                                                                                                     | an interface's state (up, down)                                                             |
| vtysh                 | FRR's console: it passes commands to the daemons                                                                                     | the shell                                                                                   |
| the shell             | bash at the router's prompt, `a:~#`                                                                                                  | vtysh                                                                                       |
| prompt                | what the shell or vtysh prints when it waits: `a:~#`, `a#`, `a(config)#`, `a(config-if)#`                                            |                                                                                             |
| mode                  | where vtysh is: exec (`a#`), configure (`a(config)#`), interface (`a(config-if)#`)                                                   | a daemon's state                                                                            |
| running configuration | what the daemons are doing now, as `show running-config` prints it                                                                   | "the config" said alone                                                                     |
| saved configuration   | the file `frr.conf`, which FRR reads when it starts                                                                                  | "startup-config" (`show startup-config` prints nothing on the Machine)                      |
| restart               | stopping FRR on a router and starting it again from its saved configuration                                                          | restarting the Machine                                                                      |
| the log               | the file FRR's daemons write to, `/var/log/frr/<router>.log` on the Machine                                                          | the terminal; the timeline                                                                  |
| stage                 | one part of the journey, as the README numbers them                                                                                  | "level", "act", "chapter"                                                                   |
| mission               | one stop of a stage, played on its own network                                                                                       | "level", "lesson"                                                                           |
| the Peer Map          | the game's map of stages and missions                                                                                                | the topology                                                                                |
| the topology          | the drawing of a mission's routers and links                                                                                         | the Peer Map                                                                                |
| probe                 | packets sent again and again from one router to an address, to watch reachability over time                                          | a single `ping`                                                                             |

A picture used once and dropped teaches a second vocabulary; say the thing itself instead.
An analogy is allowed when it says where it stops being true, in the same step.
