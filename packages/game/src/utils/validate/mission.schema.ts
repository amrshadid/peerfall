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
import { checkInterfaces, readCheck } from '#utils/validate/check.schema'
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

/** What the Machine can only do if the mission's parts agree with its network. */
function reportMismatches(mission: MissionDefinition, issues: Issues): void {
  const { network, fault, probe } = mission
  const [first, second] = fault.link
  if (!network.links.some(({ ends }) => ends[0].router === first && ends[1].router === second)) {
    const reversed = network.links.some(({ ends }) => ends[0].router === second && ends[1].router === first)
    issues.add(
      'fault.link',
      reversed
        ? `the network gives this link as [${second}, ${first}]: name it in that order`
        : `the network has no link between "${first}" and "${second}"`
    )
  }
  const sender = network.routers.find((router) => router.name === probe.from)
  if (!sender) {
    issues.add('probe.from', `no router named "${probe.from}"`)
    // A router that doesn't exist has no interfaces for the checks to name.
    return
  }
  if (!addressesOf(network, sender.name).includes(probe.source)) {
    issues.add('probe.source', `"${probe.source}" is not an address of router "${sender.name}"`)
  }
  const interfaces = network.links.flatMap(({ ends: [near, far] }) => {
    const peer = near.router === probe.from ? far.router : far.router === probe.from ? near.router : null
    return peer === null ? [] : [interfaceName(probe.from, peer)]
  })
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
  const mission: MissionDefinition = {
    id: reader.string('id', KEBAB_ID),
    version: reader.integer('version', 1),
    title: reader.string('title'),
    chapter: reader.string('chapter', KEBAB_ID),
    objective: reader.string('objective'),
    prerequisites: reader.stringList('prerequisites', KEBAB_ID),
    network: readNetwork(reader.value('network'), 'network', issues),
    fault: readFault(reader.object('fault')),
    probe: readProbe(reader.object('probe')),
    recoveryTargetMs: reader.integer('recoveryTargetMs', 1),
    objectives: reader.list('objectives', (value, path) => readObjective(new ObjectReader(value, path, issues))),
  }
  reportDuplicates(mission.prerequisites, 'prerequisites', issues)
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
