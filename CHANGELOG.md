# Changelog

All notable changes to Peerfall are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). 0.1.0 will be the first four stages of the
journey, complete and checked; until then, releases are alpha pre-releases.

## [Unreleased]

### Changed

- **The debrief is laid out as Kernelfall's level card:** the debrief's first line as its
  heading, the result in one line, every Codex card the mission filed printed in full, and
  Next mission, Replay mission and Back to the map. A stage's last mission closes the stage
  with what you can now do. The top bar goes back to the Peer Map.
- **Alt+P looks at the previous step**, as in Kernelfall.

## [0.1.0-alpha.3] - 2026-11-14

Stages 1 and 2 are retold for a player who starts knowing nothing, in fourteen missions, with
a Guide that waits for each command, objectives that tick by themselves, and the Codex.
Every mission was fact-checked on the Machine by a reviewer who did not write it, and
played end to end in the app.

### Added

- **Stage 1, First router, in eight missions:** The Dark Cable (a router as plain Linux
  shows it: interfaces and routes), Nobody Answers (FRR's daemons and vtysh), The Silent
  Router (FRR's init script and watchfrr), The Router's Language (vtysh's help and modes,
  `shutdown`), What It Does Now (the running configuration), Gone After the Restart (the
  saved configuration and `write memory`), The Skipped Line (FRR's log and `vtysh -C -f`),
  and the capstone A Router from Nothing.
- **Stage 2, Follow a packet, in six missions:** Two Ends of One Cable (addresses and
  connected routes), One Hop Further (static routes and next hops), The Reply That Never
  Came Back (the way back, TTL and `traceroute`), Written but Not Used (zebra's table and
  the kernel's, next-hop resolution), The Backup Path (administrative distance, floating
  static routes, equal-cost paths), and the capstone Bring the Line Up.
- **A paced Guide.** Each mission is told step by step (scene, see it, build it, watch it,
  debrief), and the Guide waits for the player's command before it goes on. Three staged
  hints, and command chips that explain a command before it is typed.
- **Live checking.** Objectives are judged from the network as it is, after each command
  the player finishes and whenever routing settles; no button to press.
- **The Codex and the Field Guide.** A card for each idea a mission teaches, deepened by
  later missions, a title page for each stage, and one Field Guide entry for each command,
  from the mission it is first met in.
- **New checks:** a route in zebra's routing table, selected or waiting (`rib`), and a
  configuration line that must be gone (`config` with `absent: true`).
- **`pnpm content:report`** measures every mission against the word budgets, the
  vocabulary and the chain of concepts.

### Changed

- **Stages 1 and 2 rewritten from zero** for players who start knowing nothing: The Silent
  Router, Gone After the Restart, Two Ends of One Cable and The Reply That Never Came Back
  keep their ids and are retold; every word is explained next to the output that shows it.
- **The Link That Never Went Down** has a new story, hints, chips and Codex cards; its
  network, checks and golden runs are unchanged.
- **Build it waits for the player.** Once every objective is met, "Next: Watch it" appears;
  Build it no longer moves on by itself and hides its last lines.

### Fixed

- Every output in the stories matches what the Machine prints in the browser, and every
  claim was checked against FRR 10.6.1, its source and its docs.
- A mission starts with the terminal in its first router, and the terminal stays locked
  until the routers have found each other, so Start over goes back to the network as the
  mission found it.
- The Peer Map shows a link down when one of its ends has no carrier.
- Pinging a router's own address no longer counts as reaching another router, and Two
  Ends of One Cable judges each end by its own address.
- The editor opens only in missions that use it, and stays inside its column.
- "Back to" a step after looking at an earlier one, Start over during the scene, and
  "Play it again" on the debrief resets the network.
- The timeline calls a run "Repaired" only when it met the objectives, and the Predict
  and the hints name the stage's own guide.

### Known gaps

- Stage 3 has no mission, so the journey goes from stage 2 to stage 4.
- The Guide moves on after any finished command, a wrong one too.
- The terminal wraps at 80 columns and clips its right edge on narrow panels.

## [0.1.0-alpha.2] - 2026-11-12

The game now starts from the beginning: stages 1 and 2 each have two missions.

### Added

- **The Silent Router** (stage 1, First router): FRR is installed on a router and not
  running. Find its daemons, start them with FRR's own init script, see watchfrr keep
  them alive, and open `vtysh`.
- **Gone After the Restart** (stage 1): a change that worked until the router restarted.
  The running configuration against the saved `frr.conf`, `write memory`, and a restart of
  FRR before the work is judged.
- **Two Ends of One Cable** (stage 2, Follow a packet): two routers on a link with no
  addresses. Address both ends in FRR and follow the connected route from Zebra into the
  Linux routing table.
- **The Reply That Never Came Back** (stage 2): three routers in a line. A static route
  and its next hop, and why the reply needs a route as well.
- **Missions without a fault.** A mission's checks can read the network as it is: the FRR
  daemons that answer, a route in a router's kernel table, whether a router reaches an
  address, a line in the running or the saved configuration. "Check my work" reads it as
  root and judges; a mission can have FRR restarted first.
- `pnpm --filter @peerfall/missions vm:golden <mission-id>` records one mission's golden
  runs and leaves the others as they are.

### Fixed

- The "needs a bigger screen" box sits in the middle of the screen, as Kernelfall's does.

### Known gaps

- The four new missions pass their golden runs on the real image, but only the first has
  been played in the app, and none has been fact-checked by a second person yet.
- Stage 3 has no mission, so the journey jumps from stage 2 to stage 4.
- The gaps listed under 0.1.0-alpha.1 still stand.

## [0.1.0-alpha.1] - 2026-11-12

The first public pre-release.

### Added

- **A real network in the browser.** A Linux VM (v86, Alpine 3.24, kernel 6.18) runs FRR
  10.6.1 with one network namespace per router and FRR's own daemons in each. The image
  is built by `pnpm vm:image` from packages pinned by version and checksum. Nothing to
  install, no server.
- **One terminal that moves between routers.** Selecting a router on the map puts the
  shell in its namespace; `vtysh` there is that router's console.
- **A configuration editor.** A router's running configuration as text; applying an edit
  types only the difference into the router, as `frr-reload` does.
- **Events read from the network itself:** FRR's own log lines (BFD, OSPF adjacencies,
  the dead timer), the kernel's route changes and a probe's replies, each with the
  Machine's own time. The topology, the timeline and the checks all read them.
- **The first mission, The Link That Never Went Down** (stage 4, Recover from failure): a
  link drops every packet while its interfaces stay up. Measure the outage, find what
  noticed, turn on BFD on both ends and run the same fault again. Judged by outcome,
  with golden runs recorded on the real image.
- **Missions judged from a router's state** (daemons running, routes in the kernel,
  reachability, running and saved configuration), for the stages that have no fault.
- **The Peer Map:** the eleven stages of the journey, their missions and where you are.
- The title, settings (display, gameplay, keyboard, saves with export, import and reset,
  privacy, about), the guided tours, keyboard shortcuts, notices, Day and Night print,
  and saves in the browser.
- `lab/`: the same three routers and the same fault on native FRR in a container, with
  the measurements compared in `lab/VALIDATION.md`.

### Known gaps

- Only stage 4 has a mission. Stages 1 and 2 are being written; the rest are planned.
- A tab left in the background has not been tested: the browser may slow the Machine's
  timers and drop a healthy BFD session. Keep the game's tab in front during a run.
- The first visit downloads the Linux image; its size has not been measured yet.
- The game does not work offline yet beyond what the browser has already cached.

[Unreleased]: https://github.com/amrshadid/peerfall/compare/v0.1.0-alpha.3...HEAD
[0.1.0-alpha.3]: https://github.com/amrshadid/peerfall/releases/tag/v0.1.0-alpha.3
[0.1.0-alpha.2]: https://github.com/amrshadid/peerfall/releases/tag/v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/amrshadid/peerfall/releases/tag/v0.1.0-alpha.1
