import type { StringRule } from '@peerfall/core/types'
import type { ObjectReader } from '@peerfall/core/utils'
import {
  FRR_BASE_DAEMONS,
  FRR_DAEMONS,
  IPV4,
  IPV4_WITH_PREFIX,
  IPV6,
  IPV6_WITH_PREFIX,
  OSPF_LSA_TYPES,
  PING_MAX_SIZE,
} from '@peerfall/machine/types'
import {
  CHECK_KINDS,
  type CheckDefinition,
  type CheckKind,
  CONFIG_SOURCES,
  DETECTION_EVENTS,
  PEER_PROTOCOLS,
  REACH_PACKETS,
} from '#types/definitions/checks'

/** The fields each kind of check takes besides `kind`; anything else is reported as a typo. */
const CHECK_FIELDS: Readonly<Record<CheckKind, readonly string[]>> = {
  reachable: ['minReplies'],
  path: ['before', 'after'],
  recovery: ['via', 'withinMs'],
  outage: ['maxMs'],
  'detected-by': ['event'],
  daemons: ['router', 'daemons'],
  route: ['router', 'prefix', 'to', 'protocol', 'via', 'vias', 'interface'],
  rib: ['router', 'prefix', 'protocol', 'via', 'selected'],
  reaches: ['from', 'to', 'minReplies', 'size'],
  config: ['router', 'source', 'block', 'line', 'absent'],
  peer: ['router', 'protocol', 'peer', 'interface', 'level'],
  lsa: ['router', 'type', 'id', 'area', 'advRouter', 'absent'],
}

/** Every FRR process a `daemons` check may name: watchfrr, which starts the others, counts as one. */
const CHECKED_DAEMONS = ['watchfrr', ...FRR_BASE_DAEMONS, ...FRR_DAEMONS] as const

const either = (first: RegExp, second: RegExp) => new RegExp(`(?:${first.source})|(?:${second.source})`)

const ADDRESS: StringRule = { pattern: IPV4, expected: 'an address like 10.0.1.2' }
const PREFIX: StringRule = { pattern: IPV4_WITH_PREFIX, expected: 'a prefix like 10.0.1.0/30' }
const ANY_ADDRESS: StringRule = { pattern: either(IPV4, IPV6), expected: 'an address like 10.0.1.2 or fd00::2' }
const ANY_PREFIX: StringRule = {
  pattern: either(IPV4_WITH_PREFIX, IPV6_WITH_PREFIX),
  expected: 'a prefix like 10.0.1.0/30 or fd00::2/128',
}
// OSPF writes router ids, LSA ids and areas as dotted quads: 10.255.0.2, 0.0.0.1.
const DOTTED: StringRule = { pattern: IPV4, expected: 'a dotted id like 10.255.0.2 or 0.0.0.1' }
// As `ip route` names who installed a route: kernel, static, ospf…
const PROTOCOL: StringRule = { pattern: /^[a-z][a-z0-9]*$/, expected: 'a protocol as ip route names it, like static' }
// As zebra names a route's source in `show ip route json`: connected, local, static, ospf…
const RIB_PROTOCOL: StringRule = { pattern: /^[a-z][a-z0-9-]*$/, expected: 'a protocol as FRR names it, like static' }

function readRib(check: ObjectReader): Extract<CheckDefinition, { kind: 'rib' }> {
  const protocol = check.optional('protocol', (key) => check.string(key, RIB_PROTOCOL))
  const via = check.optional('via', (key) => check.string(key, ANY_ADDRESS))
  const selected = check.optional('selected', (key) => check.flag(key))
  return {
    kind: 'rib',
    router: check.string('router'),
    prefix: check.string('prefix', ANY_PREFIX),
    ...(protocol !== undefined && { protocol }),
    ...(via !== undefined && { via }),
    ...(selected !== undefined && { selected }),
  }
}

function readRoute(check: ObjectReader): Extract<CheckDefinition, { kind: 'route' }> {
  const prefix = check.optional('prefix', (key) => check.string(key, PREFIX))
  const to = check.optional('to', (key) => check.string(key, ADDRESS))
  const protocol = check.optional('protocol', (key) => check.string(key, PROTOCOL))
  const via = check.optional('via', (key) => check.string(key, ADDRESS))
  const vias = check.optional('vias', (key) => check.stringList(key, ADDRESS))
  const name = check.optional('interface', (key) => check.string(key))
  if ((prefix === undefined) === (to === undefined)) {
    check.issues.add(
      check.path,
      'expected "prefix" (that exact route) or "to" (the route an address would use), not both'
    )
  }
  if (via !== undefined && vias !== undefined) {
    check.issues.add(check.path, 'expected "via" (one next hop) or "vias" (every next hop), not both')
  }
  if (vias !== undefined && (vias.length < 2 || new Set(vias).size !== vias.length)) {
    check.issues.add(check.pathOf('vias'), 'expected two or more different next hops; for one, use "via"')
  }
  return {
    kind: 'route',
    router: check.string('router'),
    ...(prefix !== undefined && { prefix }),
    ...(to !== undefined && { to }),
    ...(protocol !== undefined && { protocol }),
    ...(via !== undefined && { via }),
    ...(vias !== undefined && { vias }),
    ...(name !== undefined && { interface: name }),
  }
}

