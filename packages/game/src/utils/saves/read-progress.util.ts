import type { NonEmptyList } from '@peerfall/core/types'
import { describeType, type Issues, ObjectReader } from '@peerfall/core/utils'
import type { KernelRoute, RibRoute } from '@peerfall/machine/types'
import {
  CHECK_FAILURES,
  CHECK_KINDS,
  type CheckFailure,
  type CheckResult,
  CONFIG_SOURCES,
  DETECTION_EVENTS,
  type Detection,
  type MissionVerdict,
  type Outage,
  type Recovery,
  type RouteHop,
} from '#types/definitions/checks'
import { HINT_TIERS } from '#types/definitions/hints'
import type { MissionProgress, OpenDebrief, Progress } from '#types/definitions/progress'
import {
  type AdjacencyChange,
  type GoodProbe,
  type RouteUpdate,
  RUN_ROLES,
  type RunSummary,
  type SavedRun,
} from '#types/definitions/runs'

/** The Machine's clock is finer than a millisecond, so its times are not whole numbers. */
function readTime(reader: ObjectReader, key: string): number {
  const value = reader.value(key)
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    reader.issues.add(reader.pathOf(key), `expected a number, got ${describeType(value)}`)
    return 0
  }
  return value
}

const readNullable = <T>(reader: ObjectReader, key: string, read: (value: ObjectReader) => T): T | null =>
  reader.nullable(key, (name) => read(reader.object(name)))

const readVia = (reader: ObjectReader): string | null => reader.nullable('via', (key) => reader.string(key))

function readRoute(route: ObjectReader): RouteHop {
  return {
    prefix: route.string('prefix'),
    interface: route.string('interface'),
    via: readVia(route),
    nextHops: route.list('nextHops', (value, path) => {
      const hop = new ObjectReader(value, path, route.issues)
      return { via: readVia(hop), interface: hop.string('interface') }
    }),
    protocol: route.string('protocol'),
    atMs: readTime(route, 'atMs'),
  }
}

function readDetection(detection: ObjectReader): Detection {
  return {
    event: detection.oneOf('event', DETECTION_EVENTS),
    router: detection.string('router'),
    interface: detection.string('interface'),
    atMs: readTime(detection, 'atMs'),
    afterFaultMs: readTime(detection, 'afterFaultMs'),
  }
}

function readAdjacencyChange(change: ObjectReader): AdjacencyChange {
  return {
    router: change.string('router'),
    neighbor: change.string('neighbor'),
    interface: change.string('interface'),
    from: change.string('from'),
    to: change.string('to'),
    reason: change.string('reason'),
    atMs: readTime(change, 'atMs'),
    afterFaultMs: readTime(change, 'afterFaultMs'),
  }
}

function readRouteUpdate(update: ObjectReader): RouteUpdate {
  return {
    route: readRoute(update.object('route')),
    atMs: readTime(update, 'atMs'),
    afterFaultMs: readTime(update, 'afterFaultMs'),
  }
}

function readGoodProbe(probe: ObjectReader): GoodProbe {
  return {
    sequence: probe.integer('sequence', 0),
    atMs: readTime(probe, 'atMs'),
    afterFaultMs: readTime(probe, 'afterFaultMs'),
  }
}

function readOutage(outage: ObjectReader): Outage {
  return {
    fromMs: readTime(outage, 'fromMs'),
    toMs: outage.nullable('toMs', (key) => readTime(outage, key)),
    durationMs: outage.nullable('durationMs', (key) => readTime(outage, key)),
  }
}

function readSummary(summary: ObjectReader): RunSummary {
  return {
    faultAtMs: summary.nullable('faultAtMs', (key) => readTime(summary, key)),
    pathBefore: readNullable(summary, 'pathBefore', readRoute),
    detection: readNullable(summary, 'detection', readDetection),
    adjacencyChange: readNullable(summary, 'adjacencyChange', readAdjacencyChange),
    routeUpdate: readNullable(summary, 'routeUpdate', readRouteUpdate),
    firstGoodProbe: readNullable(summary, 'firstGoodProbe', readGoodProbe),
    outage: readNullable(summary, 'outage', readOutage),
    repliesBeforeFault: summary.integer('repliesBeforeFault', 0),
    probesLost: summary.integer('probesLost', 0),
  }
}

function readRun(run: ObjectReader): SavedRun {
  return {
    role: run.oneOf('role', RUN_ROLES),
    missionVersion: run.integer('missionVersion', 1),
    savedAt: run.integer('savedAt', 0),
    passed: run.flag('passed'),
    summary: readSummary(run.object('summary')),
  }
}

function readMission(mission: ObjectReader): MissionProgress {
  return {
    missionId: mission.string('missionId'),
    firstStartedAt: mission.integer('firstStartedAt', 0),
    completedAt: mission.nullable('completedAt', (key) => mission.integer(key, 0)),
    attempts: mission.integer('attempts', 0),
    hintsRevealed: mission.integer('hintsRevealed', 0, HINT_TIERS.length),
    runs: mission.list('runs', (entry, at) => readRun(new ObjectReader(entry, at, mission.issues))),
  }
}

