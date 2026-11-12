import type { StringRule, Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import type { NetworkDefinition, ProbeDefinition } from '@peerfall/machine/types'
import { interfaceName } from '@peerfall/machine/utils'
import {
  type FaultDefinition,
  type HintDefinition,
  KEBAB_ID,
  MIN_HINTS,
  type MissionDefinition,
  type ObjectiveDefinition,
  PROBE_INTERVAL_MS,
} from '#types/definitions/mission'
import { hasStateChecks, isStateCheck } from '#utils/checks/state-checks.util'
import { checkInterfaces, checkRouter, readCheck } from '#utils/validate/check.schema'
import { readNetwork } from '#utils/validate/network.schema'

const MISSION_KEYS = [
  'id',
  'version',
  'title',
  'chapter',
  'objective',
  'prerequisites',
  'network',
  'fault',
  'probe',
  'recoveryTargetMs',
  'restartOnCheck',
  'objectives',
]

const IPV4_ADDRESS: StringRule = {
  pattern: /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/,
  expected: 'an address like 10.255.0.3',
}

// The probe's id names a file and a shell word on the Machine.
const PROBE_ID: StringRule = {
  pattern: /^[a-z][a-z0-9-]{0,15}$/,
  expected: 'a lower-case name of at most 16 characters like a-to-c',
}

function readFault(fault: ObjectReader): FaultDefinition {
  fault.rejectUnknownKeys(['link'])
  const routers = fault.stringList('link')
  const [first, second] = routers
  if (first === undefined || second === undefined || routers.length !== 2) {
    if (Array.isArray(fault.value('link'))) {
      fault.issues.add(fault.pathOf('link'), `expected the link's two routers like [a, c], got ${routers.length}`)
    }
    return { link: ['', ''] }
  }
  return { link: [first, second] }
}

function readProbe(probe: ObjectReader): ProbeDefinition {
  probe.rejectUnknownKeys(['id', 'from', 'source', 'destination', 'intervalMs'])
  return {
    id: probe.string('id', PROBE_ID),
    from: probe.string('from'),
    source: probe.string('source', IPV4_ADDRESS),
    destination: probe.string('destination', IPV4_ADDRESS),
    intervalMs: probe.integer('intervalMs', PROBE_INTERVAL_MS.min, PROBE_INTERVAL_MS.max),
  }
}

function readHint(hint: ObjectReader): HintDefinition {
  hint.rejectUnknownKeys(['text', 'command'])
  const command = hint.optional('command', (key) => hint.string(key))
  return { text: hint.string('text'), ...(command !== undefined && { command }) }
}

function readObjective(objective: ObjectReader): ObjectiveDefinition {
  objective.rejectUnknownKeys(['id', 'text', 'check', 'hints'])
  const hints = objective.list('hints', (value, path) => readHint(new ObjectReader(value, path, objective.issues)))
  const hintsPath = objective.pathOf('hints')
  if (objective.has('hints') && hints.length < MIN_HINTS) {
    objective.issues.add(hintsPath, `expected at least ${MIN_HINTS} hints, from where to look to a specific command`)
  } else if (hints.length > 0 && hints.at(-1)?.command === undefined) {
    objective.issues.add(`${hintsPath}[${hints.length - 1}].command`, 'the last hint names a specific command')
  }
  return {
    id: objective.string('id', KEBAB_ID),
    text: objective.string('text'),
    check: readCheck(objective.object('check')),
    hints,
  }
}

const addressOf = (withPrefix: string): string => withPrefix.split('/')[0] ?? ''

/** A router's interfaces: one per link, named after the router it faces, and its loopback. */
function interfacesOf(network: NetworkDefinition, router: string): string[] {
  return network.links.flatMap(({ ends: [near, far] }) => {
    const peer = near.router === router ? far.router : far.router === router ? near.router : null
    return peer === null ? [] : [interfaceName(router, peer)]
  })
}

function reportFaultMismatches(mission: MissionDefinition, fault: FaultDefinition, issues: Issues): void {
  const [first, second] = fault.link
  if (!mission.network.links.some(({ ends }) => ends[0].router === first && ends[1].router === second)) {
    const reversed = mission.network.links.some(({ ends }) => ends[0].router === second && ends[1].router === first)
    issues.add(
      'fault.link',
      reversed
        ? `the network gives this link as [${second}, ${first}]: name it in that order`
        : `the network has no link between "${first}" and "${second}"`
    )
  }
  if (!mission.probe) {
    issues.add('fault', 'a fault is measured with a probe: add "probe"')
  }
}

function reportProbeMismatches(mission: MissionDefinition, probe: ProbeDefinition, issues: Issues): void {
  const { network } = mission
  const sender = network.routers.find((router) => router.name === probe.from)
  if (!sender) {
    issues.add('probe.from', `no router named "${probe.from}"`)
    // A router that doesn't exist has no interfaces for the checks to name.
    return
  }
  if (!addressesOf(network, sender.name).includes(probe.source)) {
    issues.add('probe.source', `"${probe.source}" is not an address of router "${sender.name}"`)
  }
  const interfaces = interfacesOf(network, probe.from)
  mission.objectives.forEach((objective, at) => {
    for (const { field, name } of checkInterfaces(objective.check)) {
      if (!interfaces.includes(name)) {
        issues.add(
          `objectives[${at}].check.${field}`,
          `"${name}" is not an interface of router "${probe.from}", where the probe starts (expected one of: ${interfaces.join(', ')})`
        )
      }
    }
  })
}

/** What a check reads that the mission must then have: a probe, a fault, a recovery target. */
function reportMissingParts(mission: MissionDefinition, issues: Issues): void {
  mission.objectives.forEach(({ check }, at) => {
    const path = `objectives[${at}].check`
    if (isStateCheck(check)) {
      return
    }
    if (!mission.probe) {
      issues.add(path, `a "${check.kind}" check reads the mission's probe: add "probe"`)
    }
    const afterFault = check.kind !== 'reachable' && (check.kind !== 'path' || check.after !== undefined)
    if (afterFault && !mission.fault) {
      issues.add(path, `a "${check.kind}" check reads what happens after the fault: add "fault"`)
    }
    const ownLimit = check.kind === 'recovery' ? check.withinMs : check.kind === 'outage' ? check.maxMs : 0
    if (ownLimit === undefined && mission.recoveryTargetMs === undefined) {
      issues.add(path, `a "${check.kind}" check with no limit of its own needs "recoveryTargetMs"`)
    }
  })
  if (mission.recoveryTargetMs !== undefined && !mission.fault) {
    issues.add('recoveryTargetMs', 'only a mission with a fault has a recovery target')
  }
}

/** The routers and interfaces the state checks name, and the routers restarted before them. */
function reportStateMismatches(mission: MissionDefinition, issues: Issues): void {
  const { network } = mission
  const exists = (router: string): boolean => network.routers.some(({ name }) => name === router)
  mission.objectives.forEach(({ check }, at) => {
    const named = checkRouter(check)
    if (!named) {
      return
    }
    const path = `objectives[${at}].check`
    if (!exists(named.name)) {
      issues.add(`${path}.${named.field}`, `no router named "${named.name}"`)
      return
    }
    if (check.kind === 'route' && check.interface !== undefined) {
      const interfaces = [...interfacesOf(network, check.router), 'lo']
      if (!interfaces.includes(check.interface)) {
        issues.add(
          `${path}.interface`,
          `"${check.interface}" is not an interface of router "${check.router}" (expected one of: ${interfaces.join(', ')})`
        )
      }
    }
  })
  mission.restartOnCheck?.forEach((router, at) => {
    const path = `restartOnCheck[${at}]`
    const found = network.routers.find(({ name }) => name === router)
    if (!found) {
      issues.add(path, `no router named "${router}"`)
    } else if (found.startup !== 'watchfrr' && found.startup !== 'none') {
      // FRR's init script restarts a router from its `daemons` file, which only these have.
      issues.add(path, `router "${router}" is restarted by FRR's init script: give it "startup: watchfrr"`)
    }
  })
  if (mission.restartOnCheck !== undefined && !hasStateChecks(mission)) {
    issues.add('restartOnCheck', 'nothing is checked after the restart: add a check that reads the Machine’s state')
  }
}

/** What the Machine can only do if the mission's parts agree with its network. */
function reportMismatches(mission: MissionDefinition, issues: Issues): void {
  if (mission.fault) {
    reportFaultMismatches(mission, mission.fault, issues)
  }
  if (mission.probe) {
    reportProbeMismatches(mission, mission.probe, issues)
  }
  reportMissingParts(mission, issues)
  reportStateMismatches(mission, issues)
}

function addressesOf(network: NetworkDefinition, router: string): string[] {
  const loopback = network.routers.find(({ name }) => name === router)?.loopback
  return [
    ...(loopback === undefined ? [] : [addressOf(loopback)]),
    ...network.links.flatMap(({ ends }) =>
      ends.filter((end) => end.router === router).map((end) => addressOf(end.address))
    ),
  ]
}

/**
 * Checks a parsed `mission.yaml` and returns the typed mission, or every problem with the path
 * of its field. Whether its chapter and prerequisites exist is checked with the rest of the
 * content, by `createGameContent`.
 */
export function validateMission(raw: unknown): Validated<MissionDefinition> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(MISSION_KEYS)
  // Read in the file's order, so the problems are listed in it; a part left out stays out of the mission.
  const required = {
    id: reader.string('id', KEBAB_ID),
    version: reader.integer('version', 1),
    title: reader.string('title'),
    chapter: reader.string('chapter', KEBAB_ID),
    objective: reader.string('objective'),
    prerequisites: reader.stringList('prerequisites', KEBAB_ID),
    network: readNetwork(reader.value('network'), 'network', issues),
  }
  const fault = reader.optional('fault', (key) => readFault(reader.object(key)))
  const probe = reader.optional('probe', (key) => readProbe(reader.object(key)))
  const recoveryTargetMs = reader.optional('recoveryTargetMs', (key) => reader.integer(key, 1))
  const restartOnCheck = reader.optional('restartOnCheck', (key) => reader.stringList(key))
  const mission: MissionDefinition = {
    ...required,
    ...(fault !== undefined && { fault }),
    ...(probe !== undefined && { probe }),
    ...(recoveryTargetMs !== undefined && { recoveryTargetMs }),
    ...(restartOnCheck !== undefined && { restartOnCheck }),
    objectives: reader.list('objectives', (value, path) => readObjective(new ObjectReader(value, path, issues))),
  }
  reportDuplicates(mission.prerequisites, 'prerequisites', issues)
  reportDuplicates(mission.restartOnCheck ?? [], 'restartOnCheck', issues)
  reportDuplicates(
    mission.objectives.map((objective) => objective.id),
    'objectives',
    issues
  )
  // Cross-checks on parts that are themselves wrong would only repeat the problem.
  if (issues.count === 0) {
    if (mission.objectives.length === 0) {
      issues.add('objectives', 'expected at least one objective')
    }
    if (mission.prerequisites.includes(mission.id)) {
      issues.add('prerequisites', 'a mission cannot require itself')
    }
    reportMismatches(mission, issues)
  }
  return issues.result(mission)
}
