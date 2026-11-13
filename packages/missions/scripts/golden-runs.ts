// Plays every mission's golden runs on the real image, through the game's own VM session and the
// game's own flow, and judges each with the mission's checks. A run that is judged the way its
// solution.yaml says is written to src/test/runs/, where the tests judge it again without a VM.
// A mission with a fault is judged from its fault run; one without, from the Machine's state as
// live judging reads it after the last change, which is recorded beside the events.
// Usage: pnpm --filter @peerfall/missions vm:golden [mission-id …]
//        (after pnpm vm:image; several minutes for every mission)
//        PEERFALL_CONTENT_DIR and PEERFALL_RUNS_DIR read the content and write the runs elsewhere.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Validated } from '@peerfall/core/types'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { judgeMission, summariseRun, validateMission } from '@peerfall/game/utils'
import { createVmSession, readMachineState, restartRouterFrr } from '@peerfall/machine/services'
import type { MachineState, StampedMachineEvent, VmPhase } from '@peerfall/machine/types'
import { applyEventUpdate, EMPTY_EVENT_LOG } from '@peerfall/machine/utils'
import { type ContentFiles, MISSION_FILE, SOLUTION_FILE } from '#types/definitions/content'
import { readContentDir } from '#utils/loader/disk-content.util'
import { loadContent } from '#utils/loader/load-content.util'
import { readYaml } from '#utils/loader/read-yaml.util'
import { changeLines, type GoldenRun, validateSolution } from '#utils/run/golden-run.util'
import {
  checkRun,
  faultRun,
  type MissionMachine,
  probeRun,
  START_SLOT,
  settledRead,
  waitUntilSettled,
} from '#utils/run/mission-run.util'

