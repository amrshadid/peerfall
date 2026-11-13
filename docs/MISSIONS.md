# Peerfall: missions

How a mission is built and checked. Propose a mission with the **Mission proposal** issue
before writing one.

## Rules

- **Follow the mission loop:** Scene → See it → Build it → Watch it → Debrief → Real world.
  Watch it may open with a **Predict** beat: the player commits to what will happen, then
  the network shows it. Nothing is scored.
- **One new idea per mission**, at most three concepts taught, 10–20 minutes. Earlier ideas
  may be reused, never assumed untaught. Players start knowing nothing: every term is
  explained the first time it appears, and every analogy says where it stops being true.
- **Show, then explain.** One idea per step; the depth goes in the Codex.
- **Judged by outcome, live:** reachability, a route in the kernel, a daemon that answers,
  a line in a configuration, recovery time, the path taken. Never by which command was
  typed. Objectives tick by themselves after each command, and stay met.
- **No timers on the player**, free retries. Exactly three hints: a nudge, the idea, then
  the spot. Hints never paste the whole fix.
- **True to the Machine.** Every output and number in a mission's text is copied from a
  real run, never typed, and each mission is fact-checked by someone other than its author.
- **One journey.** A mission names what came before it, and its debrief hands off to the
  next one.
- **Take it home.** The Real world section gives the commands to repeat the exercise on
  real FRR, and `lab/` runs the same network on a Linux host.

## Files

```
packages/missions/content/
  chapters.yaml       stages in play order, with each stage's Codex title page
  concepts.yaml       every concept a mission may teach, name or use
  field-guide.yaml    the Codex's page of commands
  1-first-router/01-the-silent-router/
    mission.yaml      objectives and their checks, the network, three hints, chips, Codex
                      cards, the concepts it teaches; a probe and a fault when it has them
    story.md          Scene, See it, Build it, Watch it, Debrief, Real world
    solution.yaml     the golden runs: what a player might do, and whether it must pass
```

Folders are numbered in play order. Ids inside the YAML never change when folders are
renumbered. Mission files carry a `version:` field.

## The story

`story.md` holds the mission's title, a `**Question:**` line, and its sections:
`## Scene`, `## See it`, `## Build it`, `## Watch it`, `## Debrief`, `## Real world`.
A guide speaks in a quote: `> **zebra:** Type \`vtysh\`.` The Guide shows a step up to the
next pause and the rest once the player has run a command (or pressed **Continue**), so a
result is on the terminal before it is explained.

- A line holding only `---` is a pause. Put one after every line that asks the player to do
  something.
- A question followed by a quoted list with one `[x]` is a Predict beat. The Guide waits for
  an answer, then marks the player's call beside what really happens.
- A code block is the Machine's own output, copied from a real run.

The loader reports a broken story with its file and line: a missing title or question,
text before the first section, a `###` heading, a section twice, an unclosed code block,
more than one `[x]`, or a section `mission.yaml` points at that the story lacks.

## Hints, chips and the Codex

```yaml
hints: # exactly three: a nudge, the idea, the spot; only the third may name a command
  - text: Select router a on the map and type vtysh. Read what it answers.
  - text: FRR is several programs, called daemons; vtysh only talks to the ones that run.
  - text: FRR's own script starts them all. Its last word is the router's name.
    command: /usr/lib/frr/frrinit.sh start a
chips: # commands the player can click, each with what it does
  - { command: vtysh, explain: "open FRR's console on this router" }
codex: # cards this mission adds to the Codex
  - id: watchfrr
    term: watchfrr
    simple: FRR's watchdog. It starts the daemons and starts one again when it dies.
    deep: …
    deepens: frr-daemon # an earlier card this one goes deeper into
    sources: [watchfrr/watchfrr.c]
    docs: https://docs.frrouting.org/en/latest/watchfrr.html
    tryIt: show watchfrr
teaches: [frr-daemon, vtysh, watchfrr] # at most three, from concepts.yaml
names: [zebra] # named here, taught later
uses: [] # taught earlier, relied on here
```

A card is shown once its mission starts and filed once the mission is passed. Card ids are
unique across the game, and `deepens` points at a card earlier in play order.

## Concepts and budgets

`pnpm content:report` (part of `pnpm verify` and CI) measures every mission: words per
section and per Codex card, concepts taught, banned phrases (the game's own internals and
hedges) and words used outside the meaning the vocabulary in [GAME.md](GAME.md) gives
them. A test checks the concepts in play order: nothing is used before it is taught.

| Unit                 | Budget      |
| -------------------- | ----------- |
| `teaches`            | ≤ 3         |
| Story (all sections) | 500–650     |
| Scene                | ≤ 80        |
| See it               | ≤ 200       |
| Build it             | ≤ 150       |
| Watch it             | ≤ 120       |
| Debrief              | ≤ 50        |
| Codex Simple / Deep  | ≤ 25 / ≤ 80 |
| Parenthetical asides | 0           |

