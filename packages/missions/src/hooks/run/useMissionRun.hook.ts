import { createMissionActions, useRunComparison } from '@peerfall/game/hooks'
import type { MissionDefinition, MissionVerdict } from '@peerfall/game/types'
import { stateRequestOf } from '@peerfall/game/utils'
import { useCommandFinished, useNetwork } from '@peerfall/machine/hooks'
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
import type { MachineState, StampedMachineEvent } from '@peerfall/machine/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLiveJudge } from '#utils/run/live-judge.util'
import {
  checkRun,
  faultRun,
  liveRead,
  type MissionMachine,
  probeRun,
  routingChangeCount,
  START_SLOT,
  waitUntilSettled,
} from '#utils/run/mission-run.util'

/** Where a mission's run is. */
export type MissionRunPhase =
  /** The routers, links and FRR are being started on the Machine. */
  | 'building'
  /** The routers are finding each other: adjacencies and routes are forming. */
  | 'settling'
  /** The network is healthy and the player's to inspect and change; objectives tick as they are met. */
  | 'ready'
  /** A probe is being sent on the healthy network. */
  | 'probing'
  /** The link is broken and the run is being measured. */
  | 'faulted'
  /** `checkWork` is running: FRR restarts where the mission says so, then the network is read. */
  | 'checking'
  | 'failed'

export interface UseMissionRunResult {
  readonly phase: MissionRunPhase
  /** Why the network could not be built or the run could not start. */
  readonly errors: readonly string[]
  /**
   * The objectives so far, judged live: after every command the player finishes, once the
   * network has settled, and after each probe or fault run. An objective once met stays met until
   * Start over. Null before the first judging.
   */
  readonly verdict: MissionVerdict | null
  /**
   * Restarts FRR on the mission's `restartOnCheck` routers, reads the Machine and judges, as the
   * golden runs once did. The game needs no button for it: live judging reads the network after
   * every command and never restarts anything.
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
  /** Back to the network as it was first built: every change the player made is undone, and every objective unmet. */
  readonly startOver: () => Promise<void>
}

/** After a command finishes, FRR and the kernel have a moment to act on it before the network is read. */
const AFTER_COMMAND_MS = 400
/** A route that changed (an OSPF adjacency forming, zebra installing) is judged once routing is quiet this long. */
const AFTER_ROUTING_MS = 1500

const machine: MissionMachine = {
  events: () => selectEvents(useVmStore.getState()),
  setFault: setVmFault,
  startProbe: startVmProbe,
  stopProbe: stopVmProbe,
  saveHealthy: saveVmHealthy,
  restoreHealthy: async (slot) => {
    // The saved Machine's interfaces may differ from the last reading: the map waits for the next.
    useVmStore.getState().forgetInterfaces()
    return restoreVmHealthy(slot)
  },
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  readState: async (request) => {
    const ready = useVmStore.getState().network === 'ready'
    const read = await readVmMachineState(request)
    // The map shows a link as down from these, after every read; a read that a network build
    // overtook speaks of the network before it.
    if (read.ok && ready && useVmStore.getState().network === 'ready') {
      useVmStore.getState().recordInterfaces(read.value)
    }
    return read
  },
  restartFrr: restartVmFrr,
}

type Busy = 'settling' | 'probing' | 'faulted' | 'checking'

/**
 * A mission on the Machine: builds its network, judges the player's work live, and runs its probe
 * and its fault when asked.
 */
