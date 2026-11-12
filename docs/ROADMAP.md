# Peerfall: roadmap

Where the game stands and what comes next, so you can pick something to work on. Open an
issue before you start, so two people don't build the same thing.

## Where it stands

The repository and its packages are in place. Real FRR has been shown to run in the
browser's Linux machine: three routers, OSPF, BFD, and a fault that drops packets while
the interfaces stay up. Nothing is playable yet.

## Milestones

1. **0.1.0, The Link That Never Went Down.** One complete, replayable mission: a warm-up,
   the baseline outage, BFD on both ends, the same fault replayed, and a debrief. The
   game works offline.
2. **Later.** The eleven stages in the [README](../README.md#what-youll-learn), which
   cover FRR from end to end, one stage at a time, starting with stages 1 to 4.

## Next up, in order

1. **The Machine:** the image build with FRR, the VM session, one terminal per router,
   mission setup, the fault, probes, and the event stream from FRR's logs.
2. **The lab:** the same network and fault on a Linux host, with the Machine's behaviour
   compared against it.
3. **The engine and the first mission:** the mission format, the loader, outcome checks,
   and the golden runs.
4. **The game:** workspace, terminal, editor, topology, timeline, guide, debrief.
5. **Saves, the tour, the small-screen page, offline play, and the first deploy.**
