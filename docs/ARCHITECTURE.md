# Peerfall: architecture

How the code fits together. The code rules (layout, imports, file names) are in
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Constraints

- **Client-side only.** A static site; the network runs in the player's browser. No
  backend, no account, and it works offline once loaded.
- **Real FRR on real Linux.** The Machine is a real Linux kernel running FRR's own
  daemons. What players see is what FRR and the kernel do and print; nothing is
  re-implemented.
- **One source of truth.** The terminal, the topology, the probes, the timeline and the
  mission checks all read the same event stream.
- **Same start every time.** Every mission starts from the same saved boot and the same
  setup. Runs are not identical to the millisecond (the Machine keeps real time), so
  checks judge outcomes with a stated tolerance.
- **No timers on the player**, free retries, staged hints.
- **Players start knowing nothing:** each term is explained next to the evidence on screen.

## The Machine

```
 ┌────────────────────────────── Web Worker ─────────────────────────────┐
 │  v86 emulates a 32-bit PC running Alpine Linux                        │
 │                                                                       │
 │   netns a ──────── veth ──────── netns c      one network namespace   │
 │      │   zebra ospfd bfdd  …        │         per router, joined by   │
 │      └── veth ── netns b ── veth ───┘         veth pairs              │
 │                                                                       │
 │  terminal   the player's shell and vtysh, in the selected router      │
 │  control    root's channel: mission setup, faults, probes, reports    │
 │  logs       FRR's log files and the kernel's route changes            │
 └───────────────────────────────┬───────────────────────────────────────┘
                                 │  MachineEvent (bfd_session_down, …)
        ┌──────────────┬─────────┴─────┬───────────────┬───────────────┐
     terminal       topology       timeline         checks        golden runs
```

- **Routers are network namespaces.** Each router is a namespace with its own FRR
  daemons, started with FRR's `-N <name>` so their sockets, configuration and logs stay
  apart. `vtysh -N <name>` is that router's console.
- **Links are veth pairs.** A link's carrier, its data forwarding and its protocol
  packets are separate things on real Linux too: a fault that drops every packet with
  `tc netem` leaves both interfaces up.
- **Forwarding is the kernel's.** ospfd hands routes to zebra, zebra installs them in the
  namespace's Linux routing table, and probes are real packets that follow it.
- **Events** are named after what FRR logs or shows (`fault_injected`,
  `bfd_session_down`, `ospf_dead_timer_expired`, `ospf_adjacency_change`,
  `rib_route_update`, `fib_install`, `probe_sent`, `probe_lost`, `probe_received`) and
  are parsed from FRR's log files, the kernel's route notifications and the probes'
  output, each with the Machine's own timestamp.
- **Runs:** a mission can save a run as a baseline, restore the healthy network, change
  the configuration and replay the same fault.

The image is Alpine Linux for 32-bit x86 with the `frr` package, built from pinned,
checksummed packages. Files are fetched only when the Machine opens them, so the first
visit downloads the kernel and what FRR needs, not the whole image.

## Packages

| Package    | Holds                                                                                     | Depends on    |
| ---------- | ----------------------------------------------------------------------------------------- | ------------- |
| `core`     | the event bus, `ServiceResponse` and its error handler, the logger, storage keys          | nothing       |
| `theme`    | token values: palettes, typography, spacing, motion, colour utils                         | nothing       |
| `machine`  | the VM: v86 in a Web Worker, the image build, router sessions, the event pipeline, hooks  | core          |
| `game`     | a pure engine: mission loop, checks, hints, run comparison, saves; knows no mission by id | core, machine |
| `missions` | the content ([MISSIONS.md](MISSIONS.md)), its loader, the recorder and the golden runs    | game, machine |
| `apps/web` | the game: pages, features, the design system                                              | all           |

Packages hold logic or values, never UI. `lab/` at the repository root runs the same
network on a Linux host, outside the browser.

## Engine and content

- `missions` loads `packages/missions/content/` at build time, parses the YAML, validates
  it with `game`'s schemas, and returns one typed `LoadedContent` or every problem with
  its file and field. Invalid content shows its errors, never a half-valid game.
- `game` judges a mission from events by **outcome** (reachability, recovery time, path
  taken, isolation), never by which command was typed.

## The web app

Pages render containers; containers call package hooks and render one presentation;
presentations take props and call callbacks. Features for the first release: `title`,
`mission`, `guide`, `terminal`, `editor`, `topology`, `timeline`, `debrief`, `settings`,
`tour`, `small-screen`, `shortcuts`, `notices`.

- Link state, loss and recovery use text and icons as well as colour; the whole game is
  usable from the keyboard; there are light and dark themes.
- Below 1024px the game shows a "needs a bigger screen" page.

## Storage

| Data                             | Where                                                |
| -------------------------------- | ---------------------------------------------------- |
| Settings, tour "seen" flags      | localStorage `peerfall:v1:settings`                  |
| Progress, hints used, saved runs | localStorage `peerfall:v1:profile:<slot>`            |
| The app and the image            | Cache Storage, by a service worker (production only) |

Saves go through a `StorageAdapter` the app passes to `configureGame()`. Writes are
atomic, records are versioned (older saves migrate, newer ones are refused, never
overwritten), and without storage the game stays playable in memory and offers an export.

## Testing

All on Vitest; tests sit next to the file they test. Missions have **golden runs**:
scripted player actions on the real image, booted in Node, judged by the mission's own
checks. `pnpm verify` runs lint, types, tests and the build.
