import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { frrTime, LAB_DIR, REPO_DIR, read, run, wait } from '#lab/container'
import {
  down,
  FAULT_ENDS,
  fault,
  logPath,
  ROUTERS,
  routeAcross,
  type SetupTiming,
  until,
  up,
  vtysh,
  waitConverged,
} from '#lab/network'
import { longestGap, MONITOR_LINE, PROBE_LINE, startProbe, stopProbe } from '#lab/probe'

const CAPTURES_DIR = join(LAB_DIR, 'captures')
/** Turned on at runtime, as a learner would: the configuration the game writes stays untouched. */
const DEBUGS = ['debug bfd peer', 'debug ospf nsm', 'debug ospf bfd']
const BFD_COMMAND = 'ip ospf bfd'
/** The probe runs this long before the fault, so the gap is measured between replies. */
const PROBE_LEAD_MS = 3_000
/** A converged network is left alone this long before a fault, and BFD is watched this long after it is configured. */
const SETTLE_MS = 5_000
const BFD_WATCH_SECONDS = 15
/** The log lines a timeline is made of: BFD sessions, what OSPF hears from BFD, the dead timer, and adjacency changes. */
const EVENT =
  /state-change|session-new|session-delete|ospf_bfd_session_change|Inactivity timer expire|State change|AdjChg/
const LOG_TIME = /^(\d{4})\/(\d\d)\/(\d\d) (\d\d):(\d\d):(\d\d)\.(\d{3}) /

interface Scenario {
  readonly name: string
  readonly what: string
  /** The ends of the faulted link (0, 1) that get `ip ospf bfd`. */
  readonly bfdEnds: readonly number[]
  readonly runs: number
  /** How long the fault stays, and when during the first run the routers' state is saved. */
  readonly holdSeconds: number
  readonly snapshotsAt: readonly number[]
}

const ALL: readonly Scenario[] = [
  {
    name: 'baseline',
    what: 'No BFD: OSPF notices the loss only when its dead timer (40 s) expires.',
    bfdEnds: [],
    runs: 3,
    holdSeconds: 55,
    snapshotsAt: [5, 45],
  },
  {
    name: 'bfd-one-end',
    what: `"${BFD_COMMAND}" on ${FAULT_ENDS[0].router}'s ${FAULT_ENDS[0].interface} only.`,
    bfdEnds: [0],
    runs: 2,
    holdSeconds: 55,
    snapshotsAt: [5, 45],
  },
  {
    name: 'bfd-both-ends',
    what: `"${BFD_COMMAND}" on both ends of the link, FRR's default timers (300 ms x 3).`,
    bfdEnds: [0, 1],
    runs: 8,
    holdSeconds: 10,
    snapshotsAt: [5],
  },
]

export const SCENARIOS: readonly string[] = ALL.map(({ name }) => name)

function save(path: string, text: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text.endsWith('\n') || text === '' ? text : `${text}\n`)
}

const fileName = (command: string): string => `${command.replace(/[ -]+/g, '-')}.txt`

/** The real output of the show commands and the kernel's view, per router, at this moment. */
function snapshot(dir: string): void {
  for (const router of ROUTERS) {
    const end = FAULT_ENDS.find((candidate) => candidate.router === router)
    const shows = [
      'show ip ospf neighbor',
      ...(end ? [`show ip ospf interface ${end.interface}`] : []),
      'show ip route',
      'show bfd peers',
      'show running-config',
    ]
    for (const show of shows) {
      save(join(dir, router, fileName(show)), vtysh(router, show).output)
    }
    for (const line of ['ip -br link', 'ip route', 'tc qdisc show']) {
      const [tool, ...rest] = line.split(' ')
      save(join(dir, router, fileName(line)), run(`${tool} -n ${router} ${rest.join(' ')}`).output)
    }
  }
}

function logEpoch(line: string): number | null {
  const match = LOG_TIME.exec(line)
  if (!match) {
    return null
  }
  const [year, month, day, hour, minute, second, ms] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  return Date.UTC(year, month - 1, day, hour, minute, second, ms) / 1000
}

/** A router's log lines that are events, between two moments on the container's clock. */
function eventsBetween(router: string, from: number, to: number): string[] {
  return read(`cat ${logPath(router)}`)
    .split('\n')
    .filter((line) => {
      const at = logEpoch(line)
      return at !== null && at >= from && at <= to && EVENT.test(line)
    })
}

const seconds = (value: number): number => Number(value.toFixed(3))

