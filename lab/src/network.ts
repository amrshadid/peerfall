import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compose, isRunning, REPO_DIR, type Reply, read, run, runTimed, type Timed, wait } from '#lab/container'
// The lab runs the game's own lines, so the definition and the functions that turn it into shell
// lines are imported from the machine package by path. Nothing about the topology is typed here.
// biome-ignore lint/style/noRestrictedImports: lab/ is not a workspace package; it reads the machine's sources in place
import { TRIANGLE, TRIANGLE_DIRECT_LINK } from '../../packages/machine/src/test/triangle.ts'
// biome-ignore lint/style/noRestrictedImports: as above
import type { LinkDefinition, NetworkDefinition } from '../../packages/machine/src/types/definitions/network.ts'
import {
  interfaceName,
  linkFaultLine,
  networkProblems,
  networkSetupLines,
  routerLogPath,
  // biome-ignore lint/style/noRestrictedImports: as above
} from '../../packages/machine/src/utils/network/network-script.util.ts'

export const NETWORK: NetworkDefinition = TRIANGLE
/** The link the first mission breaks. */
export const FAULT_LINK: LinkDefinition = TRIANGLE_DIRECT_LINK
export const ROUTERS = NETWORK.routers.map(({ name }) => name)

const LOCK_FILE = join(REPO_DIR, 'packages/machine/scripts/vm-image/vm-image.lock.json')
/** In the lock for the VM only: its kernel, and the static busybox its initramfs is made from. */
const VM_ONLY_PACKAGES = ['linux-virt', 'busybox-static']
const POLL_MS = 500
const CONVERGE_TIMEOUT_MS = 120_000

const [nearEnd, farEnd] = FAULT_LINK.ends
const address = (router: string): string => {
  const loopback = NETWORK.routers.find(({ name }) => name === router)?.loopback
  if (loopback === undefined) {
    throw new Error(`router ${router} has no loopback to probe`)
  }
  return loopback.split('/')[0] ?? loopback
}

/** The faulted link seen from each of its ends: the router, its interface, its loopback and the far loopback. */
export const FAULT_ENDS = [
  {
    router: nearEnd.router,
    interface: interfaceName(nearEnd.router, farEnd.router),
    loopback: address(nearEnd.router),
    peerLoopback: address(farEnd.router),
  },
  {
    router: farEnd.router,
    interface: interfaceName(farEnd.router, nearEnd.router),
    loopback: address(farEnd.router),
    peerLoopback: address(nearEnd.router),
  },
] as const

export const logPath = routerLogPath
export const setupLines = (): string[] => networkSetupLines(NETWORK)
export const faultLine = (dropping: boolean): string => linkFaultLine(FAULT_LINK, dropping)

export const vtysh = (router: string, ...commands: string[]): Reply =>
  run(`vtysh -N ${router} ${commands.map((command) => `-c '${command}'`).join(' ')}`)

export async function until(what: string, ok: () => boolean, timeoutMs = CONVERGE_TIMEOUT_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!ok()) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`)
    }
    await wait(POLL_MS)
  }
}

const fullNeighbors = (router: string): number =>
  (vtysh(router, 'show ip ospf neighbor').output.match(/Full\//g) ?? []).length

const linksOf = (router: string): number =>
  NETWORK.links.filter(({ ends }) => ends.some((end) => end.router === router)).length

/** The first line of `ip route get` from one end of the faulted link to the other end's loopback. */
export const routeAcross = (end: (typeof FAULT_ENDS)[number]): string =>
  run(`ip -n ${end.router} route get ${end.peerLoopback} | head -1`).output.trim()

/** Every router Full with each of its neighbors, and both ends of the faulted link using it for each other's loopback. */
export async function waitConverged(): Promise<void> {
  for (const router of ROUTERS) {
    await until(`${router}'s ${linksOf(router)} neighbors to be Full`, () => fullNeighbors(router) === linksOf(router))
  }
  for (const end of FAULT_ENDS) {
    await until(`${end.router}'s direct route to ${end.peerLoopback}`, () =>
      routeAcross(end).includes(`dev ${end.interface} `)
    )
  }
}

/** Installed packages that differ from the VM image's lock: `name installed, lock version`. */
export function packageDifferences(): string[] {
  const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf8')) as { packages: Record<string, { version: string }> }
  const installed = new Set(read('apk info -v').split('\n'))
  return Object.entries(lock.packages)
    .filter(([name, { version }]) => !VM_ONLY_PACKAGES.includes(name) && !installed.has(`${name}-${version}`))
    .map(([name, { version }]) => {
      const found = [...installed].find((entry) => entry.replace(/-[^-]+-r\d+$/, '') === name)
      return `${name}: installed ${found ?? 'nothing'}, the VM image has ${version}`
    })
}

export interface SetupTiming {
  /** Seconds on the container's clock for each group of setup lines, and until OSPF was Full everywhere after them. */
  readonly namespaces: number
  readonly links: number
  readonly files: number
  readonly daemons: number
  readonly configuration: number
  readonly ospfFull: number
}

/** Builds and starts the container, runs the game's setup lines in it and waits for OSPF to converge. */
export async function up(): Promise<SetupTiming> {
  const problems = networkProblems(NETWORK)
  if (problems.length > 0) {
    throw new Error(`the network definition is not valid:\n${problems.join('\n')}`)
  }
  compose(['up', '-d', '--build', '--wait'])
  if (read('ip netns list').trim() !== '') {
    throw new Error('the network is already built in this container: run `down` first')
  }
  const differences = packageDifferences()
  if (differences.length > 0) {
    throw new Error(`the container's packages differ from the VM image's lock:\n${differences.join('\n')}`)
  }
  const routers = NETWORK.routers.length
  const groups = [
    ['namespaces', routers],
    ['links', NETWORK.links.length],
    ['files', routers],
    ['daemons', routers],
    ['configuration', routers],
  ] as const
  const lines = setupLines()
  const seconds: Record<string, number> = {}
  let at = 0
  for (const [group, count] of groups) {
    let spent = 0
    for (const line of lines.slice(at, at + count)) {
      const reply: Timed = runTimed(line)
      if (reply.status !== 0) {
        throw new Error(`${line}: exited with status ${reply.status}\n${reply.output}`)
      }
      spent += reply.after - reply.before
    }
    seconds[group] = Number(spent.toFixed(3))
    at += count
  }
  const configured = Date.now()
  await waitConverged()
  const timing = { ...seconds, ospfFull: Number(((Date.now() - configured) / 1000).toFixed(1)) } as SetupTiming
  console.log(`network up: ${JSON.stringify(timing)}`)
  return timing
}

export function down(): void {
  compose(['down', '--volumes', '--remove-orphans'])
}

/** Drops every packet on the faulted link, or stops dropping, and says when on the container's clock. */
export function fault(dropping: boolean): Timed {
  const reply = runTimed(faultLine(dropping))
  if (reply.status !== 0) {
    throw new Error(`${faultLine(dropping)}: exited with status ${reply.status}\n${reply.output}`)
  }
  return reply
}

export function requireRunning(): void {
  if (!isRunning()) {
    throw new Error('the lab is not running: start it with `node lab/lab.ts up`')
  }
}
