# Peerfall: roadmap

Where the game stands and what comes next, so you can pick something to work on. Open an
issue before you start, so two people don't build the same thing.

## Where it stands

Real FRR 10.6.1 runs in the browser's Linux machine, and missions are judged by what the
network really did. Twenty-six missions are written, fifteen of them playable at
[peerfall.shadid.dev](https://peerfall.shadid.dev). Each has golden runs recorded on the real
image, was fact-checked on the Machine by a reviewer who did not write it, and was played end
to end in the app following its Guide.

| Stage                  | Missions                                                                                                                                                                                | Golden runs | Played in the app | Fact-checked                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------- | ------------------------------- |
| 1 First router         | The Dark Cable, Nobody Answers, The Silent Router, The Router's Language, What It Does Now, Gone After the Restart, The Skipped Line, A Router from Nothing                             | all eight   | all eight         | all eight                       |
| 2 Follow a packet      | Two Ends of One Cable, One Hop Further, The Reply That Never Came Back, Written but Not Used, The Backup Path, Bring the Line Up                                                        | all six     | all six           | all six                         |
| 3 Build an underlay    | Say Hello, The Shared Map, Never Reached Full, The Cheaper Way, Two Ways at Once, Bring It In, Draw the Borders, The Same Map in IPv6, Another Language, Two Levels, Build the Underlay | all eleven  | all eleven        | all eleven                      |
| 4 Recover from failure | The Link That Never Went Down                                                                                                                                                           | yes         | yes               | yes, and against the native lab |
| 5 to 11                | none                                                                                                                                                                                    |             |                   |                                 |

## Milestones

1. **0.1.0, the first four stages.** Stages 1 to 4 complete, each mission true to the
   Machine, fact-checked, played end to end in the app, and leading into the next. The
   game works offline and survives a tab left in the background.
2. **Later.** The remaining stages in the [README](../README.md#what-youll-learn), one
   at a time.

## Next up

### Checking what exists

- **Add stages 1 and 2 to `lab/`**, so they can be repeated on native FRR, and check them
  there.
- **A tab left in the background: settled.** It does drop a healthy BFD session. In Chrome,
  with 4.1's network healthy and BFD on both ends, a tab hidden for 6.5 minutes came back with
  the session to a re-created (a new discriminator, up for 2 min 17 s) while the Machine's
  clock had kept time. A fault run the tab is hidden for is now not judged, and the player is
  told why. Still open: a network built while the window is hidden from the start had not
  finished after 5 minutes; on macOS a window covered by other apps counts as hidden too.
- **First visit's download: measured** on the production build with brotli, cold cache:
  0.3 MB until the title is usable (1.6 MB once the service worker has stored the app),
  15.2 MB until 1.1's terminal is ready (8 MB of it the kernel), 22.2 MB once the rest of the
  machine is cached for offline play.
- **Offline: checked.** After one visit, with the server gone, the title, the Peer Map, 1.1
  (Linux booted) and 4.1 (ospfd and bfdd, never started online) all play. The image's files
  are fetched as Linux opens them, so the service worker now caches the rest of them once a
  network is up.

### Engine

- **A settled read before broadcast OSPF peers are Full:** a network's routing can look quiet
  while peers wait out OSPF's 40-second wait timer, so a read judged then misses the routes
  that follow. Live play catches them with the next read; the golden recorder waits instead.
- **Stage 4's rest:** `vrrpd` is in the image and starts; a VRRP network needs `macvlan`
  loaded, and graceful restart needs a check that routes survive a daemon's restart.

### Content

- **The rest of stage 4:** graceful restart and VRRP.

## Good first contributions

- **Check a mission on real FRR.** Play it, compare every output and number with what a
  real router prints, and open an **Inaccuracy** issue for each difference.
- **Propose a mission** with the Mission proposal issue: one skill, a small network, and
  the outcome that shows it was learned.
