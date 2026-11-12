# Validation: native FRR next to the game's VM

What the lab measured on a real Linux kernel, next to what was measured in the emulator
that the game runs in. Every native number here comes from the files under
[`captures/`](captures/), written by `node lab/lab.ts capture` on 2026-11-12. The
emulator's numbers are the ones recorded when the VM was first tried (FRR 10.6.1 in v86
under Node); the emulator was not run again for this comparison.

## What ran where

|          | Lab (native)                                                | Game's VM (emulator)                     |
| -------- | ----------------------------------------------------------- | ---------------------------------------- |
| CPU      | arm64 (aarch64), 6 CPUs                                     | 32-bit x86, emulated by v86              |
| Kernel   | Linux 6.8.0-139-generic (Ubuntu), the Docker host's         | Alpine `linux-virt` 6.18.63              |
| Userland | Alpine 3.24.4 container, `alpine:3.24` pinned by digest     | Alpine 3.24 x86 root file system over 9p |
| FRR      | `frr` 10.6.1-r0                                             | `frr` 10.6.1-r0                          |
| Network  | the lines from `networkSetupLines(TRIANGLE)`, run unchanged | the same lines                           |
| Fault    | `linkFaultLine(TRIANGLE_DIRECT_LINK, true)`, run unchanged  | the same line                            |
| Probe    | `ping -D -i 0.05 -I 10.255.0.1 10.255.0.3` in `a`           | the same probe                           |

The Docker host was a Colima VM (6 CPUs, 12 GB) on an Apple Silicon Mac, Docker 29.5.2.
Four idle containers from another project were running in the same VM during the
captures (0.01 % to 0.06 % CPU each when sampled).

Every package the VM image's lock names, except the VM's kernel and its static busybox,
is installed in the container at the lock's version (`up` checks this and passed). The
lock's checksums are of the x86 packages and cannot be compared with arm64 ones.

**The machine package's lines needed no change.** All fifteen setup lines and both fault
lines exited with status 0 natively, and OSPF reached `Full` on all three routers.
`sch_netem` and `veth` were available in the host kernel; no nftables fallback was used.

## Results

Outage is the longest gap between two replies of the probe.

| Measure                                   | Lab (native)                                             | Emulator                                                 |
| ----------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Namespaces and links up                   | 0.04, 0.29, 0.08 s (three builds)                        | 3.3 s                                                    |
| FRR daemons started                       | 0.31, 0.93, 0.56 s (twelve: mgmtd too)                   | 17.6 s (nine)                                            |
| OSPF Full on all three after that         | 15.2 s, 15.8 s, 15.2 s (three builds)                    | about 9 s                                                |
| Baseline outage, no BFD                   | 34.811, 39.287, 37.649 s                                 | 34.97 s (one run)                                        |
| `a-c` during the fault                    | `UP,LOWER_UP` on both ends, every run of every scenario  | stays `UP,LOWER_UP`                                      |
| Baseline adjacency change                 | `Full -> Deleted (InactivityTimer)`                      | `Full -> Deleted (InactivityTimer)`                      |
| BFD on one end only: session              | exists on `a`, stays `down`; none on `c`                 | not run                                                  |
| BFD on one end only: outage               | 38.611, 37.585 s                                         | not run                                                  |
| BFD 300 ms x 3 on both ends, eight faults | 0.734, 0.739, 0.756, 0.741, 0.741, 0.791, 0.750, 0.799 s | 1.018, 0.671, 0.784, 0.836, 0.782, 0.785, 0.861, 1.157 s |
| The same, shortest / mean / longest       | 0.734 / 0.756 / 0.799 s                                  | 0.671 / 0.862 / 1.157 s                                  |

The native setup times are sums of the time each line took on the container's clock.

Two earlier runs of the same script, whose files were not kept, gave for BFD on both
ends 0.841, 0.833, 0.797, 0.797, 0.799, 0.927, 0.684, 0.794 s and 0.810, 0.764, 0.851,
0.752, 0.752, 0.712, 0.864, 0.873 s; for the baseline 32.648, 39.262, 39.281 s; and for
BFD on one end 35.598, 30.486 s. Over all 24 native BFD faults the outage was between
0.684 and 0.927 s: none reached one second, and all are under the mission's 2 s target.

### Baseline

OSPF's dead timer is 40 s and restarts with every hello, sent every 10 s. Each end
dropped the other between 34.2 and 39.5 s after the fault, when its own timer expired:

| Run | `c` dead timer | `a` dead timer | `a`'s route moved to `b` | First reply | Outage   |
| --- | -------------- | -------------- | ------------------------ | ----------- | -------- |
| 1   | +34.229 s      | +34.549 s      | +34.259 s                | +34.791 s   | 34.811 s |
| 2   | +39.234 s      | +39.542 s      | +39.248 s                | +39.250 s   | 39.287 s |
| 3   | +37.605 s      | +37.898 s      | +37.621 s                | +37.634 s   | 37.649 s |