function readPeer(check: ObjectReader): Extract<CheckDefinition, { kind: 'peer' }> {
  const protocol = check.oneOf('protocol', PEER_PROTOCOLS)
  const name = check.optional('interface', (key) => check.string(key))
  const level = check.optional('level', (key) => check.integer(key, 1, 2))
  if (level !== undefined && protocol !== 'isis') {
    check.issues.add(check.pathOf('level'), 'only an IS-IS peer has a level')
  }
  return {
    kind: 'peer',
    router: check.string('router'),
    protocol,
    // OSPF names a peer by its router id; IS-IS by its hostname or system id.
    peer: protocol === 'isis' ? check.string('peer') : check.string('peer', DOTTED),
    ...(name !== undefined && { interface: name }),
    ...(level !== undefined && { level }),
  }
}

function readLsa(check: ObjectReader): Extract<CheckDefinition, { kind: 'lsa' }> {
  const type = check.oneOf('type', OSPF_LSA_TYPES)
  const area = check.optional('area', (key) => check.string(key, DOTTED))
  const advRouter = check.optional('advRouter', (key) => check.string(key, DOTTED))
  if (type === 'external' && area !== undefined) {
    check.issues.add(check.pathOf('area'), 'an external LSA belongs to no area: leave "area" out')
  } else if (type !== 'external' && area === undefined) {
    check.issues.add(check.path, `expected "area": a ${type} LSA sits in one area's database`)
  }
  return {
    kind: 'lsa',
    router: check.string('router'),
    type,
    id: check.string('id', DOTTED),
    ...(area !== undefined && { area }),
    ...(advRouter !== undefined && { advRouter }),
    ...(check.flag('absent') && { absent: true }),
  }
}

/** Reads an objective's `check:` block. Whether its routers and interfaces exist is the mission's to check. */
export function readCheck(check: ObjectReader): CheckDefinition {
  const problemsSoFar = check.issues.count
  const kind = check.oneOf('kind', CHECK_KINDS)
  // With no kind to go by, the other fields can't be told from typos.
  if (check.issues.count > problemsSoFar) {
    return { kind: 'reachable', minReplies: 1 }
  }
  check.rejectUnknownKeys(['kind', ...CHECK_FIELDS[kind]])
  const limit = (key: string) => check.optional(key, (name) => check.integer(name, 1))
  switch (kind) {
    case 'reachable':
      return { kind, minReplies: limit('minReplies') ?? 1 }
    case 'path': {
      const before = check.optional('before', (key) => check.string(key))
      const after = check.optional('after', (key) => check.string(key))
      if (before === undefined && after === undefined) {
        check.issues.add(check.path, 'expected "before", "after" or both: the interface traffic must leave through')
      }
      return { kind, ...(before !== undefined && { before }), ...(after !== undefined && { after }) }
    }
    case 'recovery': {
      const withinMs = limit('withinMs')
      return { kind, via: check.string('via'), ...(withinMs !== undefined && { withinMs }) }
    }
    case 'outage': {
      const maxMs = limit('maxMs')
      return { kind, ...(maxMs !== undefined && { maxMs }) }
    }
    case 'detected-by':
      return { kind, event: check.oneOf('event', DETECTION_EVENTS) }
    case 'daemons': {
      const daemons = check.oneOfList('daemons', CHECKED_DAEMONS)
      if (Array.isArray(check.value('daemons')) && daemons.length === 0) {
        check.issues.add(check.pathOf('daemons'), 'expected at least one daemon')
      }
      return { kind, router: check.string('router'), daemons }
    }
    case 'route':
      return readRoute(check)
    case 'rib':
      return readRib(check)
    case 'reaches': {
      const size = check.optional('size', (key) => check.integer(key, 0, PING_MAX_SIZE))
      return {
        kind,
        from: check.string('from'),
        to: check.string('to', ANY_ADDRESS),
        // One packet may be lost to a neighbor being looked up: two of the three is reaching it.
        minReplies: check.optional('minReplies', (key) => check.integer(key, 1, REACH_PACKETS)) ?? REACH_PACKETS - 1,
        ...(size !== undefined && { size }),
      }
    }
    case 'peer':
      return readPeer(check)
    case 'lsa':
      return readLsa(check)
    case 'config':
      return {
        kind,
        router: check.string('router'),
        source: check.oneOf('source', CONFIG_SOURCES),
        block: check.optional('block', (key) => check.stringList(key)) ?? [],
        line: check.string('line'),
        ...(check.flag('absent') && { absent: true }),
      }
  }
}

/** The interfaces a run check names on the probe's router, each with the field that names it. */
export function checkInterfaces(check: CheckDefinition): readonly { readonly field: string; readonly name: string }[] {
  if (check.kind === 'path') {
    return [
      ...(check.before === undefined ? [] : [{ field: 'before', name: check.before }]),
      ...(check.after === undefined ? [] : [{ field: 'after', name: check.after }]),
    ]
  }
  return check.kind === 'recovery' ? [{ field: 'via', name: check.via }] : []
}

/** The router a state check reads, with the field that names it; `null` for a run check. */
export function checkRouter(check: CheckDefinition): { readonly field: string; readonly name: string } | null {
  switch (check.kind) {
    case 'daemons':
    case 'route':
    case 'rib':
    case 'config':
    case 'peer':
    case 'lsa':
      return { field: 'router', name: check.router }
    case 'reaches':
      return { field: 'from', name: check.from }
    default:
      return null
  }
}
