import { isRecord } from '@peerfall/core/utils'
import { IPV4, ROUTER_NAME } from '#types/definitions/network'
import {
  type KernelRoute,
  PING_MAX_COUNT,
  type PingRequest,
  type PingResult,
  type RibRoute,
  ROUTER_STATE_PARTS,
  type RouterState,
  type RouterStatePart,
  type StateRequest,
} from '#types/definitions/state'
import { configReadLine, runningConfigText } from '#utils/config/config-diff.util'
import { startedConfigPath } from '#utils/network/network-script.util'

/** Printed before each part of a router's state, so one control line can read several. */
const PART_MARK = '__PF_STATE__'

/**
 * Every problem that would make the state lines wrong or unsafe to run as root. Names and
 * addresses go into shell lines unquoted, so nothing else may pass.
 */
export function stateRequestProblems(request: StateRequest): string[] {
  const problems: string[] = []
  for (const [router, parts] of Object.entries(request.routers)) {
    if (!ROUTER_NAME.test(router)) {
      problems.push(`routers: expected a router's name, got "${router}"`)
    }
    for (const part of parts) {
      if (!ROUTER_STATE_PARTS.includes(part)) {
        problems.push(`routers.${router}: unknown part "${part}"`)
      }
    }
  }
  request.pings.forEach((ping, at) => {
    if (!ROUTER_NAME.test(ping.from)) {
      problems.push(`pings[${at}].from: expected a router's name, got "${ping.from}"`)
    }
    if (!IPV4.test(ping.to)) {
      problems.push(`pings[${at}].to: expected an address like 10.0.1.2, got "${ping.to}"`)
    }
    if (!(Number.isInteger(ping.count) && ping.count >= 1 && ping.count <= PING_MAX_COUNT)) {
      problems.push(`pings[${at}].count: expected 1 to ${PING_MAX_COUNT}, got ${ping.count}`)
    }
  })
  return problems
}

const PART_COMMANDS: Readonly<Record<RouterStatePart, (router: string) => string>> = {
  // vtysh names the daemons it reached; with none running it says so and fails.
  daemons: (router) => `vtysh -N ${router} -c 'show daemons' 2>&1`,
  // -o keeps a route with several next hops on one line.
  routes: (router) => `ip -n ${router} -o route show 2>&1`,
  // Through a pipe: straight onto the control channel's terminal, the whole table's JSON came out empty.
  rib: (router) => `vtysh -N ${router} -c 'show ip route json' 2>&1 | cat`,
  runningConfig: (router) => `${configReadLine(router)} 2>&1`,
  savedConfig: (router) => `cat /etc/frr/${router}/frr.conf 2>/dev/null`,
  startedConfig: (router) => `cat ${startedConfigPath(router)} 2>/dev/null`,
}

/** Root's line that reads the asked parts of one router, each after a line that names it. */
export function routerStateLine(router: string, parts: readonly RouterStatePart[]): string {
  // The last command's status is not the line's: a router whose FRR is down is an answer, not a failure.
  return [...parts.flatMap((part) => [`echo ${PART_MARK} ${part}`, PART_COMMANDS[part](router)]), 'true'].join('; ')
}

const DAEMON_NAME = /^[a-z][a-z0-9]*$/

/**
 * The daemons `show daemons` names: ` mgmtd zebra staticd watchfrr`. Empty when vtysh reached
 * none and said `Exiting: failed to connect to any daemons.` instead.
 */
export function parseDaemons(output: string): string[] {
  const line = output.replaceAll('\r', '').trim()
  const words = line.split(/\s+/).filter(Boolean)
  return words.every((word) => DAEMON_NAME.test(word)) ? words : []
}

// reads iproute2 ip/iproute.c: print_route(): a route that forwards nowhere starts with its type.
const ROUTE_TYPES = new Set(['blackhole', 'unreachable', 'prohibit', 'throw', 'local', 'broadcast', 'anycast'])
const NEXT_HOP = /(?:via (\S+) )?dev (\S+)/g
const PROTOCOL = /proto (\S+)/
const PREFIX = /^(default|\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?)$/

/**
 * A router's kernel routing table from `ip -o route show`:
 * `10.0.2.0/30 nhid 12 via 10.0.1.2 dev a-b proto static metric 20`. Lines that are not IPv4
 * routes (an error, an empty table) are left out.
 */
