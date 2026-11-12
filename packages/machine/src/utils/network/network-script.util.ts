import {
  FRR_BASE_DAEMONS,
  FRR_DAEMONS,
  IPV4_WITH_PREFIX,
  type LinkDefinition,
  type NetworkDefinition,
  ROUTER_NAME,
  type RouterDefinition,
} from '#types/definitions/network'
import { VM_FRR_USER } from '#types/definitions/vm'

const FRR_BIN = '/usr/lib/frr'
const OWNER = `${VM_FRR_USER.name}:${VM_FRR_USER.name}`

/** The interface on `router` that faces `peer`. */
export const interfaceName = (router: string, peer: string): string => `${router}-${peer}`

/** Where a router's FRR daemons log, with millisecond timestamps. */
export const routerLogPath = (router: string): string => `/var/log/frr/${router}.log`

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
    `ip -n ${first.router} addr add ${first.address} dev ${near}`,
    `ip -n ${second.router} addr add ${second.address} dev ${far}`,
    `ip -n ${first.router} link set ${near} up`,
    `ip -n ${second.router} link set ${far} up`,
  ].join(' && ')
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
    `chown -R ${OWNER} ${dirs.join(' ')}`,
  ].join(' && ')
}

function daemonsLine({ name, daemons }: RouterDefinition): string {
  return [...FRR_BASE_DAEMONS, ...daemons]
    .map((daemon) => `ip netns exec ${name} ${FRR_BIN}/${daemon} -d -N ${name}`)
    .join(' && ')
}

/**
 * Root's lines that build the network on a clean Machine, in order: namespaces, cables, each
 * router's files, its daemons, then its configuration. Check `networkProblems` first.
 */
export function networkSetupLines(network: NetworkDefinition): string[] {
  return [
    ...network.routers.map(namespaceLine),
    ...network.links.map(linkLine),
    ...network.routers.map(filesLine),
    ...network.routers.map(daemonsLine),
    // vtysh -b sends frr.conf to the daemons, as FRR's own start script does.
    ...network.routers.map(({ name }) => `vtysh -N ${name} -b`),
  ]
}

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
