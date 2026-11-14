import type { LinkName, ProbeDefinition } from '#types/definitions/event'
import {
  FRR_BASE_DAEMONS,
  FRR_DAEMONS,
  FRR_INIT,
  FRR_STARTUPS,
  type FrrDaemon,
  IPV4,
  IPV4_WITH_PREFIX,
  type LinkDefinition,
  type NetworkDefinition,
  PROBE_ID,
  PROBE_INTERVAL_MS,
  ROUTER_NAME,
  type RouterDefinition,
} from '#types/definitions/network'
import { VM_EVENT_TTY, VM_FRR_USER } from '#types/definitions/vm'

const FRR_BIN = '/usr/lib/frr'
const OWNER = `${VM_FRR_USER.name}:${VM_FRR_USER.name}`

/** The interface on `router` that faces `peer`. */
export const interfaceName = (router: string, peer: string): string => `${router}-${peer}`

/** Where a router's FRR daemons log, with millisecond timestamps. */
export const routerLogPath = (router: string): string => `/var/log/frr/${router}.log`

/** The copy of a router's frr.conf taken when its FRR last finished starting with its init script. */
export const startedConfigPath = (router: string): string => `/run/pf-started-${router}.conf`

/**
 * Root's line that copies a router's frr.conf each time watchfrr has started every daemon and
 * handed them the file: it writes `watchfrr.started` in the router's run folder then. The copy is
 * what that start really read, whatever the file holds later. inotify is told of the write: the
 * run folder is tmpfs (on the 9p root, frr.conf itself sends no inotify news).
 */
// reads watchfrr/watchfrr.c: the "all daemons up, doing startup-complete notify" path, which writes watchfrr.started
export const startedConfigWatchLine = (router: string): string =>
  `inotifyd - /run/frr/${router}:w 2>/dev/null | while read -r _ _ file; do ` +
  `[ "$file" = watchfrr.started ] && cp /etc/frr/${router}/frr.conf ${startedConfigPath(router)}.new && mv ${startedConfigPath(router)}.new ${startedConfigPath(router)}; ` +
  'done >/dev/null 2>&1 &'

/**
 * Every problem that would make the setup lines wrong or unsafe to run as root. Names and addresses
 * go into shell lines unquoted, so nothing else may pass.
 */
export function networkProblems(network: NetworkDefinition): string[] {
  const problems: string[] = []
  const names = new Set<string>()
  network.routers.forEach((router, at) => {
    const where = `routers[${at}]`
    if (!ROUTER_NAME.test(router.name)) {
      problems.push(`${where}.name: expected a lower-case name of at most 6 characters, got "${router.name}"`)
    } else if (names.has(router.name)) {
      problems.push(`${where}.name: "${router.name}" is used twice`)
    }
    names.add(router.name)
    if (router.loopback !== undefined && !IPV4_WITH_PREFIX.test(router.loopback)) {
      problems.push(`${where}.loopback: expected an address like 10.255.0.1/32, got "${router.loopback}"`)
    }
    for (const daemon of router.daemons) {
      if (!FRR_DAEMONS.includes(daemon)) {
        problems.push(`${where}.daemons: unknown daemon "${daemon}"`)
      }
    }
    if (router.startup !== undefined && !FRR_STARTUPS.includes(router.startup)) {
      problems.push(`${where}.startup: expected one of ${FRR_STARTUPS.join(', ')}, got "${router.startup}"`)
    }
  })
  const pairs = new Set<string>()
  network.links.forEach((link, at) => {
    const where = `links[${at}]`
    const [first, second] = link.ends
    link.ends.forEach((end, side) => {
      if (!names.has(end.router)) {
        problems.push(`${where}.ends[${side}].router: no router named "${end.router}"`)
      }
      if (!IPV4_WITH_PREFIX.test(end.address)) {
        problems.push(`${where}.ends[${side}].address: expected an address like 10.0.2.1/30, got "${end.address}"`)
      }
    })
    if (first.router === second.router) {
      problems.push(`${where}: both ends are on "${first.router}"`)
    }
    // Interfaces are named after the peer, so two cables between the same routers would share a name.
    const pair = [first.router, second.router].sort().join('-')
    if (pairs.has(pair)) {
      problems.push(`${where}: "${first.router}" and "${second.router}" already have a link`)
    }
    pairs.add(pair)
  })
  return problems
}

// Base64 survives any quoting and any byte, so a configuration needs no escaping.
const writeText = (path: string, text: string): string =>
  `echo ${btoa(String.fromCodePoint(...new TextEncoder().encode(text)))} | base64 -d > ${path}`

/** What the Machine puts before a mission's configuration: the events are read from this log. */
export function frrConfig(router: RouterDefinition): string {
  return [
    'frr defaults traditional',
    `hostname ${router.name}`,
    `log file ${routerLogPath(router.name)}`,
    'log timestamp precision 3',
    '!',
    router.config.trimEnd(),
    '',
  ].join('\n')
}