A mission over budget is a warning; once rewritten it joins `ENFORCED_MISSIONS`, and over
budget then fails the tests.

## The network

`network:` lists the routers and the links between them. Every router runs zebra and
mgmtd; `daemons:` adds others (`staticd`, `ospfd`, `ospf6d`, `isisd`, `bgpd`, `bfdd`).
`config:` is the router's `frr.conf`, after the lines the Machine writes itself
(hostname, log file). Two optional fields set up a mission that does not start from
"everything running and addressed":

| Field                        | What it does                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| router `startup: watchfrr`   | FRR is started by its own init script (`/usr/lib/frr/frrinit.sh start <router>`): watchfrr starts the daemons, loads `frr.conf` and restarts a daemon that dies, as on an installed router. The script always starts staticd as well. |
| router `startup: none`       | FRR is installed and configured (`frr.conf`, `daemons`) and nothing runs: starting it is the player's.                                                                                                                                |
| link end `unaddressed: true` | The Machine leaves that interface without its address: giving it, in FRR, is the player's. `address` is then the one the mission plans for it.                                                                                        |

Left out, a router's daemons are started one by one by the Machine and every link end
gets its address from Linux.

## Checks

Each objective has one `check:`. No check can see which command was typed. There are two
families, and a mission may use both.

**Run checks** read the events of a run of the mission's `probe:` and `fault:`.

| Kind          | Fields            | Passes when                                                                          | Needs                                           |
| ------------- | ----------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `reachable`   | `minReplies` (1)  | the probe got that many replies before the fault                                     | `probe`                                         |
| `path`        | `before`, `after` | the probe's router forwards to the destination only through that interface           | `probe`; `fault` for `after`                    |
| `recovery`    | `via`, `withinMs` | replies are back through `via` within the limit                                      | `probe`, `fault`, a limit or `recoveryTargetMs` |
| `outage`      | `maxMs`           | the longest gap between replies around the fault is under the limit                  | `probe`, `fault`, a limit or `recoveryTargetMs` |
| `detected-by` | `event`           | that is what noticed the fault first (`bfd_session_down`, `ospf_dead_timer_expired`) | `probe`, `fault`                                |

**State checks** read the network as it is, after every command the player finishes and
whenever routing settles. They read it as root: `vtysh -c 'show daemons'`, `ip route show`,
`show ip route json`, `show running-config`, the router's `frr.conf`, and a short `ping`. FRR is never restarted
to judge a mission.

| Kind      | Fields                                                                                                      | Passes when                                                                                                                                                                                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daemons` | `router`, `daemons` (list)                                                                                  | each of those FRR daemons (`watchfrr`, `zebra`, `mgmtd`, `staticd`, …) runs on the router and answers vtysh                                                                                                                                                                                                                  |
| `route`   | `router`; `prefix` or `to`; optional `protocol`, `via`, `interface`                                         | the router's kernel has a route for exactly `prefix`, or one that covers the address `to` (the longest match), installed by `protocol` (`kernel` for a connected route, `static`, `ospf`…), with that next hop and that way out                                                                                              |
| `rib`     | `router`, `prefix`; optional `protocol`, `via`, `selected`                                                  | zebra's routing table (`show ip route json`) holds a route for exactly `prefix`, from `protocol` (`static`, `connected`, `ospf`…), with `via` among its next hops, selected for forwarding or not as `selected` says. Unlike `route`, it sees a backup route that waits, which never reaches the kernel                      |
| `reaches` | `from`, `to`, `minReplies` (2)                                                                              | at least that many of three packets from the router to the address are answered                                                                                                                                                                                                                                              |
| `config`  | `router`, `source` (`running`, `saved` or `started`), `block` (list, optional), `line`, `absent` (optional) | the router's running configuration, its saved `frr.conf`, or the `frr.conf` FRR last started from with its init script during play, has `line` inside those blocks (`block: [interface lo]`). `line` is a whole line or its first words. With `absent: true`, that configuration exists and has no such line in those blocks |

A mission with only state checks needs no `fault:`, no `probe:` and no
`recoveryTargetMs:`. It may still have a `probe:`, for the player to send. The schema
reports a run check whose mission lacks what it reads.

To judge that a change survives a restart, check `source: started`: it holds only once the
player has restarted FRR themselves (`/usr/lib/frr/frrinit.sh restart a`), and it holds
the configuration FRR came back with.

An objective once met stays met for the rest of the play-through, until Start over. The
attempt is recorded, and the mission completed, the first time every objective is met.
`judgeMission(mission, events, state)` stays pure: the flow reads the state and hands it in,
and `mergeVerdicts` keeps what earlier reads met.

A state-checked mission, whole:

```yaml
id: the-silent-router
version: 1
title: The Silent Router
chapter: first-router
objective: FRR is running on router a, started the way FRR is started, and its daemons answer in vtysh.
prerequisites: []
network:
  routers:
    - name: a
      daemons: []
      startup: none
      config: ""
  links: []
