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
    mission.yaml     objective, prerequisites, topology, initial config, fault,
                     recovery target, checks, staged hints
    incident.md      the incident report
    debrief.md       explanation + commands to try on real FRR
    solution.yaml    reference config changes (for golden runs)
```

Folders are numbered in play order. Ids inside the YAML never change when folders are
renumbered. Mission files carry a `version:` field.

## Golden runs

Every mission has scripted runs on the real image that its checks must judge correctly.
For The Link That Never Went Down:

- **Baseline:** traffic is lost until the OSPF dead timer expires; the mission is not passed.
- **BFD on one end only:** not passed.
- **BFD on both ends:** the direct path before the fault, the path through the third
  router within the recovery target after it.
- **Reset:** a second run of the same script reaches the same verdict.

The recovery target is **under 2 seconds**, with FRR's default BFD timers (300 ms × 3).
Detection alone can take up to 900 ms, and on the Machine recovery measured 0.67–1.16 s,
so a one-second target would fail runs that did everything right.
