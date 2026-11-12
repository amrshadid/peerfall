import { TimelinePresentation } from '@features/timeline/components/timeline'
import {
  LIVE_RUN_LABEL,
  liveRunOf,
  RUN_LABELS,
  type RunSetting,
  timelineLanesOf,
  timelineRunOfSummary,
} from '@features/timeline/utils/runs'
import { useActiveMission, useRunComparison } from '@peerfall/game/hooks'
import { useMachineEvents } from '@peerfall/machine/hooks'
import { useMemo } from 'react'

const MS_PER_SECOND = 1000

/**
 * The outage, measured: the saved baseline beside the saved repaired run on one axis, and the
 * run in progress drawn live from the Machine's events until it is saved.
 */
export function TimelineContainer() {
  const { mission } = useActiveMission()
  const { baseline, repaired } = useRunComparison()
  const events = useMachineEvents()

  // A mission that breaks nothing, or watches no traffic, has no outage to time.
  const setting = useMemo<RunSetting | null>(
    () =>
      mission?.fault && mission.probe
        ? { faultLink: mission.fault.link, from: mission.probe.from, destination: mission.probe.destination }
        : null,
    [mission]
  )
  const lanes = useMemo(() => {
    if (!setting) {
      return { baseline: null, repaired: null }
    }
    return timelineLanesOf(
      baseline ? timelineRunOfSummary(RUN_LABELS.baseline, baseline.summary, setting) : null,
      repaired ? timelineRunOfSummary(RUN_LABELS.repaired, repaired.summary, setting) : null,
      liveRunOf(LIVE_RUN_LABEL, events, setting)
    )
  }, [setting, baseline, repaired, events])

  if (!mission) {
    return null
  }
  return (
    <TimelinePresentation
      baseline={lanes.baseline}
      repaired={lanes.repaired}
      targetSeconds={mission.recoveryTargetMs === undefined ? null : mission.recoveryTargetMs / MS_PER_SECOND}
    />
  )
}