objectives:
  - id: daemons-answer
    text: Start FRR on router a, so that its daemons zebra, mgmtd and staticd are running and answer.
    check: { kind: daemons, router: a, daemons: [zebra, mgmtd, staticd] }
teaches: [frr-daemon]
hints:
  - text: Type vtysh in a's terminal and read what it answers.
  - text: FRR is several programs, called daemons; vtysh only talks to the ones that run.
  - text: FRR's own script starts every daemon. Its last word is the router's name.
    command: /usr/lib/frr/frrinit.sh start a
chips:
  - { command: vtysh, explain: "open FRR's console on this router" }
story:
  scene: story.md#scene
  buildIt: story.md#build-it
  debrief: story.md#debrief
  realWorld: story.md#real-world
```

## Golden runs

Every mission has scripted runs on the real image that its checks must judge correctly.
`solution.yaml` lists them, and must hold at least: the mission as it starts (no changes,
not passed), the reference solution (passed), and one plausible wrong or half-done
solution (not passed).

```yaml
runs:
  - id: start
    passes: false
    changes: []
  - id: zebra-by-hand
    passes: false
    changes:
      - router: a
        shell: [/usr/lib/frr/zebra -d -N a] # typed at a's shell
  - id: init-script
    passes: true
    changes:
      - router: a
        shell: [/usr/lib/frr/frrinit.sh start a]
      - router: a
        lines: [configure terminal, interface lo, description loopback, end, write memory] # typed into a's vtysh
      - router: a
        restart: true # FRR restarted on a, from its saved frr.conf
```

A change is one of `lines` (typed into the router's vtysh, one after another), `shell`
(typed at the router's shell: its namespace and hostname, as the terminal's) or
`restart: true`. A line may not contain a single quote.

A `lines` change that FRR turns down fails the recording, unless it is marked
`refused: true`: for a run whose point is that FRR refuses a line, such as a command typed
in the wrong mode. The recorder then expects vtysh to refuse, logs what FRR said
(`% Unknown command: no shutdown`), and plays on; a change marked `refused: true` that FRR
accepts in full is an error. vtysh stops at the line it refuses: the lines after it in the
same change are not typed, so put them in a change of their own.

```yaml
- id: wrong-mode
  passes: false
  changes:
    - router: a
      lines: [configure terminal, no shutdown] # outside interface mode: FRR refuses it
      refused: true
```

```sh
pnpm --filter @peerfall/missions vm:golden                # every mission, several minutes
pnpm --filter @peerfall/missions vm:golden <mission-id>   # only that mission
```

The recorder boots the image in Node and plays each run from the network as it was first
built. A mission with a `fault:` is judged from its fault run. A mission without one is
judged as live play judges it: its probe is sent first if it has one, routing is left to settle, then the state is
read. A run that is judged as `solution.yaml` says is written to
`packages/missions/src/test/runs/<mission-id>/<run-id>.json` (one line of JSON: the
events, and the state for a state-checked mission). With an id, only that mission is
validated and recorded, and the other missions' runs stay untouched.

Content that does not load stops the whole game, so a mission goes into `content/` only
once it is complete and its runs are judged as its solution says. Until then keep it in a
folder of its own, laid out like `content/`, and record it from there:
`PEERFALL_CONTENT_DIR=<folder> PEERFALL_RUNS_DIR=<folder> pnpm --filter @peerfall/missions vm:golden <mission-id>`.

The recorded runs are judged again without a VM by `pnpm --filter @peerfall/missions test`:
one test file per mission, `src/test/golden-<mission-id>.test.ts`, built on
`goldenMission(id)` from `#test/index`. A change to a check or to a mission that flips a
verdict fails there. Record again after changing a mission's `version`.

For The Link That Never Went Down:

- **Baseline:** traffic is lost until the OSPF dead timer expires; the mission is not passed.
- **BFD on one end only:** not passed.
- **BFD on both ends:** the direct path before the fault, the path through the third
  router within the recovery target after it.
- **Reset:** a second run of the same script reaches the same verdict.

The recovery target is **under 2 seconds**, with FRR's default BFD timers (300 ms × 3).
Detection alone can take up to 900 ms, and on the Machine recovery measured 0.67–1.16 s,
so a one-second target would fail runs that did everything right.
