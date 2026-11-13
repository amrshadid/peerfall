import type { GuideObjective } from '@features/guide/types'
import { formatSeconds } from '@features/timeline/utils/runs'
import type {
  CheckDefinition,
  CheckResult,
  MissionDefinition,
  MissionVerdict,
  ObjectiveDefinition,
  RouteHop,
} from '@peerfall/game/types'
import type { KernelRoute } from '@peerfall/machine/types'
import { DETECTOR_NAMES, NOT_CHECKED, NOT_TESTED, TERMS } from './objective-text.constants'

const MS_PER_SECOND = 1000

/** The names a sentence about the probe needs: who sends it, to which address, and whose address that is. */
export interface ProbeNames {
  readonly from: string
  readonly destination: string
  /** The router that owns the destination, or the address itself when no router does. */
  readonly target: string
}

/** A mission with no traffic to watch has no probe; its checks name their own routers. */
const NO_PROBE: ProbeNames = { from: 'the router', destination: 'the destination', target: 'the destination' }

export function probeNamesOf(mission: Pick<MissionDefinition, 'probe' | 'network'>): ProbeNames {
  if (!mission.probe) {
    return NO_PROBE
  }
  const { from, destination } = mission.probe
  const owner = mission.network.routers.find((router) => router.loopback?.split('/')[0] === destination)
  return { from, destination, target: owner?.name ?? destination }
}

/** A kernel route in one line, as `ip route` would say it. */
const kernelRouteText = (route: KernelRoute): string => {
  const hops = route.nextHops.map((hop) =>
    hop.via === null ? `on ${hop.interface}` : `via ${hop.via} on ${hop.interface}`
  )
  return [route.prefix, ...(route.protocol === '' ? [] : [`from ${route.protocol}`]), hops.join(' and ')]
    .filter((part) => part !== '')
    .join(' ')
}

const packets = (count: number): string => (count === 1 ? '1 packet' : `${count} packets`)

const seconds = (ms: number): string => formatSeconds(ms / MS_PER_SECOND)

const code = (name: string): string => `\`${name}\``

/** Every interface the route leaves through, as code: one, or several when equal-cost paths share the traffic. */
const interfacesOf = (route: RouteHop): string =>
  [...new Set(route.nextHops.length > 0 ? route.nextHops.map((hop) => hop.interface) : [route.interface])]
    .map(code)
    .join(' and ')

const onlyThrough = (route: RouteHop | null, name: string): boolean =>
  route !== null &&
  (route.nextHops.length > 0 ? route.nextHops.every((hop) => hop.interface === name) : route.interface === name)

const replies = (count: number): string => (count === 1 ? '1 reply' : `${count} replies`)

/** Why an objective is still open, for someone who has never met the terms. */
export function failureText(check: CheckDefinition, result: CheckResult, names: ProbeNames): string {
  switch (result.failure) {
    case 'no_fault':
      return NOT_TESTED
    case 'not_checked':
      return NOT_CHECKED
    case 'daemons_down':
      return result.kind === 'daemons'
        ? `${result.missing.map(code).join(' and ')} did not answer on router ${result.router}. ${TERMS.daemon}`
        : `A daemon this objective needs is not running. ${TERMS.daemon}`
    case 'wrong_route':
      return result.kind === 'route' && result.route
        ? `Router ${result.router} has a route there, but not the one asked for: ${code(kernelRouteText(result.route))}. ${TERMS.route}`
        : `The router has a route there, but not the one this objective asks for. ${TERMS.route}`
    case 'not_configured':
      return result.kind === 'config'
        ? `Router ${result.router}'s ${result.source} configuration does not have that line yet. ${TERMS.configuration}`
        : `The configuration does not have that line yet. ${TERMS.configuration}`
    case 'still_configured':
      return result.kind === 'config' && result.found
        ? `Router ${result.router}'s ${result.source} configuration still has ${code(result.found)}. ${TERMS.configuration}`
        : `The configuration still has that line. ${TERMS.configuration}`
    case 'no_config':
      return result.kind === 'config'
        ? `Router ${result.router} has no ${result.source} configuration to read yet. ${TERMS.configuration}`
        : `There is no configuration to read yet. ${TERMS.configuration}`
    case 'unreachable': {
      if (result.kind === 'reaches') {
        return `${result.received} of ${packets(result.sent)} from ${result.from} to ${result.to} ${result.received === 1 ? 'was' : 'were'} answered. ${TERMS.reply}`
      }
      const got = result.kind === 'reachable' ? result.replies : 0
      const needed = check.kind === 'reachable' ? ` It takes ${check.minReplies}.` : ''
      return `${got === 0 ? 'No reply' : `Only ${replies(got)}`} came back from ${names.destination}.${needed} ${TERMS.reply}`
    }
    case 'no_route':
      return result.kind === 'route'
        ? `Router ${result.router} has no route there. ${TERMS.route}`
        : `${names.from} had no route to ${names.destination} when it needed one. ${TERMS.route}`
    case 'wrong_path': {
      if (result.kind === 'path' && check.kind === 'path') {
        if (check.before !== undefined && result.before && !onlyThrough(result.before, check.before)) {
          return `Before the link broke, ${names.from} sent traffic for ${names.destination} out of ${interfacesOf(result.before)}, not only ${code(check.before)}. ${TERMS.interface}`
        }
        if (check.after !== undefined && result.after && !onlyThrough(result.after, check.after)) {
          return `After the link broke, traffic came back out of ${interfacesOf(result.after)}, not only ${code(check.after)}.`
        }
      }
      return `Traffic from ${names.from} to ${names.target} took another way than this objective asks for.`
    }
    case 'not_recovered':
      return check.kind === 'recovery'
        ? `Replies never came back through ${code(check.via)} before the run ended: traffic to ${names.target} stayed lost.`
        : `Traffic to ${names.target} did not come back before the run ended.`
    case 'too_slow': {
      if (result.kind === 'recovery' && result.recovery) {
        return `Traffic was back after ${seconds(result.recovery.afterFaultMs)}, over the ${seconds(result.limitMs)} target. Something has to notice the dead link sooner.`
      }
      if (result.kind === 'outage' && result.outage?.durationMs != null) {
        return `Traffic was lost for ${seconds(result.outage.durationMs)}, over the ${seconds(result.limitMs)} limit.`
      }
      return 'Traffic came back, but later than the target allows.'
    }
    case 'not_detected':
      return `Nothing reported the dead link before the run ended. ${TERMS.detectors}`
    case 'wrong_detector': {
      const wanted = check.kind === 'detected-by' ? DETECTOR_NAMES[check.event] : 'what this objective asks for'
      const got =
        result.kind === 'detected-by' && result.detection ? DETECTOR_NAMES[result.detection.event] : 'Something else'
      return `${got} noticed the fault first, not ${wanted}. ${TERMS.detectors}`
    }
    default:
      return 'This objective is not met yet.'
  }
}

