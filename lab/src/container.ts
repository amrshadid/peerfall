import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const LAB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO_DIR = join(LAB_DIR, '..')

const COMPOSE = ['compose', '-f', join(LAB_DIR, 'compose.yaml')]
const SERVICE = 'lab'
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024

/** A line's exit status and everything it printed (stdout and stderr), as the VM's control channel returns it. */
export interface Reply {
  readonly status: number
  readonly output: string
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function docker(args: readonly string[]): Reply {
  const done = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: MAX_OUTPUT_BYTES })
  if (done.error) {
    throw done.error
  }
  return { status: done.status ?? 1, output: `${done.stdout}${done.stderr}` }
}

/** `docker compose <args>` for the lab's compose file, shown on this terminal. */
export function compose(args: readonly string[]): void {
  const done = spawnSync('docker', [...COMPOSE, ...args], { stdio: 'inherit' })
  if (done.error) {
    throw done.error
  }
  if (done.status !== 0) {
    throw new Error(`docker compose ${args.join(' ')} exited with status ${done.status}`)
  }
}

export const isRunning = (): boolean =>
  docker([...COMPOSE, 'ps', '--status', 'running', '--services'])
    .output.split('\n')
    .includes(SERVICE)

/** Runs a line as root in the container with `sh -c`: the VM's control channel `eval`s it in the same busybox shell. */
export const run = (line: string): Reply => docker([...COMPOSE, 'exec', '-T', SERVICE, 'sh', '-c', line])

/** Starts a line in the container and returns at once: a probe, a monitor. */
export function start(line: string): void {
  const reply = docker([...COMPOSE, 'exec', '-T', '-d', SERVICE, 'sh', '-c', line])
  if (reply.status !== 0) {
    throw new Error(`${line}: exited with status ${reply.status}\n${reply.output}`)
  }
}

/** What a line printed; throws with the line and its output if it failed. */
export function read(line: string): string {
  const reply = run(line)
  if (reply.status !== 0) {
    throw new Error(`${line}: exited with status ${reply.status}\n${reply.output.trim()}`)
  }
  return reply.output
}

export interface Timed extends Reply {
  /** The container's clock just before and just after the line, in seconds since the epoch. */
  readonly before: number
  readonly after: number
}

/** Runs a line and reads the container's clock around it, in one `exec`, so the times are not the host's. */
export function runTimed(line: string): Timed {
  const script = 'echo $EPOCHREALTIME; sh -c "$1" 2>&1; status=$?; echo; echo $EPOCHREALTIME $status'
  const reply = docker([...COMPOSE, 'exec', '-T', SERVICE, 'bash', '-c', script, 'lab', line])
  const lines = reply.output.trimEnd().split('\n')
  const [after, status] = (lines.at(-1) ?? '').split(' ')
  return {
    before: Number(lines[0]),
    after: Number(after),
    status: reply.status === 0 ? Number(status) : reply.status,
    output: lines.slice(1, -1).join('\n').trim(),
  }
}

/** A time on the container's clock the way FRR writes it in its log (UTC, milliseconds). */
export function frrTime(epochSeconds: number): string {
  const iso = new Date(epochSeconds * 1000).toISOString()
  return `${iso.slice(0, 10).replaceAll('-', '/')} ${iso.slice(11, 23)}`
}