/** After a change, BFD needs a moment to form its session (or to fail to) before the fault. */
const BEFORE_FAULT_MS = 6000
/** Starting or restarting a router's FRR takes up to half a minute in the emulator. */
const CHANGE_TIMEOUT_MS = 120_000

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
// A mission that is not in the game yet can be recorded from a folder of its own: content that
// does not load stops the whole game, so an unfinished mission stays out of content/ until its
// runs are judged as its solution says.
const content = process.env.PEERFALL_CONTENT_DIR ?? join(here, '../content')
const runsDir = process.env.PEERFALL_RUNS_DIR ?? join(here, '../src/test/runs')
const vm = join(repo, 'apps/web/public/vm')
const started = Date.now()
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const log = (text: string) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${text}`)

// The content from disk: the game reads it through Vite's glob, which Node does not have.
const contentFiles = (): ContentFiles => readContentDir(content)

// v86 in Node reads its files from disk; the session fetches only manifest.json, so that read is served from disk too.
const fetchUrl = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  return url.startsWith('/') ? new Response(await readFile(url)) : fetchUrl(input, init)
}

const session = createVmSession()
let phase: VmPhase = 'off'
let events = EMPTY_EVENT_LOG
const machine: MissionMachine = {
  events: () => events.events,
  setFault: (link, dropping) => session.setFault(link, dropping),
  startProbe: (probe) => session.startProbe(probe),
  stopProbe: (id) => session.stopProbe(id),
  saveHealthy: (slot) => session.saveHealthy(slot),
  restoreHealthy: (slot) => session.restoreHealthy(slot),
  wait,
  readState: (request) => readMachineState((line, timeoutMs) => session.control(line, timeoutMs), request),
  restartFrr: (router) => restartRouterFrr((line, timeoutMs) => session.control(line, timeoutMs), router),
}

/** What one golden run left to judge. `state` is null for a fault run: its checks read the events. */
type Played =
  | { readonly ok: true; readonly events: readonly StampedMachineEvent[]; readonly state: MachineState | null }
  | { readonly ok: false; readonly errors: readonly string[] }

/** A mission with a fault: the fault run, as the game's own flow does it. */
async function playFault(mission: MissionDefinition, run: GoldenRun): Promise<Played> {
  await wait(run.changes.length > 0 ? BEFORE_FAULT_MS : 0)
  await waitUntilSettled(machine, mission)
  const outcome = await faultRun(machine, mission)
  return outcome.ok ? { ...outcome, state: null } : outcome
}

/**
 * A mission without one: its probe if it has one, for the record, then the network read as live
 * judging finds it once the player has stopped and routing is quiet. Nothing is restarted: a run
 * that needs a restart has a `restart: true` change, the player's own.
 */
async function playCheck(mission: MissionDefinition): Promise<Played> {
  await waitUntilSettled(machine, mission)
  if (mission.probe) {
    const probed = await probeRun(machine, mission)
    if (!probed.ok) {
      return probed
    }
  }
  if ((mission.restartOnCheck ?? []).length > 0) {
    // Kept until the mission judges a restart from what FRR really started with.
    log(`${mission.id}: restartOnCheck restarts FRR before the read, which live judging never does`)
    return checkRun(machine, mission)
  }
  return settledRead(machine, mission)
}

function describeFault(mission: MissionDefinition, events: readonly StampedMachineEvent[]): string {
  const summary = summariseRun(events, mission)
  const since = (atMs: number | undefined) =>
    atMs === undefined || summary.faultAtMs === null ? 'never' : `+${Math.round(atMs - summary.faultAtMs)} ms`
  return (
    `outage ${summary.outage?.durationMs === null || summary.outage === null ? 'still down' : `${Math.round(summary.outage.durationMs)} ms`}; ` +
    `detected by ${summary.detection ? `${summary.detection.event} on ${summary.detection.router} ${since(summary.detection.atMs)}` : 'nothing'}`
  )
}

/** What each state check found, in a few words, for the log. */
function describeObjective({ result }: MissionVerdict['objectives'][number]): string {
  switch (result.kind) {
    case 'daemons':
      return `running on ${result.router}: ${result.running.join(' ') || 'nothing'}`
    case 'route':
      return result.route
        ? `${result.router}: ${result.route.prefix} proto ${result.route.protocol} ${result.route.nextHops.map((hop) => `${hop.via ? `via ${hop.via} ` : ''}dev ${hop.interface}`).join(', ')}`
        : `${result.router}: no route`
    case 'rib':
      return `${result.router} zebra: ${
        result.routes
          .map(
            (route) =>
              `${route.prefix} ${route.protocol} [${route.distance}/${route.metric}] ${route.nextHops.map((hop) => hop.via ?? hop.interface).join(',')}${route.selected ? ' selected' : ''}`
          )
          .join('; ') || 'no route'
      }`
    case 'reaches':
      return `${result.from} → ${result.to}: ${result.received} of ${result.sent} answered`
    case 'config':
      return `${result.router} ${result.source}: ${result.found ?? 'no such line'}`
    default:
      return ''
  }
}

async function playMission(mission: MissionDefinition, folder: string): Promise<string[]> {
  const failures: string[] = []
  const solutionErrors: string[] = []
  const solutionPath = join(content, folder, SOLUTION_FILE)
  const solution = readYaml(
    existsSync(solutionPath) ? readFileSync(solutionPath, 'utf8') : '',
    `${folder}/${SOLUTION_FILE}`,
    validateSolution,
    solutionErrors
  )
  if (!solution) {
    return solutionErrors
  }
  const built = await session.setupNetwork(mission.network)
  if (!built.ok) {
    return [`${mission.id}: the network could not be built: ${built.errors.join('; ')}`]
  }
  if (!(await waitUntilSettled(machine, mission))) {
    return [`${mission.id}: the network never settled`]
  }
  await session.saveHealthy(START_SLOT)
  log(`${mission.id}: network built and settled`)

  for (const run of solution) {
    await session.restoreHealthy(START_SLOT)
    for (const change of run.changes) {
      const refusedOnPurpose = 'lines' in change && change.refused === true
      for (const line of changeLines(change)) {
        const reply = await session.control(line, CHANGE_TIMEOUT_MS)
        const said = reply.output.trim()
        if (refusedOnPurpose) {
          // vtysh exits non-zero when it turns down a line: that refusal is what the run shows.
          if (reply.status === 0) {
            failures.push(`${mission.id}/${run.id}: ${change.router} accepted every line of a change marked refused`)
          } else {
            log(`${mission.id}/${run.id}: ${change.router} refused, as expected: ${said}`)
          }
        } else if (reply.status !== 0) {
          failures.push(`${mission.id}/${run.id}: ${change.router} refused the change: ${said}`)
        }
      }
    }
    const played = mission.fault ? await playFault(mission, run) : await playCheck(mission)
    if (!played.ok) {
      failures.push(`${mission.id}/${run.id}: ${played.errors.join('; ')}`)
      continue
    }
    const verdict = judgeMission(mission, played.events, played.state)
    log(
      `${mission.id}/${run.id}: ${verdict.passed ? 'passed' : 'not passed'} (expected ${run.passes ? 'passed' : 'not passed'}); ` +
        `${mission.fault ? `${describeFault(mission, played.events)}; ` : ''}${played.events.length} events`
    )
    for (const objective of verdict.objectives) {
      const { objectiveId, result } = objective
      const found = describeObjective(objective)
      log(
        `    ${result.passed ? 'ok  ' : 'FAIL'} ${objectiveId}${result.failure ? ` (${result.failure})` : ''}${found ? `: ${found}` : ''}`
      )
    }
    if (verdict.passed !== run.passes) {
      failures.push(`${mission.id}/${run.id}: judged ${verdict.passed ? 'passed' : 'not passed'}`)
      continue
    }
    mkdirSync(join(runsDir, mission.id), { recursive: true })
    writeFileSync(
      join(runsDir, mission.id, `${run.id}.json`),
      `${JSON.stringify({ mission: mission.id, version: mission.version, run: run.id, passes: run.passes, events: played.events, state: played.state })}\n`
    )
  }
  return failures
}

interface MissionToPlay {
  readonly mission: MissionDefinition
  readonly folder: string
}

/**
 * The missions to play. With no ids, all of them, from content that loads as a whole. With ids
 * on the command line, only those, each validated by itself: a mission can be recorded while
 * another one in the repository is half written, and the other missions' runs stay as recorded.
 */
function missionsToPlay(ids: readonly string[]): Validated<readonly MissionToPlay[]> {
  const files = contentFiles()
  if (ids.length === 0) {
    const loaded = loadContent(files)
    return loaded.ok
      ? {
          ok: true,
          value: loaded.value.game.missions.map((mission) => ({
            mission,
            folder: loaded.value.folderOf(mission.id) ?? '',
          })),
        }
      : loaded
  }
  const errors: string[] = []
  const missions: MissionToPlay[] = []
  for (const id of ids) {
    const path = Object.keys(files.missions).find((file) => file.endsWith(`-${id}/${MISSION_FILE}`))
    const mission = path === undefined ? null : readYaml(files.missions[path] ?? '', path, validateMission, errors)
    if (path === undefined) {
      errors.push(`no mission folder named <number>-${id}`)
    } else if (mission) {
      missions.push({ mission, folder: path.slice(0, path.lastIndexOf('/')) })
    }
  }
  return errors.length === 0 ? { ok: true, value: missions } : { ok: false, errors }
}

async function main(): Promise<string[]> {
  // pnpm hands a `--` through when the ids are given after one.
  const wanted = missionsToPlay(process.argv.slice(2).filter((argument) => argument !== '--'))
  if (!wanted.ok) {
    return [...wanted.errors]
  }
  await session.start(
    { baseUrl: `${vm}/`, wasmUrl: join(repo, 'packages/machine/node_modules/v86/build/v86.wasm'), fresh: true },
    () => {},
    (status) => {
      phase = status.phase
    },
    (update) => {
      events = applyEventUpdate(events, update)
    }
  )
  while (phase !== 'ready' && phase !== 'failed') {
    await wait(200)
  }
  if (phase === 'failed') {
    return ['the Machine failed to boot: run pnpm vm:image']
  }
  log('the Machine is up')
  const failures: string[] = []
  for (const { mission, folder } of wanted.value) {
    failures.push(...(await playMission(mission, folder)))
  }
  return failures
}

const failures = await main().catch((error: unknown) => [error instanceof Error ? error.message : String(error)])
await session.stop()
log(failures.length === 0 ? 'every golden run was judged as its solution says' : `FAILED:\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