Times are from the moment the fault line started. Five seconds into the fault `a` still
showed `c` as `Full` with the dead time counting down (29.421 s left) and still routed
10.255.0.3 over `a-c`; at 45 s `c` was gone from `a`'s neighbor table and the route went
through `b` (`captures/baseline/fault-05s`, `fault-45s`).

The emulator's single 34.97 s lies inside the native range. The value depends on how
long before the fault the last hello arrived, so one run is one sample from a ten-second
window; runs 2 and 3 start a fixed time after the adjacency re-formed, which is why they
are close to each other.

### BFD on one end only

`ip ospf bfd` on `a`'s `a-c` creates a BFD session on `a` (`session-new` in the log)
that never comes up: `show bfd peers` on `a` reported `Status: down` with `Remote ID: 0`
for the whole 15 s watch and before the fault, `c` had no session at all, and `c`'s log
has no BFD line besides its start-up. No `state-change` line was ever logged. The fault
was then noticed only by the dead timers (`a` +36.358 and +36.785 s, `c` +35.977 and
+36.430 s), exactly as in the baseline, and the outage was 38.611 and 37.585 s. When
`a` dropped the neighbor its BFD session was deleted (`session-delete`) and created
again when the adjacency returned.

### BFD on both ends

| Run | `a` BFD down | `c` BFD down | `a`'s route moved to `b` | Outage  |
| --- | ------------ | ------------ | ------------------------ | ------- |
| 1   | +0.662 s     | +0.751 s     | +0.677 s                 | 0.734 s |
| 2   | +0.680 s     | +0.676 s     | +0.688 s                 | 0.739 s |
| 3   | +0.709 s     | +0.708 s     | +0.719 s                 | 0.756 s |
| 4   | +0.797 s     | +0.681 s     | +0.695 s                 | 0.741 s |
| 5   | +0.857 s     | +0.656 s     | +0.669 s                 | 0.741 s |
| 6   | +0.732 s     | +0.783 s     | +0.744 s                 | 0.791 s |
| 7   | +0.689 s     | +0.816 s     | +0.700 s                 | 0.750 s |
| 8   | +0.757 s     | +0.887 s     | +0.769 s                 | 0.799 s |

`a`'s route moved 11 to 15 ms after the **first** of the two ends declared the session
down, whichever end that was. In runs 4 and 5 that was `c`: `a` installed the path
through `b` before its own BFD session expired, because `c`'s new router LSA, which no
longer lists `a`, reached it first. The outage is therefore set by the faster end.

After the repair the adjacency came back with the next hello, the BFD session was
created again during the database exchange and came up 1.75 s later in run 1, and the
network was healthy again 4.8 to 10.4 s after the repair. Moving back to the direct
route cost nothing: the longest gap between replies after the repair was 0.084 s.

## Differences from the emulator

1. **Recovery with BFD is faster and steadier natively.** 0.734 to 0.799 s in the kept
   run (0.684 to 0.927 s over 24 faults), against 0.671 to 1.157 s in the emulator. Two
   of the emulator's eight runs exceeded one second; no native run did. Both are under
   the 2 s target.
2. **Everything that waits on the CPU is far faster natively**: namespaces and links
   in under 0.3 s against 3.3 s, daemons in under 1 s against 17.6 s.
3. **OSPF took longer to reach Full natively**, about 15 s against about 9 s, counted
   from the last setup line. Natively the daemons start within a second, the first
   hellos are received at once (`Down -> Init`) and the adjacency forms on the next
   hello ten seconds later. In the emulator the daemons take 17.6 s to start, so the
   two numbers do not start counting at the same point of the hello cycle.
4. **The probe is not steady while the next hop cannot be resolved.** In baseline and
   one-end runs where the fault lasted long enough, the kernel's neighbor entry for
   10.0.2.2 on `a-c` went `REACHABLE`, `DELAY`, `PROBE`, `INCOMPLETE`, then `FAILED`
   (ARP is dropped by the fault too). From then on `ping` printed
   `From 10.255.0.1 icmp_seq=N Destination Host Unreachable` in bursts about three
   seconds apart and sent far fewer probes: 219 in the 34.8 s gap of baseline run 1,
   where twenty a second would be about 696. The first reply after the route moved can
   then come late: 0.53 s after it in baseline run 1, and 2.57 s and 1.10 s in the two
   one-end runs, against 2 to 45 ms in the runs without those lines. The outage measured
   by the probe is that much longer than the routing outage. Whether the emulator shows
   the same lines was not recorded when it was measured.
5. **Reverse-path filtering.** The namespaces report `net.ipv4.conf.all.rp_filter = 2`
   and `default.rp_filter = 2` natively, inherited from the Ubuntu host. The VM's values
   were not read.
