# Changelog

All notable changes to Peerfall are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). 0.1.0 will be the first four stages of the
journey, complete and checked; until then, releases are alpha pre-releases.

## [Unreleased]

### Added

- **The Silent Router** (stage 1, First router): FRR is installed on a router and not
  running. Find its daemons, start them with FRR's own init script, see watchfrr keep
  them alive, and open `vtysh`.
- **Gone After the Restart** (stage 1): a change that worked until the router restarted.
  The running configuration against the saved `frr.conf`, `write memory`, and a restart of
  FRR before the work is judged.
- **Missions without a fault.** A mission's checks can read the network as it is: the FRR
  daemons that answer, a route in a router's kernel table, whether a router reaches an
  address, a line in the running or the saved configuration. "Check my work" reads it as
  root and judges; a mission can have FRR restarted first.
- `pnpm --filter @peerfall/missions vm:golden <mission-id>` records one mission's golden
  runs and leaves the others as they are.

### Fixed

- The "needs a bigger screen" page fills the window and centres its words at every width,
  instead of sitting in a narrow column at the left on a window just under the limit.

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

[Unreleased]: https://github.com/amrshadid/peerfall/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/amrshadid/peerfall/releases/tag/v0.1.0-alpha.1
