# Peerfall: roadmap

Where the game stands and what comes next, so you can pick something to work on. Open an
issue before you start, so two people don't build the same thing.

## Where it stands

Real FRR 10.6.1 runs in the browser's Linux machine, and missions are judged by what the
network really did. Five missions are playable at [peerfall.shadid.dev](https://peerfall.shadid.dev).
Each has golden runs recorded on the real image.

| Stage                  | Missions                                              | Golden runs | Played in the app | Fact-checked by a second person |
| ---------------------- | ----------------------------------------------------- | ----------- | ----------------- | ------------------------------- |
| 1 First router         | The Silent Router, Gone After the Restart             | both        | the first         | none yet                        |
| 2 Follow a packet      | Two Ends of One Cable, The Reply That Never Came Back | both        | none yet          | none yet                        |
| 3 Build an underlay    | none                                                  |             |                   |                                 |
| 4 Recover from failure | The Link That Never Went Down                         | yes         | part of it        | against the native lab          |
| 5 to 11                | none                                                  |             |                   |                                 |

## Milestones

1. **0.1.0, the first four stages.** Stages 1 to 4 complete, each mission true to the
   Machine, fact-checked, played end to end in the app, and leading into the next. The
   game works offline and survives a tab left in the background.
2. **Later.** The remaining stages in the [README](../README.md#what-youll-learn), one
   at a time.

## Next up

### Checking what exists

- **Play every mission end to end in the app**, including the repaired run and the
  debrief of The Link That Never Went Down, the editor's Apply, and Start over.
- **Fact-check the four new missions** on the Machine and on native FRR, by someone other
  than their author, and add them to `lab/`.
- **A tab left in the background.** Find out whether the browser slows the Machine enough
  to drop a healthy BFD session, and pause or void a timed run when the tab is hidden.
- **Measure the first visit's download** and say it in the README.

### Engine

- **Stage 3:** OSPF and IS-IS adjacencies, the link-state database, costs and areas.
  IS-IS needs `isisd` events in the stream.
- **Routes that are not routes in the event stream:** address changes show up as
  `fib_install` events named `local` and `broadcast`.
- **The terminal's router after a restore** can differ from the one highlighted on the map.
- **Offline play**, checked.

### Content

- **Stage 3 missions**, then the rest of stage 4 (graceful restart, VRRP).
- **Mission steps on missions without a fault:** the step rail still speaks of a baseline
  and an attempt.
- **A "next mission" button on the debrief**, and a link back to the Peer Map.

## Good first contributions

- **Check a mission on real FRR.** Play it, compare every output and number with what a
  real router prints, and open an **Inaccuracy** issue for each difference.
- **Propose a mission** with the Mission proposal issue: one skill, a small network, and
  the outcome that shows it was learned.