/** Seconds from the fault to the first log line that matches, or null if there is none. */
function firstAfter(lines: readonly string[], pattern: RegExp, faultAt: number): number | null {
  const line = lines.find((candidate) => pattern.test(candidate))
  const at = line === undefined ? null : logEpoch(line)
  return at === null ? null : seconds(at - faultAt)
}

const bfdStatus = (router: string): string[] =>
  [...vtysh(router, 'show bfd peers').output.matchAll(/Status: (\S+)/g)].map((match) => match[1] ?? '')

/** Converged, and with BFD on both ends of the link, both sessions up. */
async function waitHealthy(scenario: Scenario): Promise<void> {
  await waitConverged()
  if (scenario.bfdEnds.length === FAULT_ENDS.length) {
    for (const end of FAULT_ENDS) {
      await until(`${end.router}'s BFD session to be up`, () => bfdStatus(end.router).includes('up'))
    }
  }
}

async function faultRun(scenario: Scenario, dir: string, number: number) {
  await waitHealthy(scenario)
  await wait(SETTLE_MS)
  const runDir = join(dir, `run-${number}`)
  if (number === 1) {
    snapshot(join(dir, 'healthy'))
  }
  startProbe()
  await wait(PROBE_LEAD_MS)
  const on = fault(true)
  const started = Date.now()
  if (number === 1) {
    for (const at of scenario.snapshotsAt) {
      await wait(Math.max(0, started + at * 1000 - Date.now()))
      snapshot(join(dir, `fault-${String(at).padStart(2, '0')}s`))
    }
  }
  await wait(Math.max(0, started + scenario.holdSeconds * 1000 - Date.now()))
  const interfaces = FAULT_ENDS.map((end) => read(`ip -n ${end.router} -br link show ${end.interface}`).trim())
  const routes = FAULT_ENDS.map(routeAcross)
  const off = fault(false)
  const healed = Date.now()
  await waitHealthy(scenario)
  const reconverged = seconds((Date.now() - healed) / 1000)
  // The probe and the monitor run through the repair too: they show the way back to the direct path.
  const { probe, monitor } = stopProbe()

  const outage = longestGap(probe)
  const monitorAfterFault = monitor.split('\n').filter((line) => {
    const stamp = /^\[([^\]]+)\]/.exec(line)?.[1]
    return stamp !== undefined && Date.parse(`${stamp}Z`) / 1000 >= on.before
  })
  const firstRouteChange = /^\[([^\]]+)\]/.exec(monitorAfterFault[0] ?? '')?.[1]
  save(join(runDir, 'probe.txt'), `# ${PROBE_LINE}\n${probe}`)
  save(join(runDir, 'ip-monitor-route.txt'), `# ${MONITOR_LINE}\n${monitor}`)
  const ends = FAULT_ENDS.map((end, index) => {
    const events = eventsBetween(end.router, on.before - 1, off.before + reconverged + 1)
    save(join(runDir, `events-${end.router}.txt`), events.join('\n'))
    return {
      router: end.router,
      interfaceDuringFault: interfaces[index],
      staysUp: /<[^>]*\bUP,LOWER_UP>/.test(interfaces[index] ?? ''),
      routeDuringFault: routes[index],
      bfdDownAfterFault: firstAfter(events, /state-change: .* up -> down/, on.before),
      deadTimerAfterFault: firstAfter(events, /Inactivity timer expire/, on.before),
      adjacencyDownAfterFault: firstAfter(events, /AdjChg: .* Full -> /, on.before),
    }
  })
  const result = {
    run: number,
    faultAt: frrTime(on.before),
    faultAtEpoch: on.before,
    faultLineSeconds: seconds(on.after - on.before),
    healedAt: frrTime(off.before),
    outageSeconds: outage.seconds,
    lastReplyBeforeOutage: frrTime(outage.lastReply),
    firstReplyAfterOutage: frrTime(outage.firstReply),
    faultToLastReplySeconds: seconds(outage.lastReply - on.before),
    faultToFirstReplySeconds: seconds(outage.firstReply - on.before),
    probesLost: outage.lost,
    replies: outage.replies,
    // ping's own "Destination Host Unreachable" lines: the kernel gave up resolving the next hop.
    hostUnreachableLines: probe.split('\n').filter((line) => line.includes('Destination Host Unreachable')).length,
    firstRouteChangeAfterFault:
      firstRouteChange === undefined ? null : seconds(Date.parse(`${firstRouteChange}Z`) / 1000 - on.before),
    ends,
    fullAndDirectAgainAfterHealSeconds: reconverged,
  }
  save(join(runDir, 'result.json'), JSON.stringify(result, null, 2))
  console.log(
    `${scenario.name} run ${number}: outage ${outage.seconds} s (${outage.lost} probes lost), ` +
      `${ends.map((end) => `${end.router} ${end.staysUp ? 'UP,LOWER_UP' : end.interfaceDuringFault}`).join(', ')}`
  )
  return result
}

