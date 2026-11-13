import type { StringRule, Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import type { NetworkDefinition, ProbeDefinition } from '@peerfall/machine/types'
import { interfaceName } from '@peerfall/machine/utils'
import { CORE_CONCEPT_BUDGET } from '#types/definitions/concepts'
import { HINT_TIERS } from '#types/definitions/hints'
import {
  type CodexCard,
  type CommandChip,
  type FaultDefinition,
  type HintDefinition,
  KEBAB_ID,
  type MissionDefinition,
  type ObjectiveDefinition,
  PROBE_INTERVAL_MS,
  type StoryRefs,
} from '#types/definitions/mission'
import { hasStateChecks, isStateCheck } from '#utils/checks/state-checks.util'
import { checkInterfaces, checkRouter, readCheck } from '#utils/validate/check.schema'
import { readNetwork } from '#utils/validate/network.schema'

const MISSION_KEYS = [
  'id',
  'version',
  'title',
  'summary',
  'minutes',
  'chapter',
  'objective',
  'prerequisites',
  'teaches',
  'names',
  'uses',
  'network',
  'fault',
  'probe',
  'recoveryTargetMs',
  'restartOnCheck',
  'objectives',
  'hints',
  'chips',
  'codex',
  'story',
]

const STORY_KEYS = ['scene', 'seeIt', 'buildIt', 'watchIt', 'debrief', 'realWorld'] as const

const STORY_REF: StringRule = {
  pattern: /^story\.md#[a-z0-9]+(-[a-z0-9]+)*$/,
  expected: 'a story section like story.md#scene',
}

const FRR_PATH: StringRule = {
  pattern: /^[A-Za-z0-9_.+-]+(\/[A-Za-z0-9_.+-]+)*\/?$/,
  expected: 'a path in FRR’s source tree like zebra/zebra_rib.c',
}

const DOCS_URL: StringRule = { pattern: /^https:\/\/\S+$/, expected: 'an https:// link' }

const ONE_LINE: StringRule = { pattern: /^[^\n\0]+$/, expected: 'one line' }

/** About how long a mission takes a new player, in minutes. */
const MINUTES = { min: 1, max: 120 } as const

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

function readHint(hint: ObjectReader, tier: number): HintDefinition {
  hint.rejectUnknownKeys(['text', 'command'])
  const command = hint.optional('command', (key) => hint.string(key, ONE_LINE))
  // The nudge and the concept teach; only pointing at the spot may name what to type.
  if (command !== undefined && tier !== HINT_TIERS.length - 1) {
    hint.issues.add(hint.pathOf('command'), `only the third hint (the ${HINT_TIERS.at(-1)}) may name a command`)
  }
  return { text: hint.string('text'), ...(command !== undefined && { command }) }
}

function readHints(reader: ObjectReader): readonly HintDefinition[] {
  let tier = 0
  const hints = reader.list('hints', (value, path) => readHint(new ObjectReader(value, path, reader.issues), tier++))
  if (reader.has('hints') && Array.isArray(reader.value('hints')) && hints.length !== HINT_TIERS.length) {
    reader.issues.add(
      'hints',
      `expected exactly ${HINT_TIERS.length} hints (${HINT_TIERS.join(', ')}), got ${hints.length}`
    )
  }
  return hints
}

function readChip(chip: ObjectReader): CommandChip {
  chip.rejectUnknownKeys(['command', 'explain'])
  return { command: chip.string('command', ONE_LINE), explain: chip.string('explain') }
}

function readCodexCard(card: ObjectReader): CodexCard {
  card.rejectUnknownKeys(['id', 'term', 'simple', 'deep', 'deepens', 'sources', 'docs', 'tryIt'])
  const id = card.string('id', KEBAB_ID)
  const term = card.string('term')
  const simple = card.string('simple')
  const deep = card.optional('deep', (key) => card.string(key))
  const deepens = card.optional('deepens', (key) => card.string(key, KEBAB_ID))
  if (deepens !== undefined && deepens === id) {
    card.issues.add(card.pathOf('deepens'), 'a card cannot deepen itself')
  }
  const sources = card.has('sources') ? card.stringList('sources', FRR_PATH) : []
  const docs = card.optional('docs', (key) => card.string(key, DOCS_URL))
  const tryIt = card.optional('tryIt', (key) => card.string(key))
  return {
    id,
    term,
    simple,
    ...(deep !== undefined && { deep }),
    ...(deepens !== undefined && { deepens }),
    sources,
    ...(docs !== undefined && { docs }),
    ...(tryIt !== undefined && { tryIt }),
  }
}

function readStoryRefs(story: ObjectReader): StoryRefs {
  story.rejectUnknownKeys(STORY_KEYS)
  const step = (key: 'seeIt' | 'buildIt' | 'watchIt') => story.optional(key, (name) => story.string(name, STORY_REF))
  const seeIt = step('seeIt')
  const buildIt = step('buildIt')
  const watchIt = step('watchIt')
  return {
    scene: story.string('scene', STORY_REF),
    ...(seeIt !== undefined && { seeIt }),
    ...(buildIt !== undefined && { buildIt }),
    ...(watchIt !== undefined && { watchIt }),
    debrief: story.string('debrief', STORY_REF),
    realWorld: story.string('realWorld', STORY_REF),
  }
}

/** A concept is taught, named or relied on: listing it twice says two things about it. */
function reportConceptOverlap(mission: MissionDefinition, issues: Issues): void {
  const lists = [
    ['teaches', mission.teaches],
    ['names', mission.names],
    ['uses', mission.uses],
  ] as const
  lists.forEach(([field, ids], at) => {
    for (const [earlier, earlierIds] of lists.slice(0, at)) {
      for (const id of ids.filter((candidate) => earlierIds.includes(candidate))) {
        issues.add(`${field}`, `"${id}" is already in ${earlier}`)
      }
    }
  })
}

/** A list the mission may leave out: an empty one then. */
function optionalList<T>(reader: ObjectReader, key: string, read: (value: ObjectReader) => T): readonly T[] {
  return reader.has(key) ? reader.list(key, (value, path) => read(new ObjectReader(value, path, reader.issues))) : []
}

function readObjective(objective: ObjectReader): ObjectiveDefinition {
  objective.rejectUnknownKeys(['id', 'text', 'check'])
  return {
    id: objective.string('id', KEBAB_ID),
    text: objective.string('text'),
    check: readCheck(objective.object('check')),
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
  const id = reader.string('id', KEBAB_ID)
  const version = reader.integer('version', 1)
  const title = reader.string('title')
  const summary = reader.optional('summary', (key) => reader.string(key))
  const minutes = reader.optional('minutes', (key) => reader.integer(key, MINUTES.min, MINUTES.max))
  const required = {
    id,
    version,
    title,
    ...(summary !== undefined && { summary }),
    ...(minutes !== undefined && { minutes }),
    chapter: reader.string('chapter', KEBAB_ID),
    objective: reader.string('objective'),
    prerequisites: reader.stringList('prerequisites', KEBAB_ID),
    teaches: reader.stringList('teaches', KEBAB_ID),
    names: reader.has('names') ? reader.stringList('names', KEBAB_ID) : [],
    uses: reader.stringList('uses', KEBAB_ID),
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
    hints: readHints(reader),
    chips: optionalList(reader, 'chips', readChip),
    codex: optionalList(reader, 'codex', readCodexCard),
    story: readStoryRefs(reader.object('story')),
  }
  if (mission.teaches.length > CORE_CONCEPT_BUDGET) {
    issues.add('teaches', `expected at most ${CORE_CONCEPT_BUDGET} concepts, got ${mission.teaches.length}`)
  }
  reportDuplicates(mission.teaches, 'teaches', issues)
  reportDuplicates(mission.names, 'names', issues)
  reportDuplicates(mission.uses, 'uses', issues)
  reportConceptOverlap(mission, issues)
  reportDuplicates(
    mission.chips.map((chip) => chip.command),
    'chips',
    issues
  )
  reportDuplicates(
    mission.codex.map((card) => card.id),
    'codex',
    issues
  )
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
