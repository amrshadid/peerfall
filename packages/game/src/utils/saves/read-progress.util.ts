import { describeType, type Issues, isRecord, ObjectReader } from '@peerfall/core/utils'
import { DETECTION_EVENTS, type Detection, type Outage, type RouteHop } from '#types/definitions/checks'
import type { MissionProgress, Progress } from '#types/definitions/progress'
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

function readHintCounts(mission: ObjectReader): Readonly<Record<string, number>> {
  const value = mission.value('hintsRevealed')
  const counts = mission.object('hintsRevealed')
  return isRecord(value) ? Object.fromEntries(Object.keys(value).map((id) => [id, counts.integer(id, 0)])) : {}
}

function readMission(mission: ObjectReader): MissionProgress {
  return {
    missionId: mission.string('missionId'),
    firstStartedAt: mission.integer('firstStartedAt', 0),
    completedAt: mission.nullable('completedAt', (key) => mission.integer(key, 0)),
    attempts: mission.integer('attempts', 0),
    hintsRevealed: readHintCounts(mission),
    runs: mission.list('runs', (entry, at) => readRun(new ObjectReader(entry, at, mission.issues))),
  }
}

/** Reads a current-version `Progress` from untrusted save data. */
export function readProgress(value: unknown, path: string, issues: Issues): Progress {
  const progress = new ObjectReader(value, path, issues)
  return {
    missions: progress.list('missions', (entry, at) => readMission(new ObjectReader(entry, at, issues))),
    completionOrder: progress.stringList('completionOrder'),
    lastActive: progress.nullable('lastActive', (key) => progress.string(key)),
  }
}
