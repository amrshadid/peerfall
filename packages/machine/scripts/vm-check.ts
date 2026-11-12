// Boots the built image through the game's own VM session, in Node, and checks what a mission
// relies on: a network built from a definition, OSPF converging, a link that drops packets while
// it stays up, the saved network restored to the moment it was saved, and the terminal moving
// between routers. Usage: pnpm vm:check   (after pnpm vm:image; takes about two minutes)
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createVmSession } from '#services/vm/vm-session.service'
import { TRIANGLE, TRIANGLE_DIRECT_LINK } from '#test/triangle'
import type { VmPhase } from '#types/definitions/vm'
import { linkFaultLine } from '#utils/network/network-script.util'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const vm = join(repo, 'apps/web/public/vm')
const POLL_MS = 500
const started = Date.now()
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (text: string) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${text}`)
// biome-ignore lint/suspicious/noControlCharactersInRegex: matches the terminal's escape sequences
const TERMINAL_CODES = /\x1b\[[0-9;?]*[A-Za-z]/g

// v86 in Node reads its files from disk; the session fetches only manifest.json, so that read is served from disk too.
const fetchUrl = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  return url.startsWith('/') ? new Response(await readFile(url)) : fetchUrl(input, init)
}

const session = createVmSession()
let screen = ''
let phase: VmPhase = 'off'
let detail: string | null = null
const failures: string[] = []

function check(what: string, ok: boolean, shown = '') {
  log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !shown ? '' : `\n${shown}`}`)
  if (!ok) {
    failures.push(what)
  }
}

async function until(what: string, ok: () => boolean | Promise<boolean>, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  while (!(await ok())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`)
    }
    await wait(POLL_MS)
  }
}

const root = async (line: string) => (await session.control(line)).output.replaceAll('\r', '').trim()
const neighbors = (router: string) => root(`vtysh -N ${router} -c 'show ip ospf neighbor'`)
const routeToC = () => root('ip -n a route get 10.255.0.3 | head -1')
const shown = () => screen.replace(TERMINAL_CODES, '').replaceAll('\r', '')

/** Types a line on the player's terminal and returns what it showed up to the next prompt. */
async function type(line: string, prompt: string): Promise<string> {
  // An index into the plain text, which is shorter than the screen's bytes.
  const from = shown().length
  session.input(`${line}\n`)
  await until(
    `"${line}" to return to ${prompt}`,
    () => shown().slice(from).trimEnd().endsWith(prompt.trimEnd()),
    60_000
  )
  return shown().slice(from)
}

async function main() {
  await session.start(
    { baseUrl: `${vm}/`, wasmUrl: join(repo, 'packages/machine/node_modules/v86/build/v86.wasm'), fresh: true },
    (bytes) => {
      screen += Buffer.from(bytes).toString('latin1')
    },
    (status) => {
      phase = status.phase
      detail = status.detail
    }
  )
  await until('Linux to boot', () => phase === 'ready' || phase === 'failed')
  check('the Machine boots to its prompt', phase === 'ready', detail ?? '')
  log('booted')

  const built = await session.setupNetwork(TRIANGLE)
  check('the triangle is built from its definition', built.ok, built.ok ? '' : built.errors.join('\n'))
  if (!built.ok) {
    return
  }
  log('network built')
  for (const router of ['a', 'b', 'c']) {
    await until(
      `${router}'s two neighbors to be Full`,
      async () => ((await neighbors(router)).match(/Full\//g) ?? []).length === 2
    )
  }
  await until('the direct route to c', async () => (await routeToC()).includes('dev a-c'))
  check('OSPF converges and a reaches c over the direct link', true)
  const config = await root("vtysh -N a -c 'show running-config'")
  check(
    'the running configuration is the one the definition gave',
    config.includes('hostname a') && config.includes('ip ospf cost 10') && config.includes('ospf router-id 10.255.0.1'),
    config
  )

  await session.selectRouter('a')
  const inA = await type("vtysh -c 'show ip ospf neighbor'", 'a:~#')
  check('the terminal is in router a and its vtysh reaches a’s daemons', (inA.match(/Full\//g) ?? []).length === 2, inA)

  check('the healthy network is saved', await session.saveHealthy())
  const before = await neighbors('a')

  await session.control(linkFaultLine(TRIANGLE_DIRECT_LINK, true))
  await session.control('touch /tmp/after-save')
  const during = await root('ip -n a -br link show a-c; ip netns exec a ping -c 2 -W 1 -I 10.0.2.1 10.0.2.2 | tail -2')
  check(
    'the fault drops packets on a-c while the interface stays up',
    /LOWER_UP/.test(during) && /100% packet loss/.test(during),
    during
  )
  await session.selectRouter('b')
  const inB = await type('ip -br addr show | grep -c b-', 'b:~#')
  check('the terminal moves to router b', inB.includes('2'), inB)
  await wait(20_000)

  check('the healthy network is restored', await session.restoreHealthy())
  const after = await root('ls /tmp/after-save 2>&1; tc -n a qdisc show dev a-c')
  check(
    'the restore undid the fault and everything after the save',
    after.includes('No such file') && !after.includes('netem'),
    after
  )
  await wait(15_000)
  const later = await neighbors('a')
  check(
    'the restored network is still converged, with no adjacency lost',
    (later.match(/Full\//g) ?? []).length === 2 && !/\b\d\.\d+s\s+\d+\.\d+s\s+10\.0\.2\.2/.test(later),
    `before the fault:\n${before}\nafter the restore:\n${later}`
  )
  const changes = await root('grep -c "Full -> " /var/log/frr/a.log')
  check('a’s log shows no adjacency going down', changes === '0', changes)
  const stillB = await type('echo $PF_ROUTER', 'b:~#')
  check('the terminal stays in router b across the restore', stillB.includes('\nb\n'), stillB)
}

try {
  await main()
} catch (error) {
  check(error instanceof Error ? error.message : String(error), false, shown().slice(-1500))
}
await session.stop()
log(failures.length === 0 ? 'all checks passed' : `${failures.length} failed: ${failures.join('; ')}`)
process.exit(failures.length === 0 ? 0 : 1)