6. **Kernel details in output** differ and always will: interface indexes
   (`a-c@if2`), MAC addresses, `nhid` numbers, the `seed` netem prints.

## Seen natively, not yet compared in the VM

- `show running-config` prints `hostname peerfall` (the container's host name, which is
  also the VM's) and then `hostname a`.
- After `debug bfd peer`, `debug ospf nsm` and `debug ospf bfd`, `show running-config`
  shows `debug bfd peer` only.
- **Without those debugs the log has only the `AdjChg` lines.** A fault with BFD on both
  ends and no debug logged `AdjChg: … Full -> Deleted (InactivityTimer)` and nothing
  from bfdd or about BFD from ospfd. The BFD `state-change` lines need `debug bfd peer`,
  `ospf_bfd_session_change` needs `debug ospf bfd`, and `Timer (Inactivity timer expire)`
  needs `debug ospf nsm`.
- The adjacency change reads `Full -> Deleted (InactivityTimer)` whether the dead timer
  or BFD brought it down. Only the line before it tells them apart.
- A BFD session's first rise is logged as `down -> up`; after a fault and repair it is
  `init -> up`.
- ospfd deletes the BFD session when the neighbor is deleted, so during the fault
  `show bfd peers` is empty on both ends (`captures/bfd-both-ends/fault-05s`).

## Log lines

Copied from `captures/`; the times are UTC on the container's clock.

BFD session up, and OSPF hearing of it (`bfd-both-ends/logs/a.txt`):

```
2026/11/12 18:10:39.986 BFD: [PSB4R-8T1TJ] session-new: mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c
2026/11/12 18:10:41.079 BFD: [J1C6V-VMRW5] state-change: [mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c] down -> up
2026/11/12 18:10:41.079 OSPF: [KYGCS-7CT60] ospf_bfd_session_change: NSM[a-c:10.0.2.1:10.0.2.2]: BFD Up
```

BFD session down and the adjacency change it causes (`bfd-both-ends/run-1/events-a.txt`,
fault at 18:11:10.873):

```
2026/11/12 18:11:11.536 BFD: [SEY1D-NT8EQ] state-change: [mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c] up -> down reason:control-expired
2026/11/12 18:11:11.538 OSPF: [X1ZWK-2050W] ospf_bfd_session_change: NSM[a-c:10.0.2.1:10.0.2.2]: BFD Down
2026/11/12 18:11:11.538 OSPF: [J91RT-VKRP4] NSM[a-c:10.0.2.1:10.255.0.3:default]: State change Full -> Deleted (InactivityTimer)
2026/11/12 18:11:11.538 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.3, NbrIP 10.0.2.2 (default) on a-c:10.0.2.1: Full -> Deleted (InactivityTimer)
2026/11/12 18:11:11.539 BFD: [NW21R-MRYNT] session-delete: mhop:no peer:10.0.2.2 local:10.0.2.1 vrf:default ifname:a-c
```

The dead timer expiring and the adjacency change (`baseline/run-1/events-a.txt`, fault
at 18:02:49.722):

```
2026/11/12 18:03:24.271 OSPF: [YZVTF-RQXRK] NSM[a-c:10.0.2.1:10.255.0.3:default]: Timer (Inactivity timer expire)
2026/11/12 18:03:24.272 OSPF: [J91RT-VKRP4] NSM[a-c:10.0.2.1:10.255.0.3:default]: State change Full -> Deleted (InactivityTimer)
2026/11/12 18:03:24.272 OSPF: [Y05P2-YJVXY] AdjChg: Nbr 10.255.0.3, NbrIP 10.0.2.2 (default) on a-c:10.0.2.1: Full -> Deleted (InactivityTimer)
```

`ip -ts -n a monitor route` across the same BFD run: the failover, then the repair
(`bfd-both-ends/run-1/ip-monitor-route.txt`). A replaced route is printed as the new
route; there is no `Deleted` line.

```
[2026-11-12T18:11:11.551740] 10.0.3.0/30 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 
[2026-11-12T18:11:11.551806] 10.255.0.3 nhid 15 via 10.0.1.2 dev a-b proto ospf metric 20 
[2026-11-12T18:11:23.838675] 10.0.3.0/30 nhid 19 proto ospf metric 20 
	nexthop via 10.0.1.2 dev a-b weight 1 
	nexthop via 10.0.2.2 dev a-c weight 1 
[2026-11-12T18:11:23.838696] 10.255.0.3 nhid 20 via 10.0.2.2 dev a-c proto ospf metric 20 
```

## Not done

- The emulator was not re-run, so the show-command outputs were not compared line by
  line with the VM's, and the points under "Seen natively" are unconfirmed there.
- BFD on one end only has not been run in the emulator.
- BFD at 100 ms x 3, which the emulator was also tried with, was not run natively.
- Nothing here ran in a browser.
