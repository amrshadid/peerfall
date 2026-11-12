# Peerfall: missions

How a mission is built and checked. Propose a mission with the **Mission proposal** issue
before writing one.

## Rules

- **One skill per mission**, taught through a guided observation: inspect the network,
  predict what a change will do, apply it, and verify with a route lookup or a probe.
- **Show, then explain.** One idea per step; the depth goes in the debrief.
- **Judged by outcome:** reachability, recovery time, the path taken, isolation. Never by
  which command was typed.
- **No timers on the player**, free retries. Hints are staged: where to look first, a
  specific command last.
- **True to the Machine.** Every output and number in a mission's text is copied from a
  real run, never typed, and each mission is fact-checked by someone other than its author.
- **Reproducible off the game.** The debrief gives the commands to repeat the exercise on
  real FRR, and `lab/` runs the same network on a Linux host.

## Files

```
packages/missions/content/
  chapters.yaml
  4-recover-from-failure/chapter.yaml
  4-recover-from-failure/01-the-link-that-never-went-down/
    mission.yaml     objective, prerequisites, topology, initial config, checks, staged
                     hints; a probe, a fault and a recovery target when it has them
    incident.md      the incident report
    debrief.md       explanation + commands to try on real FRR
    solution.yaml    the golden runs: what a player might do, and whether it must pass
```

Folders are numbered in play order. Ids inside the YAML never change when folders are
renumbered. Mission files carry a `version:` field.

## The network

`network:` lists the routers and the links between them. Every router runs zebra and
mgmtd; `daemons:` adds others (`staticd`, `ospfd`, `ospf6d`, `isisd`, `bgpd`, `bfdd`).
`config:` is the router's `frr.conf`, after the lines the Machine writes itself
(hostname, log file). Two optional fields set up a mission that does not start from
"everything running and addressed":

| Field                          | What it does                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| router `startup: watchfrr`     | FRR is started by its own init script (`/usr/lib/frr/frrinit.sh start <router>`): watchfrr starts the daemons, loads `frr.conf` and restarts a daemon that dies, as on an installed router. The script always starts staticd as well. |
| router `startup: none`         | FRR is installed and configured (`frr.conf`, `daemons`) and nothing runs: starting it is the player's.                                                                                                                               |
| link end `unaddressed: true`   | The Machine leaves that interface without its address: giving it, in FRR, is the player's. `address` is then the one the mission plans for it.                                                                                       |

Left out, a router's daemons are started one by one by the Machine and every link end
gets its address from Linux.

## Checks

Each objective has one `check:`. No check can see which command was typed. There are two
families, and a mission may use both.

**Run checks** read the events of a run of the mission's `probe:` and `fault:`.

| Kind          | Fields                    | Passes when                                                                    | Needs                                        |
| ------------- | ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| `reachable`   | `minReplies` (1)          | the probe got that many replies before the fault                               | `probe`                                      |
| `path`        | `before`, `after`         | the probe's router forwards to the destination only through that interface     | `probe`; `fault` for `after`                 |
| `recovery`    | `via`, `withinMs`         | replies are back through `via` within the limit                                | `probe`, `fault`, a limit or `recoveryTargetMs` |
| `outage`      | `maxMs`                   | the longest gap between replies around the fault is under the limit            | `probe`, `fault`, a limit or `recoveryTargetMs` |
| `detected-by` | `event`                   | that is what noticed the fault first (`bfd_session_down`, `ospf_dead_timer_expired`) | `probe`, `fault`                             |

**State checks** read the Machine as it is when the player asks for their work to be
checked. The game reads it as root: `vtysh -c 'show daemons'`, `ip route show`,
`show running-config`, the router's `frr.conf`, and a short `ping`.

| Kind      | Fields                                                           | Passes when                                                                                                                                                             |
| --------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daemons` | `router`, `daemons` (list)                                       | each of those FRR daemons (`watchfrr`, `zebra`, `mgmtd`, `staticd`, …) runs on the router and answers vtysh                                                              |
| `route`   | `router`; `prefix` or `to`; optional `protocol`, `via`, `interface` | the router's kernel has a route for exactly `prefix`, or one that covers the address `to` (the longest match), installed by `protocol` (`kernel` for a connected route, `static`, `ospf`…), with that next hop and that way out |
| `reaches` | `from`, `to`, `minReplies` (2)                                   | at least that many of three packets from the router to the address are answered                                                                                         |
| `config`  | `router`, `source` (`running` or `saved`), `block` (list, optional), `line` | the router's running configuration, or its saved `frr.conf`, has `line` inside those blocks (`block: [interface lo]`). `line` is a whole line or its first words         |

A mission with only state checks needs no `fault:`, no `probe:` and no
`recoveryTargetMs:`. It may still have a `probe:`, for the player to send. The schema
reports a run check whose mission lacks what it reads.

`restartOnCheck: [a]` restarts FRR on those routers, from the saved `frr.conf`, just
before the state is read: what is judged is what survives a restart. Each router named
there has `startup: watchfrr` or `startup: none`.

In the game, "check my work" (`checkWork()` of `useMissionRun`) restarts those routers,
waits for the network to settle, reads the state, judges every objective, and records the
attempt; the first one that passes completes the mission. Nothing is undone afterwards.
`judgeMission(mission, events, state)` stays pure: the flow reads the state and hands it in.

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
    hints:
      - text: Type vtysh in a's terminal and read what it answers.
      - text: FRR's own script starts every daemon. Its last word is the router's name.
        command: /usr/lib/frr/frrinit.sh start a
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

```sh
pnpm --filter @peerfall/missions vm:golden                # every mission, several minutes
pnpm --filter @peerfall/missions vm:golden <mission-id>   # only that mission
```

The recorder boots the image in Node and plays each run from the network as it was first
built. A mission with a `fault:` is judged from its fault run. A mission without one is
judged as "check my work" does: its probe is sent first if it has one, then the state is
read. A run that is judged as `solution.yaml` says is written to
`packages/missions/src/test/runs/<mission-id>/<run-id>.json` (one line of JSON: the
events, and the state for a state-checked mission). With an id, only that mission is
validated and recorded, and the other missions' runs stay untouched.

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