/** What the last run showed that met an objective, with each term explained beside it; null when it says nothing. */
export function evidenceText(result: CheckResult, names: ProbeNames): string | null {
  switch (result.kind) {
    case 'reachable':
      return `${replies(result.replies)} came back from ${names.destination}. ${TERMS.reply}`
    case 'path': {
      const before = result.before
        ? `${names.from} sends traffic for ${names.destination} out of ${interfacesOf(result.before)}.`
        : null
      const after = result.after ? `After the fault it left through ${interfacesOf(result.after)}.` : null
      const said = [before, after].filter((part) => part !== null)
      return said.length > 0 ? `${said.join(' ')} ${TERMS.interface}` : null
    }
    case 'recovery':
      return result.recovery
        ? `Traffic was back through ${interfacesOf(result.recovery.route)} ${seconds(result.recovery.afterFaultMs)} after the link broke, inside the ${seconds(result.limitMs)} target.`
        : null
    case 'outage':
      return result.outage?.durationMs != null
        ? `The longest gap without a reply was ${seconds(result.outage.durationMs)}, inside the ${seconds(result.limitMs)} limit.`
        : null
    case 'detected-by':
      return result.detection
        ? `${DETECTOR_NAMES[result.detection.event]} on ${result.detection.router} noticed the fault ${seconds(result.detection.afterFaultMs)} after it began.`
        : null
    case 'daemons':
      return `${result.running.map(code).join(', ')} ${result.running.length === 1 ? 'answers' : 'answer'} on router ${result.router}. ${TERMS.daemon}`
    case 'route':
      return result.route
        ? `Router ${result.router}'s kernel has ${code(kernelRouteText(result.route))}. ${TERMS.route}`
        : null
    case 'reaches':
      return `${result.received} of ${packets(result.sent)} from ${result.from} to ${result.to} ${result.received === 1 ? 'was' : 'were'} answered. ${TERMS.reply}`
    case 'config':
      return result.found !== null
        ? `Router ${result.router}'s ${result.source} configuration has ${code(result.found.trim())}. ${TERMS.configuration}`
        : null
    default:
      return null
  }
}

/** The mission's objectives as the Guide lists them: open until a run has met them, with what that run showed. */
export function guideObjectivesOf(
  mission: Pick<MissionDefinition, 'objectives' | 'probe' | 'network'>,
  verdict: MissionVerdict | null
): readonly GuideObjective[] {
  const names = probeNamesOf(mission)
  return mission.objectives.map((objective: ObjectiveDefinition) => {
    const result = verdict?.objectives.find((judged) => judged.objectiveId === objective.id)?.result ?? null
    if (result === null) {
      return { id: objective.id, text: objective.text, passed: false, observed: null, evidence: null }
    }
    return {
      id: objective.id,
      text: objective.text,
      passed: result.passed,
      observed: result.passed ? null : failureText(objective.check, result, names),
      evidence: result.passed ? evidenceText(result, names) : null,
    }
  })
}