const FAILURES = Object.values(CHECK_FAILURES) as unknown as NonEmptyList<CheckFailure>

/** A field that must be there and be true or false: `flag` would take a missing one as false. */
function readBoolean(reader: ObjectReader, key: string): boolean {
  const value = reader.value(key)
  if (typeof value !== 'boolean') {
    reader.issues.add(reader.pathOf(key), `expected true or false, got ${describeType(value)}`)
    return false
  }
  return value
}

const readList = <T>(reader: ObjectReader, key: string, read: (item: ObjectReader) => T): readonly T[] =>
  reader.list(key, (value, at) => read(new ObjectReader(value, at, reader.issues)))

function readKernelRoute(route: ObjectReader): KernelRoute {
  return {
    prefix: route.string('prefix'),
    protocol: route.text('protocol'),
    nextHops: readList(route, 'nextHops', (hop) => ({ via: readVia(hop), interface: hop.string('interface') })),
  }
}

function readRibRoute(route: ObjectReader): RibRoute {
  return {
    prefix: route.string('prefix'),
    protocol: route.string('protocol'),
    distance: route.integer('distance', 0),
    metric: route.integer('metric', 0),
    selected: readBoolean(route, 'selected'),
    installed: readBoolean(route, 'installed'),
    nextHops: readList(route, 'nextHops', (hop) => ({
      via: readVia(hop),
      interface: hop.nullable('interface', (key) => hop.string(key)),
    })),
  }
}

function readRecovery(recovery: ObjectReader): Recovery {
  return {
    sequence: recovery.integer('sequence', 0),
    atMs: readTime(recovery, 'atMs'),
    afterFaultMs: readTime(recovery, 'afterFaultMs'),
    route: readRoute(recovery.object('route')),
  }
}

/** One check's result, every kind with the evidence the Guide prints for it. */
function readResult(result: ObjectReader): CheckResult {
  const common = {
    passed: readBoolean(result, 'passed'),
    failure: result.nullable('failure', (key) => result.oneOf(key, FAILURES)),
  }
  const kind = result.oneOf('kind', CHECK_KINDS)
  switch (kind) {
    case 'reachable':
      return { kind, ...common, replies: result.integer('replies', 0) }
    case 'path':
      return {
        kind,
        ...common,
        before: readNullable(result, 'before', readRoute),
        after: readNullable(result, 'after', readRoute),
      }
    case 'recovery':
      return {
        kind,
        ...common,
        recovery: readNullable(result, 'recovery', readRecovery),
        limitMs: readTime(result, 'limitMs'),
      }
    case 'outage':
      return {
        kind,
        ...common,
        outage: readNullable(result, 'outage', readOutage),
        limitMs: readTime(result, 'limitMs'),
      }
    case 'detected-by':
      return { kind, ...common, detection: readNullable(result, 'detection', readDetection) }
    case 'daemons':
      return {
        kind,
        ...common,
        router: result.string('router'),
        running: result.stringList('running'),
        missing: result.stringList('missing'),
      }
    case 'route':
      return { kind, ...common, router: result.string('router'), route: readNullable(result, 'route', readKernelRoute) }
    case 'rib':
      return {
        kind,
        ...common,
        router: result.string('router'),
        routes: readList(result, 'routes', readRibRoute),
        found: readNullable(result, 'found', readRibRoute),
      }
    case 'reaches':
      return {
        kind,
        ...common,
        from: result.string('from'),
        to: result.string('to'),
        sent: result.integer('sent', 0),
        received: result.integer('received', 0),
      }
    case 'config':
      return {
        kind,
        ...common,
        router: result.string('router'),
        source: result.oneOf('source', CONFIG_SOURCES),
        found: result.nullable('found', (key) => result.text(key)),
      }
  }
}

function readVerdict(verdict: ObjectReader): MissionVerdict {
  return {
    passed: readBoolean(verdict, 'passed'),
    objectives: readList(verdict, 'objectives', (objective) => ({
      objectiveId: objective.string('objectiveId'),
      result: readResult(objective.object('result')),
    })),
  }
}

function readOpenDebrief(debrief: ObjectReader): OpenDebrief {
  return {
    missionId: debrief.string('missionId'),
    verdict: readNullable(debrief, 'verdict', readVerdict),
  }
}

/** Reads a current-version `Progress` from untrusted save data. */
export function readProgress(value: unknown, path: string, issues: Issues): Progress {
  const progress = new ObjectReader(value, path, issues)
  // Added after version 2 without a bump: a save without it is a save with no debrief open.
  const debrief = progress.optional('debrief', (key) => readOpenDebrief(progress.object(key)))
  return {
    missions: progress.list('missions', (entry, at) => readMission(new ObjectReader(entry, at, issues))),
    completionOrder: progress.stringList('completionOrder'),
    lastActive: progress.nullable('lastActive', (key) => progress.string(key)),
    ...(debrief === undefined ? {} : { debrief }),
  }
}