function namespaceLine({ name, loopback }: RouterDefinition): string {
  return [
    `ip netns add ${name}`,
    `ip -n ${name} link set lo up`,
    ...(loopback === undefined ? [] : [`ip -n ${name} addr add ${loopback} dev lo`]),
    // A namespace starts as a host: a router forwards.
    `ip netns exec ${name} sysctl -qw net.ipv4.ip_forward=1`,
  ].join(' && ')
}

function linkLine({ ends: [first, second] }: LinkDefinition): string {
  const near = interfaceName(first.router, second.router)
  const far = interfaceName(second.router, first.router)
  return [
    `ip link add ${near} netns ${first.router} type veth peer name ${far} netns ${second.router}`,
    ...(first.unaddressed ? [] : [`ip -n ${first.router} addr add ${first.address} dev ${near}`]),
    ...(second.unaddressed ? [] : [`ip -n ${second.router} addr add ${second.address} dev ${far}`]),
    `ip -n ${first.router} link set ${near} up`,
    `ip -n ${second.router} link set ${far} up`,
  ].join(' && ')
}

const startupOf = (router: RouterDefinition) => router.startup ?? 'direct'

/**
 * A router's `daemons` file, which FRR's init script reads to know what to start: one line per
 * daemon a mission may ask for. zebra, mgmtd and staticd are not in it: the script starts them
 * whatever it says.
 */
// reads tools/frrcommon.sh.in: daemon_list()
export function frrDaemonsFile(router: RouterDefinition): string {
  return [
    '# Which FRR daemons this router runs. zebra, mgmtd and staticd always start.',
    ...FRR_DAEMONS.filter((daemon) => daemon !== 'staticd').map(
      (daemon) => `${daemon}=${router.daemons.includes(daemon) ? 'yes' : 'no'}`
    ),
    '',
  ].join('\n')
}

// FRR's -N keeps each router's sockets, state and configuration in a folder of its own name.
function filesLine(router: RouterDefinition): string {
  const { name } = router
  const dirs = [`/etc/frr/${name}`, `/run/frr/${name}`, `/var/lib/frr/${name}`, `/lib/frr/${name}`]
  return [
    `mkdir -p ${dirs.join(' ')}`,
    writeText(`/etc/frr/${name}/frr.conf`, frrConfig(router)),
    // vtysh shows its own hostname, which would be the Machine's: the routers share one. Without
    // the second line it would read and write one file per daemon instead of frr.conf.
    writeText(`/etc/frr/${name}/vtysh.conf`, `hostname ${name}\nservice integrated-vtysh-config\n`),
    ...(startupOf(router) === 'direct' ? [] : [writeText(`/etc/frr/${name}/daemons`, frrDaemonsFile(router))]),
    `chown -R ${OWNER} ${dirs.join(' ')}`,
  ].join(' && ')
}

/**
 * A program in a router: its network namespace, and a hostname of its own. On a real router the
 * system's hostname is the router's; here every router shares the Machine's, and a daemon that
 * reports it puts a second `hostname` line in `show running-config`.
 */
export const inRouter = (router: string, program: string): string =>
  `ip netns exec ${router} unshare -u sh -c 'hostname ${router} && exec ${program}'`

function daemonsLine({ name, daemons }: RouterDefinition): string {
  return [...FRR_BASE_DAEMONS, ...daemons]
    .map((daemon) => inRouter(name, `${FRR_BIN}/${daemon} -d -N ${name}`))
    .join(' && ')
}

/**
 * Root's line that starts a router's FRR the way an installed router does: FRR's init script
 * starts watchfrr, which starts the daemons the router's `daemons` file names and hands them
 * frr.conf. For a router whose `startup` is `watchfrr` or `none`: only those have that file.
 */
export const frrStartLine = (router: string): string => inRouter(router, `${FRR_INIT} start ${router}`)

/** Root's line that stops a router's FRR and starts it again from its saved frr.conf. */
export const frrRestartLine = (router: string): string => inRouter(router, `${FRR_INIT} restart ${router}`)

/**
 * Root's lines that build the network on a clean Machine, in order: namespaces, cables, each
 * router's files, its daemons, then its configuration. Check `networkProblems` first.
 */
export function networkSetupLines(network: NetworkDefinition): string[] {
  const direct = network.routers.filter((router) => startupOf(router) === 'direct')
  return [
    ...network.routers.map(namespaceLine),
    ...network.links.map(linkLine),
    ...network.routers.map(filesLine),
    ...direct.map(daemonsLine),
    // vtysh -b sends frr.conf to the daemons, as FRR's own start script does.
    ...direct.map(({ name }) => `vtysh -N ${name} -b`),
    // watchfrr's own start command sends frr.conf once its daemons are up.
    ...network.routers.filter((router) => startupOf(router) === 'watchfrr').map(({ name }) => frrStartLine(name)),
  ]
}

// awk flushes each line as it prints it, so a line reaches the port when it is written, and whole.
const toEventPort = (source: string, name: string): string =>
  `awk '{ print "${source} ${name} " $0; fflush() }' > ${VM_EVENT_TTY}`

