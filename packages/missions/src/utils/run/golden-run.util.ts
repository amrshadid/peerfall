import type { Validated } from '@peerfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@peerfall/core/utils'
import { frrRestartLine, inRouter } from '@peerfall/machine/utils'

/** One thing a scripted player does on a router. */
export type GoldenChange =
  /** Lines typed into the router's vtysh, one after another. */
  | { readonly router: string; readonly lines: readonly string[] }
  /** Lines typed at the router's shell: its namespace and its hostname, as the terminal's. */
  | { readonly router: string; readonly shell: readonly string[] }
  /** FRR restarted on the router, from its saved frr.conf. */
  | { readonly router: string; readonly restart: true }

/** One golden run of a mission's `solution.yaml`: what a player might do, and whether the mission must pass. */
export interface GoldenRun {
  readonly id: string
  readonly passes: boolean
  readonly changes: readonly GoldenChange[]
}

const RUN_ID = { pattern: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, expected: 'a kebab-case id like bfd-both-ends' }
// A line is put inside single quotes on root's control channel.
const QUOTE_FREE = { pattern: /^[^']+$/, expected: "a line without a single quote (')" }

function readChange(change: ObjectReader): GoldenChange {
  change.rejectUnknownKeys(['router', 'lines', 'shell', 'restart'])
  const router = change.string('router')
  const given = ['lines', 'shell', 'restart'].filter((key) => change.has(key))
  if (given.length !== 1) {
    change.issues.add(change.path, 'expected one of "lines" (vtysh), "shell" or "restart: true"')
    return { router, lines: [] }
  }
  if (change.has('restart')) {
    if (change.value('restart') !== true) {
      change.issues.add(change.pathOf('restart'), 'expected true')
    }
    return { router, restart: true }
  }
  return change.has('shell')
    ? { router, shell: change.stringList('shell', QUOTE_FREE) }
    : { router, lines: change.stringList('lines', QUOTE_FREE) }
}

/** Checks a parsed `solution.yaml` and returns its golden runs, or every problem with its path. */
export function validateSolution(raw: unknown): Validated<readonly GoldenRun[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['runs'])
  const runs = reader.list('runs', (value, path): GoldenRun => {
    const run = new ObjectReader(value, path, issues)
    run.rejectUnknownKeys(['id', 'passes', 'changes'])
    if (typeof run.value('passes') !== 'boolean') {
      issues.add(run.pathOf('passes'), 'expected true or false')
    }
    return {
      id: run.string('id', RUN_ID),
      passes: run.value('passes') === true,
      changes: run.list('changes', (change, at) => readChange(new ObjectReader(change, at, issues))),
    }
  })
  reportDuplicates(
    runs.map((run) => run.id),
    'runs',
    issues
  )
  if (issues.count === 0) {
    // A mission's checks are only proven by a run they pass and a run they refuse.
    if (!runs.some((run) => run.passes)) {
      issues.add('runs', 'expected a run that passes: the reference solution')
    }
    if (!runs.some((run) => !run.passes && run.changes.length === 0)) {
      issues.add('runs', 'expected a run with no changes that does not pass: the mission as it starts')
    }
    if (!runs.some((run) => !run.passes && run.changes.length > 0)) {
      issues.add('runs', 'expected a run that changes something and does not pass: a wrong or half-done solution')
    }
  }
  return issues.result(runs)
}

/** Root's control lines that make one change, as the scripted player would at the router. */
export function changeLines(change: GoldenChange): string[] {
  if ('restart' in change) {
    return [frrRestartLine(change.router)]
  }
  if ('shell' in change) {
    return change.shell.map((line) => inRouter(change.router, line))
  }
  return change.lines.length === 0
    ? []
    : [`vtysh -N ${change.router} ${change.lines.map((line) => `-c '${line}'`).join(' ')}`]
}
