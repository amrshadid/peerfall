// Plays every mission's golden runs on the real image, through the game's own VM session and the
// game's own flow, and judges each with the mission's checks. A run that is judged the way its
// solution.yaml says is written to src/test/runs/, where the tests judge it again without a VM.
// A mission with a fault is judged from its fault run; one without, from the Machine's state as
// the game's "check my work" reads it, which is recorded beside the events.
// Usage: pnpm --filter @peerfall/missions vm:golden [mission-id …]
//        (after pnpm vm:image; several minutes for every mission)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { judgeMission, summariseRun } from '@peerfall/game/utils'
import { createVmSession, readMachineState, restartRouterFrr } from '@peerfall/machine/services'
import type { MachineState, StampedMachineEvent, VmPhase } from '@peerfall/machine/types'
import { applyEventUpdate, EMPTY_EVENT_LOG } from '@peerfall/machine/utils'
import { parse } from 'yaml'
import type { ContentFiles } from '#types/definitions/content'
import { loadContent } from '#utils/loader/load-content.util'
import { changeLines, type GoldenRun, validateSolution } from '#utils/run/golden-run.util'
import {
  checkRun,
  faultRun,
  type MissionMachine,
  probeRun,
  START_SLOT,
  waitUntilSettled,
} from '#utils/run/mission-run.util'

/** After a change, BFD needs a moment to form its session (or to fail to) before the fault. */
const BEFORE_FAULT_MS = 6000
/** Starting or restarting a router's FRR takes up to half a minute in the emulator. */
const CHANGE_TIMEOUT_MS = 120_000

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const content = join(here, '../content')
const runsDir = join(here, '../src/test/runs')
const vm = join(repo, 'apps/web/public/vm')
const started = Date.now()
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const log = (text: string) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${text}`)

// The content from disk: the game reads it through Vite's glob, which Node does not have.
function contentFiles(): ContentFiles {
  const read = (path: string) => readFileSync(join(content, path), 'utf8')
  const missions: Record<string, string> = {}
  const incidents: Record<string, string> = {}
  const debriefs: Record<string, string> = {}
  for (const chapter of readdirSync(content, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const mission of readdirSync(join(content, chapter.name), { withFileTypes: true })) {
      if (mission.isDirectory()) {
        const folder = `${chapter.name}/${mission.name}`
        missions[`${folder}/mission.yaml`] = read(`${folder}/mission.yaml`)
        incidents[`${folder}/incident.md`] = read(`${folder}/incident.md`)
        debriefs[`${folder}/debrief.md`] = read(`${folder}/debrief.md`)
      }
    }
  }
  return { chapters: read('chapters.yaml'), missions, incidents, debriefs }
}

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

/** A mission without one: its probe if it has one, for the record, then the game's "check my work". */
async function playCheck(mission: MissionDefinition): Promise<Played> {
  await waitUntilSettled(machine, mission)
  if (mission.probe) {
    const probed = await probeRun(machine, mission)
    if (!probed.ok) {
      return probed
    }
  }
  return checkRun(machine, mission)
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
  const solution = validateSolution(parse(readFileSync(join(content, folder, 'solution.yaml'), 'utf8')))
  if (!solution.ok) {
    return solution.errors.map((error) => `${folder}/solution.yaml: ${error}`)
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

  for (const run of solution.value) {
    await session.restoreHealthy(START_SLOT)
    for (const change of run.changes) {
      for (const line of changeLines(change)) {
        const reply = await session.control(line, CHANGE_TIMEOUT_MS)
        if (reply.status !== 0) {
          failures.push(`${mission.id}/${run.id}: ${change.router} refused the change: ${reply.output.trim()}`)
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

async function main(): Promise<string[]> {
  const loaded = loadContent(contentFiles())
  if (!loaded.ok) {
    return [...loaded.errors]
  }
  // With ids on the command line, only those missions are played: the others' runs stay as recorded.
  const ids = process.argv.slice(2)
  const unknown = ids.filter((id) => !loaded.value.game.mission(id))
  if (unknown.length > 0) {
    return unknown.map((id) => `no mission with id "${id}"`)
  }
  const wanted = loaded.value.game.missions.filter((mission) => ids.length === 0 || ids.includes(mission.id))
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
  for (const mission of wanted) {
    failures.push(...(await playMission(mission, loaded.value.folderOf(mission.id) ?? '')))
  }
  return failures
}

const failures = await main().catch((error: unknown) => [error instanceof Error ? error.message : String(error)])
await session.stop()
log(failures.length === 0 ? 'every golden run was judged as its solution says' : `FAILED:\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
