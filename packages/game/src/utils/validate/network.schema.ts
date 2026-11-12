import { type Issues, ObjectReader } from '@peerfall/core/utils'
import {
  FRR_DAEMONS,
  FRR_STARTUPS,
  type LinkDefinition,
  type LinkEnd,
  type NetworkDefinition,
  type RouterDefinition,
} from '@peerfall/machine/types'
import { networkProblems } from '@peerfall/machine/utils'

const ROUTER_KEYS = ['name', 'loopback', 'daemons', 'config', 'startup']
const END_KEYS = ['router', 'address', 'unaddressed']

function readRouter(router: ObjectReader): RouterDefinition {
  router.rejectUnknownKeys(ROUTER_KEYS)
  const loopback = router.optional('loopback', (key) => router.string(key))
  const startup = router.optional('startup', (key) => router.oneOf(key, FRR_STARTUPS))
  return {
    name: router.string('name'),
    ...(loopback !== undefined && { loopback }),
    daemons: router.oneOfList('daemons', FRR_DAEMONS),
    // A router may start with nothing configured: the Machine writes the hostname and log lines itself.
    config: router.text('config'),
    ...(startup !== undefined && { startup }),
  }
}

function readEnd(end: ObjectReader): LinkEnd {
  end.rejectUnknownKeys(END_KEYS)
  return {
    router: end.string('router'),
    address: end.string('address'),
    ...(end.flag('unaddressed') && { unaddressed: true }),
  }
}

function readLink(link: ObjectReader, issues: Issues): LinkDefinition | null {
  link.rejectUnknownKeys(['ends'])
  const ends = link.list('ends', (value, path) => readEnd(new ObjectReader(value, path, issues)))
  const [first, second] = ends
  if (!first || !second || ends.length !== 2) {
    if (link.has('ends') && Array.isArray(link.value('ends'))) {
      issues.add(link.pathOf('ends'), `expected the link's two ends, got ${ends.length}`)
    }
    return null
  }
  return { ends: [first, second] }
}

/**
 * Reads a mission's `network:` block. Its shape is checked here; what the Machine needs of it
 * (names it can use in a shell line, addresses, routers that exist) is checked by the Machine's
 * own `networkProblems`, once the shape is right.
 */
export function readNetwork(value: unknown, path: string, issues: Issues): NetworkDefinition {
  const before = issues.count
  const reader = new ObjectReader(value, path, issues)
  reader.rejectUnknownKeys(['routers', 'links'])
  const routers = reader.list('routers', (entry, at) => readRouter(new ObjectReader(entry, at, issues)))
  const links = reader
    .list('links', (entry, at) => readLink(new ObjectReader(entry, at, issues), issues))
    .filter((link) => link !== null)
  const network: NetworkDefinition = { routers, links }
  if (issues.count === before) {
    if (routers.length === 0) {
      issues.add(reader.pathOf('routers'), 'expected at least one router')
    }
    for (const problem of networkProblems(network)) {
      issues.add('', `${path}.${problem}`)
    }
  }
  return network
}
