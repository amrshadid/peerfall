import type { DebriefMeasure } from '@features/debrief/types'
import { DETECTION_LABELS, formatSeconds } from '@features/timeline/utils/runs'
import type { RunSummary } from '@peerfall/game/types'

const MS_PER_SECOND = 1000

const seconds = (ms: number): string => formatSeconds(ms / MS_PER_SECOND)

/** How long traffic was gone in a run: from its fault to the first reply over the new route. */
const outageOf = (summary: RunSummary): string =>
  summary.firstGoodProbe ? seconds(summary.firstGoodProbe.afterFaultMs) : 'traffic did not come back'

const detectionOf = (summary: RunSummary): string | null =>
  summary.detection
    ? `${DETECTION_LABELS[summary.detection.event]} on ${summary.detection.router}, ${seconds(summary.detection.afterFaultMs)} after the fault`
    : null

/** Green or red only where there is a target to hold the outage against. */
const toneOf = (summary: RunSummary, targetMs: number | null): Pick<DebriefMeasure, 'tone'> => {
  if (targetMs === null) {
    return {}
  }
  return { tone: summary.firstGoodProbe !== null && summary.firstGoodProbe.afterFaultMs < targetMs ? 'good' : 'bad' }
}

/**
 * The numbers the debrief opens with: the outage before and after the player's change, what
 * noticed the fault each time, and the target. A run that was never recorded is left out, as is
 * a run with no fault in it and the target of a mission that has none.
 */
export function debriefMeasuresOf(
  baseline: RunSummary | null,
  repaired: RunSummary | null,
  targetMs: number | null
): readonly DebriefMeasure[] {
  const measures: DebriefMeasure[] = []
  if (baseline && baseline.faultAtMs !== null) {
    measures.push({ label: 'Outage before your change', value: outageOf(baseline), ...toneOf(baseline, targetMs) })
    const noticed = detectionOf(baseline)
    if (noticed !== null) {
      measures.push({ label: 'What noticed it then', value: noticed })
    }
  }
  if (repaired && repaired.faultAtMs !== null) {
    measures.push({ label: 'Outage after your change', value: outageOf(repaired), ...toneOf(repaired, targetMs) })
    const noticed = detectionOf(repaired)
    if (noticed !== null) {
      measures.push({ label: 'What noticed it now', value: noticed })
    }
    if (repaired.routeUpdate) {
      measures.push({ label: 'Traffic came back through', value: repaired.routeUpdate.route.interface })
    }
  }
  if (targetMs !== null) {
    measures.push({ label: 'Recovery target', value: `under ${seconds(targetMs)}` })
  }
  return measures
}

/** The verdict in one sentence, with the number it rests on when a run measured one. */
export function debriefVerdictOf(
  passed: boolean,
  repaired: RunSummary | null,
  targetMs: number | null
): { readonly passed: boolean; readonly text: string } {
  if (targetMs === null) {
    return { passed, text: passed ? 'Passed: every objective is met.' : 'Not passed yet: an objective is still open.' }
  }
  const target = seconds(targetMs)
  if (!passed) {
    return { passed, text: `Not passed yet: traffic has to be back in under ${target}.` }
  }
  return {
    passed,
    text: repaired?.firstGoodProbe
      ? `Passed: traffic was back in ${seconds(repaired.firstGoodProbe.afterFaultMs)}, inside the ${target} target.`
      : `Passed: traffic was back inside the ${target} target.`,
  }
}