export function useMissionRun(mission: MissionDefinition | null): UseMissionRunResult {
  const network = useNetwork(mission?.network ?? null, mission ? `${mission.id}@${mission.version}` : '')
  const { baseline } = useRunComparison()
  const [busy, setBusyState] = useState<Busy | null>(null)
  const [settled, setSettledState] = useState(false)
  const [errors, setErrors] = useState<readonly string[]>([])
  const [verdict, setVerdictState] = useState<MissionVerdict | null>(null)
  const actions = useMemo(() => createMissionActions(), [])
  // Live judging runs outside React's renders, so it reads these instead of the state above.
  const busyNow = useRef<Busy | null>(null)
  const settledNow = useRef(false)
  const verdictNow = useRef<MissionVerdict | null>(null)
  const setBusy = useCallback((next: Busy | null) => {
    busyNow.current = next
    setBusyState(next)
  }, [])
  const setSettled = useCallback((next: boolean) => {
    settledNow.current = next
    setSettledState(next)
  }, [])
  const setVerdict = useCallback((next: MissionVerdict | null) => {
    verdictNow.current = next
    setVerdictState(next)
  }, [])
  // A run that finishes after the player left the mission must not write into the next one.
  const current = useRef(mission)
  current.current = mission
  // Bumped by everything that makes a judging in flight stale: another mission, Start over.
  const generation = useRef(0)
  // An attempt is a run the player made happen, as Kernelfall counts each run of the checker: each
  // fault run after the baseline, passed or not, and, when live judging finds every objective met,
  // that one pass per play-through (never every read after it).
  const submitted = useRef(false)
  // The Machine as it was last read: a probe or a fault run judges the objectives that read the
  // state as that read left them, instead of un-ticking them.
  const checked = useRef<MachineState | null>(null)

  /**
   * Judges what the Machine showed, objectives already met staying met, and records the attempt
   * (which completes the mission) the first time every objective is met.
   */
  const keep = useCallback(
    async (events: readonly StampedMachineEvent[], state: MachineState | null) => {
      const previous = verdictNow.current
      const judged = actions.judge(events, state, previous)
      if (!judged.success || !judged.data) {
        return
      }
      setVerdict(judged.data)
      if (judged.data.passed && !submitted.current) {
        submitted.current = true
        await actions.submitRun(events, state, previous)
      }
    },
    [actions, setVerdict]
  )

  const live = useMemo(
    () =>
      createLiveJudge(async () => {
        const judged = current.current
        if (!judged || !settledNow.current || busyNow.current !== null || stateRequestOf(judged) === null) {
          return
        }
        const at = generation.current
        const outcome = await liveRead(machine, judged)
        // A failed read (the Machine busy restoring, a router not answering) waits for the next command.
        if (!outcome.ok || at !== generation.current || current.current !== judged || busyNow.current !== null) {
          return
        }
        checked.current = outcome.state
        await keep(outcome.events, outcome.state)
      }),
    [keep]
  )

  useCommandFinished(() => live.request(AFTER_COMMAND_MS))

  // Routes that change after a command (OSPF finding a neighbor, zebra installing) tick objectives too.
  useEffect(() => {
    let seen = routingChangeCount(selectEvents(useVmStore.getState()))
    return useVmStore.subscribe((state) => {
      const changes = routingChangeCount(selectEvents(state))
      if (changes !== seen) {
        seen = changes
        live.request(AFTER_ROUTING_MS)
      }
    })
  }, [live])

  useEffect(() => {
    generation.current++
    submitted.current = false
    checked.current = null
    setVerdict(null)
    setErrors([])
    live.cancel()
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
          // The network as the mission gives it is judged too: the objectives start from what it shows.
          live.request(0)
        }
      })
    return () => {
      stale = true
      live.cancel()
    }
  }, [network.phase, mission, live, setBusy, setSettled, setVerdict])

  const sendProbe = useCallback(async () => {
    if (!mission || busyNow.current !== null || !settled) {
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
      await keep(outcome.events, checked.current)
    } finally {
      setBusy(null)
    }
  }, [mission, settled, keep, setBusy])

  const checkWork = useCallback(async () => {
    if (!mission || busyNow.current !== null || !settled) {
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
      await keep(outcome.events, outcome.state)
    } finally {
      setBusy(null)
    }
  }, [mission, settled, keep, setBusy])

  const runFault = useCallback(async () => {
    if (!mission || busyNow.current !== null || !settled) {
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
      const previous = verdictNow.current
      // This run by itself: whether it is the baseline does not depend on the runs before it.
      const alone = actions.judge(outcome.events, checked.current)
      const merged = actions.judge(outcome.events, checked.current, previous)
      if (!alone.success || !alone.data || !merged.success || !merged.data) {
        return
      }
      setVerdict(merged.data)
      // The first run that falls short is the "before": what the repaired run is compared with.
      // Each fault run is a player's action, so each one is kept, as before live judging.
      if (!alone.data.passed && baseline === null) {
        await actions.saveBaseline(outcome.events)
      } else {
        // A pass recorded here is this play-through's pass: live judging must not record it again.
        if (merged.data.passed) {
          submitted.current = true
        }
        await actions.submitRun(outcome.events, checked.current, previous)
      }
    } finally {
      setBusy(null)
      live.request(AFTER_COMMAND_MS)
    }
  }, [mission, settled, actions, baseline, live, setBusy, setVerdict])

  const startOver = useCallback(async () => {
    if (busyNow.current !== null || !settled) {
      return
    }
    generation.current++
    live.cancel()
    submitted.current = false
    setVerdict(null)
    setErrors([])
    checked.current = null
    await machine.restoreHealthy(START_SLOT)
    live.request(0)
  }, [settled, live, setVerdict])

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
