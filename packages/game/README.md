# @peerfall/game

The game's rules, with no mission built in: mission definitions and their schema, checks that
judge a run from the Machine's events or the player's work from the Machine's state, the run summary and comparison behind the timeline and the
debrief, staged hints, and the player's progress saved in the browser. The missions themselves
come from `@peerfall/missions`.

> **Note:** this package holds logic only. The app uses `configureGame()`, `setupGameListeners()`,
> `/hooks`, `/types` and `/utils`; the screens live in `apps/web/src/features/`.

## Structure

```
src/
├── config.ts                 → configureGame({ storage, content, clock, slot, autosave }), getGameConfig,
│                               getGameNow, resetGameConfig
├── events/
│   ├── types.ts              → GAME_EVENTS (opened, mission started/completed, run recorded, hint revealed,
│   │                           saved, save failed, progress changed/reset) + payloads
│   └── listeners.ts          → setupGameListeners / cleanupGameListeners: autosave on PROGRESS_CHANGED
├── hooks/
│   ├── mission/              → useMissionActions (start, begin, judge, saveBaseline, submitRun, showDebrief,
│   │                           leave), useActiveMission, useMissionList
│   ├── hints/                → useHints, revealHint
│   ├── runs/                 → useRunComparison
│   ├── saves/                → useSaveActions (open, saveNow, exportSave, importSave, reset)
│   └── progress/             → useProgress
├── services/
│   ├── api/save.api.ts       → saveApi: load, write, remove (atomic writes, `.prev` fallback)
│   └── utils/                → the save queue, saveProgress, announceProgress, storage keys, and the game's
│                               failures as ServiceResponses (locked mission, invalid save…)
├── store/progress.store.ts   → missions completed, hints used, saved runs, the active mission, save state
├── types/definitions/
│   ├── mission.ts            → MissionDefinition, ObjectiveDefinition, HintDefinition, ChapterDefinition
│   ├── checks.ts             → CheckDefinition (the `check:` kinds), CheckResult, MissionVerdict
│   ├── runs.ts               → RunSummary, RunComparison, SavedRun
│   ├── content.ts            → GameContent
│   └── progress.ts, saves.ts, store.ts, config.ts
├── utils/
│   ├── validate/             → validateMission (mission.yaml), validateChapters (chapters.yaml), readNetwork,
│   │                           readCheck
│   ├── content/              → createGameContent: ids, chapters and prerequisites checked together
│   ├── checks/               → judgeMission, evaluateCheck, one file per run check (reachability, path,
│   │                           recovery, outage, detection), and state-checks: stateRequestOf,
│   │                           hasStateChecks, hasRunChecks, evaluateStateCheck
│   ├── runs/                 → summariseRun, compareRuns
│   ├── routes/               → routeChanges, routeAt: the kernel's route to a destination over a run;
│   │                           longestPrefixMatch, samePrefix
│   ├── events/               → inTimeOrder, faultWindow, probeReplies
│   ├── hints/                → revealedHints, nextHint, hintsUsed
│   ├── progress/             → missionStatus, missionList, startMission, recordRun, savedComparison…
│   └── saves/                → readSaveFile, importSave, exportSave, migrations
├── test/                     → example mission and chapters, event streams of the fault (baseline, BFD on one
│                               end, BFD on both), fake clock, memory storage, installTestGame (not exported)
└── index.ts                  → configureGame, setupGameListeners, cleanupGameListeners
```

## Key Features

- **A pure engine:** no mission is known by id. Content is validated file by file
  (`validateMission`, `validateChapters`) and bundled by `createGameContent({ chapters, missions })`;
  every problem comes back with the path of its field.
- **Judged by outcome:** a mission's `check:` blocks read outcomes and nothing else. Run checks
  (`reachable`, `path`, `recovery`, `outage`, `detected-by`) read the events of a probe and a fault.
  State checks (`daemons`, `route`, `reaches`, `config`) read the Machine as root found it: the
  daemons that answer, the kernel's routes, a ping, the running and the saved configuration. No check
  can see which command was typed.
- **Missions without a fault:** `fault`, `probe` and `recoveryTargetMs` are optional; the schema asks
  for them only where a check reads them. `stateRequestOf(mission)` says what a mission's state checks
  need read, the flow in `@peerfall/missions` reads it, and `judgeMission(mission, events, state)`
  stays pure. A state check is `not_checked` until then. `restartOnCheck` names routers whose FRR is
  restarted before the reading.
- **By time, not arrival:** FRR's log lines reach the game later than route and probe lines, so
  everything sorts events by `timeMs` first. Runs differ by milliseconds, so limits are "under the
  recovery target", never exact times.
- **The kernel's own path:** the path taken is the longest-prefix route in the router's `fib_install`
  events. Equal-cost next hops don't count as using one of them.
- **Either end detects:** what noticed the fault is the earliest `bfd_session_down` or
  `ospf_dead_timer_expired` on either end of the broken link. The far end is often first, and the
  probe's router may move its route before its own timer fires.
- **Never lose progress:** every change autosaves before its flow resolves; writes are atomic
  (`.next`, then swap, `.prev` kept); a save that can't be read or is from a newer game is never
  overwritten; with no storage the game plays in memory and `exportSave()` is the way out.
- **Free retries, staged hints:** attempts and hints used are recorded and never held against the
  player. An objective's hints go from where to look to a specific command.
- **Flows without React:** `createMissionActions()`, `createSaveActions()` and `revealHint()` are plain
  functions; the hooks only memoize them.

## Dependencies

- `@peerfall/core`: event bus, service responses, storage adapter, `ObjectReader`
- `@peerfall/machine`: the event and network types, `networkProblems`, `interfaceName`
- `zustand`: the progress store
- `react` (peer): only for the hooks