/** FRR's own switches for the log lines the events are read from, per daemon that has them. */
// ospfd's own account of BFD, not bfdd's `debug bfd peer`: that one shows in the running
// configuration even when it is given at the prompt, and the player never wrote it.
const DEBUGS: Partial<Record<FrrDaemon, readonly string[]>> = { ospfd: ['debug ospf nsm', 'debug ospf bfd'] }

/**
 * Root's lines that start sending a built network's news to the event port: each router's FRR log
 * from its first line, and every change to its kernel routing table. The debug switches are given
 * at the prompt, not in configure mode, so they never show in a router's running configuration.
 */
export function networkWatchLines(network: NetworkDefinition): string[] {
  return network.routers.flatMap((router) => {
    const { name, daemons } = router
    // A router whose FRR is not running has no daemon to take a debug switch.
    const debugs = startupOf(router) === 'none' ? [] : daemons.flatMap((daemon) => DEBUGS[daemon] ?? [])
    return [
      // Only FRR's init script starts watchfrr; a router whose daemons the Machine starts has none.
      ...(startupOf(router) === 'direct' ? [] : [startedConfigWatchLine(name)]),
      ...(debugs.length === 0 ? [] : [`vtysh -N ${name} ${debugs.map((debug) => `-c '${debug}'`).join(' ')}`]),
      `tail -n +1 -F ${routerLogPath(name)} 2>/dev/null | ${toEventPort('frr', name)} &`,
      // -o keeps a route with several next hops on one line.
      `ip netns exec ${name} ip -o -ts monitor route | ${toEventPort('fib', name)} &`,
    ]
  })
}

/** A link by its two routers, as its events name it. */
export const linkName = ({ ends: [first, second] }: LinkDefinition): LinkName => [first.router, second.router]

/**
 * The fault, with its moment on the event port. The stamp is the control shell's own clock
 * (bash's EPOCHREALTIME, no new process), taken as soon as the first end drops: from then on
 * nothing sent from that end arrives.
 */
export function stampedFaultLine(link: LinkDefinition, dropping: boolean): string {
  const [first, second] = link.ends
  const near = interfaceName(first.router, second.router)
  const far = interfaceName(second.router, first.router)
  const action = dropping ? 'add' : 'del'
  const loss = dropping ? ' netem loss 100%' : ''
  return [
    `tc -n ${first.router} qdisc ${action} dev ${near} root${loss}`,
    `echo "fault ${dropping ? 'on' : 'off'} ${first.router} ${second.router} $EPOCHREALTIME" > ${VM_EVENT_TTY}`,
    `tc -n ${second.router} qdisc ${action} dev ${far} root${loss}`,
  ].join(' && ')
}

const pidFile = (probe: string): string => `/run/pf-probe-${probe}.pid`

/** Every problem that would make a probe's lines wrong or unsafe to run as root. */
export function probeProblems(probe: ProbeDefinition, network: NetworkDefinition): string[] {
  const problems: string[] = []
  if (!PROBE_ID.test(probe.id)) {
    problems.push(`probe.id: expected a lower-case name of at most 16 characters, got "${probe.id}"`)
  }
  if (!network.routers.some((router) => router.name === probe.from)) {
    problems.push(`probe.from: no router named "${probe.from}"`)
  }
  for (const field of ['source', 'destination'] as const) {
    if (!IPV4.test(probe[field])) {
      problems.push(`probe.${field}: expected an address like 10.255.0.3, got "${probe[field]}"`)
    }
  }
  const { min, max } = PROBE_INTERVAL_MS
  if (!(Number.isFinite(probe.intervalMs) && probe.intervalMs >= min && probe.intervalMs <= max)) {
    problems.push(`probe.intervalMs: expected ${min} to ${max}, got ${probe.intervalMs}`)
  }
  return problems
}

/**
 * Starts a probe: ping from the router's namespace, each reply stamped with the time it arrived
 * (-D) and each missing one reported when the next packet leaves (-O). Check `probeProblems` first.
 */
export function probeStartLine({ id, from, source, destination, intervalMs }: ProbeDefinition): string {
  const ping = `ping -D -O -i ${(intervalMs / 1000).toFixed(3)} -I ${source} ${destination}`
  // exec keeps the pid the file names, so stopping the probe stops ping itself.
  return `ip netns exec ${from} sh -c 'echo $$ > ${pidFile(id)}; exec ${ping}' 2>&1 | ${toEventPort('probe', id)} &`
}

export const probeStopLine = (id: string): string => `kill "$(cat ${pidFile(id)})" 2>/dev/null; rm -f ${pidFile(id)}`

/**
 * Drops every packet on a link, both ways, or stops dropping. The interfaces stay up: netem sits
 * on each end's way out, below what the kernel calls the carrier.
 */
export function linkFaultLine({ ends: [first, second] }: LinkDefinition, dropping: boolean): string {
  const near = interfaceName(first.router, second.router)
  const far = interfaceName(second.router, first.router)
  return dropping
    ? `tc -n ${first.router} qdisc add dev ${near} root netem loss 100% && tc -n ${second.router} qdisc add dev ${far} root netem loss 100%`
    : `tc -n ${first.router} qdisc del dev ${near} root && tc -n ${second.router} qdisc del dev ${far} root`
}
