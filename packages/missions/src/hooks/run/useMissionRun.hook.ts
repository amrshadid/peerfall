import { createMissionActions, useRunComparison } from '@peerfall/game/hooks'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { useNetwork } from '@peerfall/machine/hooks'
import { restoreVmHealthy, saveVmHealthy, setVmFault, startVmProbe, stopVmProbe } from '@peerfall/machine/services'
import { selectEvents, useVmStore } from '@peerfall/machine/store'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { faultRun, type MissionMachine, probeRun, START_SLOT, waitUntilSettled } from '#utils/run/mission-run.util'

/** Where a mission's run is. */
export type MissionRunPhase =
  /** The routers, links and FRR are being started on the Machine. */
  | 'building'
  /** The routers are finding each other: adjacencies and routes are forming. */
  | 'settling'
  /** The network is healthy and the player's to inspect and change. */
  | 'ready'
  /** A probe is being sent on the healthy network. */
  | 'probing'
  /** The link is broken and the run is being measured. */
  | 'faulted'
  | 'failed'

export interface UseMissionRunResult {
  readonly phase: MissionRunPhase
  /** Why the network could not be built or the run could not start. */
  readonly errors: readonly string[]
  /** The objectives as the latest probe or run left them; null before the first. */
  readonly verdict: MissionVerdict | null
  /** Sends the mission's probe for a few seconds on the network as it is. */
  readonly sendProbe: () => Promise<void>
  /**
   * Breaks the mission's link with a probe running, measures until traffic is back or nothing
   * will bring it back, then returns the network to how the player had configured it. The first
   * run that does not pass is kept as the baseline; the others are attempts.
   */
  readonly runFault: () => Promise<void>
  /** Back to the network as it was first built: every change the player made is undone. */
  readonly startOver: () => Promise<void>
}

const machine: MissionMachine = {
  events: () => selectEvents(useVmStore.getState()),
  setFault: setVmFault,
  startProbe: startVmProbe,
  stopProbe: stopVmProbe,
  saveHealthy: saveVmHealthy,
  restoreHealthy: restoreVmHealthy,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}

/** A mission on the Machine: builds its network, and runs its probe and its fault when asked. */
export function useMissionRun(mission: MissionDefinition | null): UseMissionRunResult {
  const network = useNetwork(mission?.network ?? null, mission ? `${mission.id}@${mission.version}` : '')
  const { baseline } = useRunComparison()
  const [busy, setBusy] = useState<'settling' | 'probing' | 'faulted' | null>(null)
  const [settled, setSettled] = useState(false)
  const [errors, setErrors] = useState<readonly string[]>([])
  const [verdict, setVerdict] = useState<MissionVerdict | null>(null)
  const actions = useMemo(() => createMissionActions(), [])
  // A run that finishes after the player left the mission must not write into the next one.
  const current = useRef(mission)
  current.current = mission

  useEffect(() => {
    if (network.phase !== 'ready' || !mission) {
      setSettled(false)
      return
    }
    let stale = false
    setBusy('settling')
    void waitUntilSettled(machine, mission)
      .then(async (ok) => {
        if (stale) {
          return
        }
        if (ok && (await saveVmHealthy(START_SLOT))) {
          setSettled(true)
        } else {
          setErrors(['The network did not settle. Start the mission again.'])
        }
      })
      .finally(() => {
        if (!stale) {
          setBusy(null)
        }
      })
    return () => {
      stale = true
    }
  }, [network.phase, mission])

  const sendProbe = useCallback(async () => {
    if (!mission || busy !== null || !settled) {
      return
    }
    setBusy('probing')
    try {
      const outcome = await probeRun(machine, mission)
      if (current.current !== mission) {
        return
      }
      if (!outcome.ok) {
        setErrors(outcome.errors)
        return
      }
      const judged = actions.judge(outcome.events)
      if (judged.success && judged.data) {
        setVerdict(judged.data)
      }
    } finally {
      setBusy(null)
    }
  }, [mission, busy, settled, actions])

  const runFault = useCallback(async () => {
    if (!mission || busy !== null || !settled) {
      return
    }
    setBusy('faulted')
    try {
      const outcome = await faultRun(machine, mission)
      if (current.current !== mission) {
        return
      }
      if (!outcome.ok) {
        setErrors(outcome.errors)
        return
      }
      const judged = actions.judge(outcome.events)
      if (!judged.success || !judged.data) {
        return
      }
      setVerdict(judged.data)
      // The first run that falls short is the "before": what the repaired run is compared with.
      if (!judged.data.passed && baseline === null) {
        await actions.saveBaseline(outcome.events)
      } else {
        await actions.submitRun(outcome.events)
      }
    } finally {
      setBusy(null)
    }
  }, [mission, busy, settled, actions, baseline])

  const startOver = useCallback(async () => {
    if (busy !== null || !settled) {
      return
    }
    setVerdict(null)
    setErrors([])
    await restoreVmHealthy(START_SLOT)
  }, [busy, settled])

  const phase: MissionRunPhase =
    network.phase === 'failed' || (errors.length > 0 && !settled)
      ? 'failed'
      : network.phase !== 'ready'
        ? 'building'
        : (busy ?? (settled ? 'ready' : 'settling'))

  return {
    phase,
    errors: network.phase === 'failed' ? network.errors : errors,
    verdict,
    sendProbe,
    runFault,
    startOver,
  }
}