export function parseKernelRoutes(output: string): KernelRoute[] {
  const routes: KernelRoute[] = []
  for (const raw of output.replaceAll('\r', '').split('\n')) {
    const words = raw.trim().split(/\s+/)
    const typed = ROUTE_TYPES.has(words[0] ?? '')
    const prefix = (typed ? words[1] : words[0]) ?? ''
    if (!PREFIX.test(prefix)) {
      continue
    }
    const rest = raw.slice(raw.indexOf(prefix) + prefix.length)
    routes.push({
      prefix,
      protocol: PROTOCOL.exec(rest)?.[1] ?? '',
      nextHops: typed
        ? []
        : [...rest.matchAll(NEXT_HOP)].map((hop) => ({ via: hop[1] ?? null, interface: hop[2] ?? '' })),
    })
  }
  return routes
}

const numberOr = (value: unknown, fallback: number): number => (typeof value === 'number' ? value : fallback)

function readRibRoute(entry: unknown): RibRoute[] {
  if (!isRecord(entry) || typeof entry.prefix !== 'string' || typeof entry.protocol !== 'string') {
    return []
  }
  const hops = Array.isArray(entry.nexthops) ? entry.nexthops.filter(isRecord) : []
  return [
    {
      prefix: entry.prefix,
      protocol: entry.protocol,
      distance: numberOr(entry.distance, 0),
      metric: numberOr(entry.metric, 0),
      // FRR leaves `selected` and `installed` out of a route that is neither, rather than writing false.
      selected: entry.selected === true,
      installed: entry.installed === true,
      nextHops: hops.map((hop) => ({
        via: typeof hop.ip === 'string' ? hop.ip : null,
        interface: typeof hop.interfaceName === 'string' ? hop.interfaceName : null,
      })),
    },
  ]
}

/**
 * Zebra's routes from `show ip route json` (or `show ip route <prefix> json`): an object of
 * prefixes, each with every route zebra holds for it, selected or not. Anything else (vtysh
 * reaching no daemon) is no routes.
 */
export function parseRibRoutes(output: string): RibRoute[] {
  const start = output.indexOf('{')
  if (start < 0) {
    return []
  }
  let table: unknown
  try {
    table = JSON.parse(output.slice(start))
  } catch {
    return []
  }
  if (!isRecord(table)) {
    return []
  }
  return Object.values(table).flatMap((routes) => (Array.isArray(routes) ? routes.flatMap(readRibRoute) : []))
}

/** What one router's state line printed, split back into its parts. */
export function parseRouterState(output: string): RouterState {
  const sections = new Map<string, string>()
  let current: string | null = null
  // Without the last line's end, so a part's text ends as the file or the command ended it.
  for (const line of output.replaceAll('\r', '').replace(/\n$/, '').split('\n')) {
    if (line.startsWith(`${PART_MARK} `)) {
      current = line.slice(PART_MARK.length + 1).trim()
      sections.set(current, '')
    } else if (current !== null) {
      sections.set(current, `${sections.get(current) ?? ''}${line}\n`)
    }
  }
  const daemons = sections.get('daemons')
  const routes = sections.get('routes')
  const rib = sections.get('rib')
  const running = sections.get('runningConfig')
  const saved = sections.get('savedConfig')
  const started = sections.get('startedConfig')
  return {
    ...(daemons !== undefined && { daemons: parseDaemons(daemons) }),
    ...(routes !== undefined && { routes: parseKernelRoutes(routes) }),
    ...(rib !== undefined && { rib: parseRibRoutes(rib) }),
    // vtysh prints the configuration only when a daemon answered.
    ...(running !== undefined && {
      runningConfig: running.includes('Current configuration:') ? runningConfigText(running) : null,
    }),
    ...(saved !== undefined && { savedConfig: saved.trim() === '' ? null : saved }),
    ...(started !== undefined && { startedConfig: started.trim() === '' ? null : started }),
  }
}

/** Seconds a packet's reply is waited for: on the Machine a reply takes a few milliseconds. */
const PING_WAIT_S = 1
const PING_INTERVAL_S = 0.2

/** Root's line that sends a few packets from a router's namespace. Check `stateRequestProblems` first. */
export const pingLine = ({ from, to, count }: PingRequest): string =>
  `ip netns exec ${from} ping -c ${count} -i ${PING_INTERVAL_S} -W ${PING_WAIT_S} ${to} 2>&1; true`

// `3 packets transmitted, 0 received, +2 errors, 100% packet loss, time 686ms`
const PING_SUMMARY = /(\d+) packets transmitted, (\d+) received/

/**
 * What ping reported. With no route at all ping sends nothing and prints no summary
 * (`ping: connect: Network unreachable`): that is every packet unanswered.
 */
export function parsePing(request: PingRequest, output: string): PingResult {
  const summary = PING_SUMMARY.exec(output)
  return {
    from: request.from,
    to: request.to,
    sent: summary ? Number(summary[1]) : request.count,
    received: summary ? Number(summary[2]) : 0,
  }
}