async function runScenario(scenario: Scenario) {
  const dir = join(CAPTURES_DIR, scenario.name)
  rmSync(dir, { recursive: true, force: true })
  console.log(`\n== ${scenario.name}: ${scenario.what}`)
  down()
  const setup: SetupTiming = await up()
  save(
    join(CAPTURES_DIR, 'environment.txt'),
    read(
      [
        'uname -srm',
        'echo "Alpine $(cat /etc/alpine-release)"',
        '/usr/lib/frr/zebra --version | head -1',
        'echo "CPUs: $(nproc)"',
        'id frr',
        `ip netns exec ${FAULT_ENDS[0].router} sysctl net.ipv4.ip_forward net.ipv4.conf.all.rp_filter net.ipv4.conf.default.rp_filter`,
        'apk info -v | sort',
      ].join('; ')
    )
  )
  for (const router of ROUTERS) {
    save(
      join(dir, 'healthy', router, 'show-running-config-before-debug.txt'),
      vtysh(router, 'show running-config').output
    )
    const reply = vtysh(router, ...DEBUGS)
    if (reply.status !== 0) {
      throw new Error(`${router}: ${DEBUGS.join(', ')} failed\n${reply.output}`)
    }
  }
  for (const index of scenario.bfdEnds) {
    const end = FAULT_ENDS[index]
    if (!end) {
      continue
    }
    const reply = vtysh(end.router, 'configure terminal', `interface ${end.interface}`, BFD_COMMAND)
    if (reply.status !== 0) {
      throw new Error(`${end.router}: ${BFD_COMMAND} failed\n${reply.output}`)
    }
  }
  // What each end's bfdd says about its session, once a second: is there one, and does it come up?
  const statuses = FAULT_ENDS.map(() => new Set<string>())
  for (let second = 0; second < BFD_WATCH_SECONDS; second++) {
    FAULT_ENDS.forEach((end, index) => {
      const seen = bfdStatus(end.router)
      statuses[index]?.add(seen.length === 0 ? 'no session' : seen.join(','))
    })
    await wait(1000)
  }
  const runs = []
  for (let number = 1; number <= scenario.runs; number++) {
    runs.push(await faultRun(scenario, dir, number))
  }
  for (const router of ROUTERS) {
    const log = read(`cat ${logPath(router)}`)
    save(join(dir, 'logs', `${router}.txt`), log)
    save(
      join(dir, 'logs', `${router}-events.txt`),
      log
        .split('\n')
        .filter((line) => EVENT.test(line))
        .join('\n')
    )
  }
  const outages = runs.map((result) => result.outageSeconds)
  const summary = {
    scenario: scenario.name,
    what: scenario.what,
    setupSeconds: setup,
    bfdConfiguredOn: scenario.bfdEnds.map((index) => `${FAULT_ENDS[index]?.router} ${FAULT_ENDS[index]?.interface}`),
    bfdStatusSeenWhileHealthy: Object.fromEntries(
      FAULT_ENDS.map((end, index) => [end.router, [...(statuses[index] ?? [])]])
    ),
    faultHeldSeconds: scenario.holdSeconds,
    outagesSeconds: outages,
    shortest: Math.min(...outages),
    longest: Math.max(...outages),
    interfacesStayedUp: runs.every((result) => result.ends.every((end) => end.staysUp)),
    runs,
  }
  save(join(dir, 'results.json'), JSON.stringify(summary, null, 2))
  return summary
}

/** Runs the named scenarios, each on a network built from nothing, and writes lab/captures/. Leaves the lab down. */
export async function capture(names: readonly string[]): Promise<void> {
  const summaries = []
  for (const scenario of ALL.filter(({ name }) => names.includes(name))) {
    summaries.push(await runScenario(scenario))
  }
  down()
  // The repository's formatter checks JSON too: the results are written the way it wants them.
  spawnSync('pnpm', ['exec', 'biome', 'format', '--write', CAPTURES_DIR], { cwd: REPO_DIR, stdio: 'ignore' })
  console.log('')
  for (const { scenario, outagesSeconds, bfdStatusSeenWhileHealthy } of summaries) {
    console.log(`${scenario}: outages ${outagesSeconds.join(', ')} s; BFD ${JSON.stringify(bfdStatusSeenWhileHealthy)}`)
  }
}
