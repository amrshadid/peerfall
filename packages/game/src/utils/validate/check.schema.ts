import type { StringRule } from '@peerfall/core/types'
import type { ObjectReader } from '@peerfall/core/utils'
import { FRR_BASE_DAEMONS, FRR_DAEMONS, IPV4, IPV4_WITH_PREFIX } from '@peerfall/machine/types'
import {
  CHECK_KINDS,
  type CheckDefinition,
  type CheckKind,
  CONFIG_SOURCES,
  DETECTION_EVENTS,
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
  route: ['router', 'prefix', 'to', 'protocol', 'via', 'interface'],
  rib: ['router', 'prefix', 'protocol', 'via', 'selected'],
  reaches: ['from', 'to', 'minReplies'],
  config: ['router', 'source', 'block', 'line', 'absent'],
}

/** Every FRR process a `daemons` check may name: watchfrr, which starts the others, counts as one. */
const CHECKED_DAEMONS = ['watchfrr', ...FRR_BASE_DAEMONS, ...FRR_DAEMONS] as const

const ADDRESS: StringRule = { pattern: IPV4, expected: 'an address like 10.0.1.2' }
const PREFIX: StringRule = { pattern: IPV4_WITH_PREFIX, expected: 'a prefix like 10.0.1.0/30' }
// As `ip route` names who installed a route: kernel, static, ospf…
const PROTOCOL: StringRule = { pattern: /^[a-z][a-z0-9]*$/, expected: 'a protocol as ip route names it, like static' }
// As zebra names a route's source in `show ip route json`: connected, local, static, ospf…
const RIB_PROTOCOL: StringRule = { pattern: /^[a-z][a-z0-9-]*$/, expected: 'a protocol as FRR names it, like static' }

function readRib(check: ObjectReader): Extract<CheckDefinition, { kind: 'rib' }> {
  const protocol = check.optional('protocol', (key) => check.string(key, RIB_PROTOCOL))
  const via = check.optional('via', (key) => check.string(key, ADDRESS))
  const selected = check.optional('selected', (key) => check.flag(key))
  return {
    kind: 'rib',
    router: check.string('router'),
    prefix: check.string('prefix', PREFIX),
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
  const name = check.optional('interface', (key) => check.string(key))
  if ((prefix === undefined) === (to === undefined)) {
    check.issues.add(
      check.path,
      'expected "prefix" (that exact route) or "to" (the route an address would use), not both'
    )
  }
  return {
    kind: 'route',
    router: check.string('router'),
    ...(prefix !== undefined && { prefix }),
    ...(to !== undefined && { to }),
    ...(protocol !== undefined && { protocol }),
    ...(via !== undefined && { via }),
    ...(name !== undefined && { interface: name }),
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
    case 'reaches':
      return {
        kind,
        from: check.string('from'),
        to: check.string('to', ADDRESS),
        // One packet may be lost to a neighbor being looked up: two of the three is reaching it.
        minReplies: check.optional('minReplies', (key) => check.integer(key, 1, REACH_PACKETS)) ?? REACH_PACKETS - 1,
      }
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
      return { field: 'router', name: check.router }
    case 'reaches':
      return { field: 'from', name: check.from }
    default:
      return null
  }
}
