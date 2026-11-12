# Peerfall lab

The game's network on a real Linux host, outside the browser. One container holds every
router, each in a network namespace of its own with its own FRR daemons, exactly as the
game's VM does. Maintainers use it to check the game's behaviour against native FRR
([VALIDATION.md](VALIDATION.md)); learners use it to repeat a mission's exercise.

The lab types nothing about the network itself. `lab.ts` imports the triangle fixture and
the functions that turn a network into shell lines from `packages/machine`
(`networkSetupLines`, `linkFaultLine`) and runs those lines in the container, so the lab
and the game cannot drift apart.

## What you need

- Docker with Compose, on Linux or in a Linux VM (Docker Desktop, Colima). The host
  kernel must have `veth` and `sch_netem`; it loads them on first use.
- Node.js 22 and `pnpm install` at the repository root.

If Docker runs in a named context (a Colima profile, for example), select it first:
`export DOCKER_CONTEXT=colima-<profile>`.

The image is `alpine:3.24`, pinned by digest, with the same package versions as the VM
image (`frr` 10.6.1, `bash`, `iproute2`, `iproute2-tc`, `iputils-ping`). `up` compares
every installed package with `packages/machine/scripts/vm-image/vm-image.lock.json` and
stops if one differs. The container is privileged: `ip netns` needs `SYS_ADMIN`, the
links and qdiscs need `NET_ADMIN`, and each namespace's `net.ipv4.ip_forward` is written
under `/proc/sys`.

## Start it

From the repository root:

```sh
node lab/lab.ts up      # build the image, start the container, build the network, wait for OSPF
node lab/lab.ts lines   # print the lines `up` and `fault` run, without running them
node lab/lab.ts down    # stop and remove the container
```

`up` returns when every router is `Full` with both neighbors and `a` and `c` reach each
other's loopback over the direct link. It takes about 20 seconds after the first build.

Three routers, `a`, `b` and `c`, in a triangle: `a-b` 10.0.1.0/30, `a-c` 10.0.2.0/30,
`b-c` 10.0.3.0/30, loopbacks 10.255.0.1 to 10.255.0.3, OSPF point-to-point in area 0,
cost 10 on every link.

Open a shell in a router the way the game's terminal does:

```sh
docker compose -f lab/compose.yaml exec lab ip netns exec a bash
vtysh -N a                      # the game's terminal shortens this to `vtysh`
vtysh -N a -c 'show ip ospf neighbor'
ip route get 10.255.0.3
```

Each router's log is `/var/log/frr/<router>.log`, with millisecond timestamps.

## The fault

```sh
node lab/lab.ts fault on    # drop every packet on a-c, both ways
node lab/lab.ts fault off   # stop dropping
```

`fault on` adds `netem loss 100%` to both ends of the `a-c` link. The interfaces stay
`UP,LOWER_UP`: nothing tells the routers the link is broken, which is the point of the
first mission. To watch it, start a probe in `a` first:

```sh
docker compose -f lab/compose.yaml exec lab \
  ip netns exec a ping -D -i 0.05 -I 10.255.0.1 10.255.0.3
```

## The scenarios

```sh
node lab/lab.ts capture                  # all three, about 13 minutes
node lab/lab.ts capture bfd-both-ends    # or one of: baseline, bfd-one-end, bfd-both-ends
```

Each scenario starts from a container built from nothing, turns on `debug bfd peer`,
`debug ospf nsm` and `debug ospf bfd` with `vtysh` (the configuration the game writes is
not changed), waits for a converged network, and then repeats: start the probe and
`ip -ts monitor route` in `a`, wait 3 seconds, break the link, hold, repair it, wait for
the network to be healthy again. The outage is the longest gap between two replies.

| Scenario        | Change before the fault                      | Runs | Fault held |
| --------------- | -------------------------------------------- | ---- | ---------- |
| `baseline`      | none                                         | 3    | 55 s       |
| `bfd-one-end`   | `ip ospf bfd` on `a`'s `a-c` only            | 2    | 55 s       |
| `bfd-both-ends` | `ip ospf bfd` on `a`'s `a-c` and `c`'s `c-a` | 8    | 10 s       |

`capture` leaves the lab down and writes `lab/captures/`:

```
captures/
  environment.txt                  kernel, Alpine, FRR, packages, the namespace's sysctls
  <scenario>/
    results.json                   every run's numbers, and what bfdd said after configuring
    healthy/<router>/              show ip ospf neighbor, show ip ospf interface <if>,
    fault-05s/<router>/            show ip route, show bfd peers, show running-config,
    fault-45s/<router>/            ip -br link, ip route, tc qdisc show: before the fault,
                                   and 5 s and 45 s into the first run's fault
    run-<n>/probe.txt              the probe's output
    run-<n>/ip-monitor-route.txt   a's routing table changes, stamped
    run-<n>/events-<router>.txt    that router's BFD and adjacency log lines for the run
    run-<n>/result.json            the outage and when each end noticed
    logs/<router>.txt              the router's whole FRR log
    logs/<router>-events.txt       its BFD and adjacency lines only
```

`healthy/<router>/show-running-config-before-debug.txt` is the configuration as the game
loads it; `show-running-config.txt` is taken after the debugs and the scenario's change.
All times are the container's clock, in UTC, as FRR writes them. In `result.json` the
`…AfterFault` numbers are seconds from the moment the fault line started. A scenario's
folder is replaced when it is captured again, and the JSON is written through the
repository's formatter so `pnpm check` stays clean.

The lab's scripts are type-checked with `pnpm exec tsc --noEmit -p lab` and linted with
`pnpm exec biome check lab`.

## Compare with the game

1. `pnpm vm:image && pnpm vm:check` boots the same network in the game's VM under Node.
2. Run the same commands in both: the outputs under `captures/<scenario>/healthy/` are
   what the game's terminal should show for a healthy network, apart from timers, MAC
   addresses and interface indexes.
3. Compare the outage per scenario with the emulator's, and the order of the log lines in
   `run-<n>/events-<router>.txt` with the game's timeline.

[VALIDATION.md](VALIDATION.md) records the last comparison and every known difference.
