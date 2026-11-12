// Plays every mission's golden runs on the real image, through the game's own VM session and the
// game's own flow, and judges each with the mission's checks. A run that is judged the way its
// solution.yaml says is written to src/test/runs/, where the tests judge it again without a VM.
// Usage: pnpm --filter @peerfall/missions vm:golden   (after pnpm vm:image; several minutes)
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { MissionDefinition } from '@peerfall/game/types'
import { judgeMission, summariseRun } from '@peerfall/game/utils'
import { createVmSession } from '@peerfall/machine/services'
import type { VmPhase } from '@peerfall/machine/types'
import { applyEventUpdate, EMPTY_EVENT_LOG } from '@peerfall/machine/utils'
import { parse } from 'yaml'
import type { ContentFiles } from '#types/definitions/content'
import { loadContent } from '#utils/loader/load-content.util'
import { faultRun, type MissionMachine, START_SLOT, waitUntilSettled } from '#utils/run/mission-run.util'

interface GoldenRun {
  readonly id: string
  readonly passes: boolean
  readonly changes: readonly { readonly router: string; readonly lines: readonly string[] }[]
}

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
}

async function playMission(mission: MissionDefinition, folder: string): Promise<string[]> {
  const failures: string[] = []
  const { runs } = parse(readFileSync(join(content, folder, 'solution.yaml'), 'utf8')) as { runs: GoldenRun[] }
  const built = await session.setupNetwork(mission.network)
  if (!built.ok) {
    return [`${mission.id}: the network could not be built: ${built.errors.join('; ')}`]
  }
  if (!(await waitUntilSettled(machine, mission))) {
    return [`${mission.id}: the network never settled`]
  }
  await session.saveHealthy(START_SLOT)
  log(`${mission.id}: network built and settled`)

  for (const run of runs) {
    await session.restoreHealthy(START_SLOT)
    for (const { router, lines } of run.changes) {
      const reply = await session.control(`vtysh -N ${router} ${lines.map((line) => `-c '${line}'`).join(' ')}`)
      if (reply.status !== 0) {
        failures.push(`${mission.id}/${run.id}: ${router} refused the change: ${reply.output.trim()}`)
      }
    }
    // BFD needs a moment to form its session (or to fail to), and the network to settle again.
    await wait(run.changes.length > 0 ? 6000 : 0)
    await waitUntilSettled(machine, mission)
    const outcome = await faultRun(machine, mission)
    if (!outcome.ok) {
      failures.push(`${mission.id}/${run.id}: ${outcome.errors.join('; ')}`)
      continue
    }
    const verdict = judgeMission(mission, outcome.events)
    const summary = summariseRun(outcome.events, mission)
    const since = (atMs: number | undefined) =>
      atMs === undefined || summary.faultAtMs === null ? 'never' : `+${Math.round(atMs - summary.faultAtMs)} ms`
    log(
      `${mission.id}/${run.id}: ${verdict.passed ? 'passed' : 'not passed'} (expected ${run.passes ? 'passed' : 'not passed'}); ` +
        `outage ${summary.outage?.durationMs === null || summary.outage === null ? 'still down' : `${Math.round(summary.outage.durationMs)} ms`}; ` +
        `detected by ${summary.detection ? `${summary.detection.event} on ${summary.detection.router} ${since(summary.detection.atMs)}` : 'nothing'}; ` +
        `${outcome.events.length} events`
    )
    for (const { objectiveId, result } of verdict.objectives) {
      log(`    ${result.passed ? 'ok  ' : 'FAIL'} ${objectiveId}${result.failure ? ` (${result.failure})` : ''}`)
    }
    if (verdict.passed !== run.passes) {
      failures.push(`${mission.id}/${run.id}: judged ${verdict.passed ? 'passed' : 'not passed'}`)
      continue
    }
    mkdirSync(join(runsDir, mission.id), { recursive: true })
    writeFileSync(
      join(runsDir, mission.id, `${run.id}.json`),
      `${JSON.stringify({ mission: mission.id, version: mission.version, run: run.id, passes: run.passes, events: outcome.events })}\n`
    )
  }
  return failures
}

async function main(): Promise<string[]> {
  const loaded = loadContent(contentFiles())
  if (!loaded.ok) {
    return [...loaded.errors]
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
  for (const mission of loaded.value.game.missions) {
    failures.push(...(await playMission(mission, loaded.value.folderOf(mission.id) ?? '')))
  }
  return failures
}

const failures = await main().catch((error: unknown) => [error instanceof Error ? error.message : String(error)])
await session.stop()
log(failures.length === 0 ? 'every golden run was judged as its solution says' : `FAILED:\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
