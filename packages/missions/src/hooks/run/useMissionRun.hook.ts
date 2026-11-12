import { createMissionActions, useRunComparison } from '@peerfall/game/hooks'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { useNetwork } from '@peerfall/machine/hooks'
import {
  readVmMachineState,
  restartVmFrr,
  restoreVmHealthy,
  saveVmHealthy,
  setVmFault,
  startVmProbe,
  stopVmProbe,
} from '@peerfall/machine/services'
import { selectEvents, useVmStore } from '@peerfall/machine/store'
import type { MachineState } from '@peerfall/machine/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  checkRun,
  faultRun,
  type MissionMachine,
  probeRun,
  START_SLOT,
  waitUntilSettled,
} from '#utils/run/mission-run.util'

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
  /** The player's work is being checked: FRR restarts where the mission says so, then the network is read. */
  | 'checking'
  | 'failed'

export interface UseMissionRunResult {
  readonly phase: MissionRunPhase
  /** Why the network could not be built or the run could not start. */
  readonly errors: readonly string[]
  /** The objectives as the latest probe, run or check left them; null before the first. */
  readonly verdict: MissionVerdict | null
  /**
   * Checks the player's work on a mission whose objectives read the network as it is (running
   * daemons, kernel routes, reachability, configuration): restarts FRR on the mission's
   * `restartOnCheck` routers, reads the Machine as root, judges, and records the attempt; the
   * first one that passes completes the mission. Nothing is undone afterwards. On a mission judged
   * only by its fault run it reports why in `errors` and changes nothing.
   */
  readonly checkWork: () => Promise<void>
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
  readState: readVmMachineState,
  restartFrr: restartVmFrr,
}

/** A mission on the Machine: builds its network, and runs its probe, its fault and its check when asked. */
export function useMissionRun(mission: MissionDefinition | null): UseMissionRunResult {
  const network = useNetwork(mission?.network ?? null, mission ? `${mission.id}@${mission.version}` : '')
  const { baseline } = useRunComparison()
  const [busy, setBusy] = useState<'settling' | 'probing' | 'faulted' | 'checking' | null>(null)
  const [settled, setSettled] = useState(false)
  const [errors, setErrors] = useState<readonly string[]>([])
  const [verdict, setVerdict] = useState<MissionVerdict | null>(null)
  const actions = useMemo(() => createMissionActions(), [])
  // A run that finishes after the player left the mission must not write into the next one.
  const current = useRef(mission)
  current.current = mission
  // The Machine as the last check read it: a probe or a fault run after it judges the objectives
  // that read the state as that check left them, instead of un-ticking them.
  const checked = useRef<MachineState | null>(null)

  useEffect(() => {
    checked.current = null
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
      const judged = actions.judge(outcome.events, checked.current)
      if (judged.success && judged.data) {
        setVerdict(judged.data)
      }
    } finally {
      setBusy(null)
    }
  }, [mission, busy, settled, actions])

  const checkWork = useCallback(async () => {
    if (!mission || busy !== null || !settled) {
      return
    }
    setBusy('checking')
    try {
      const outcome = await checkRun(machine, mission)
      if (current.current !== mission) {
        return
      }
      if (!outcome.ok) {
        setErrors(outcome.errors)
        return
      }
      setErrors([])
      checked.current = outcome.state
      const submitted = await actions.submitRun(outcome.events, outcome.state)
      if (submitted.success && submitted.data) {
        setVerdict(submitted.data)
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
      const judged = actions.judge(outcome.events, checked.current)
      if (!judged.success || !judged.data) {
        return
      }
      setVerdict(judged.data)
      // The first run that falls short is the "before": what the repaired run is compared with.
      if (!judged.data.passed && baseline === null) {
        await actions.saveBaseline(outcome.events)
      } else {
        await actions.submitRun(outcome.events, checked.current)
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
    checked.current = null
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
    checkWork,
    sendProbe,
    runFault,
    startOver,
  }
}
