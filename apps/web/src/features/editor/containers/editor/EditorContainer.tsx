import { CodeEditorPresentation } from '@features/editor/components/editor'
import {
  applyStateOf,
  type ConfigDrafts,
  filesOf,
  modifiedPaths,
  pathOfRouter,
  routerOfPath,
  withApplied,
  withDraft,
  withRunning,
} from '@features/editor/utils/drafts'
import { useActiveMission } from '@peerfall/game/hooks'
import { useMachineStatus, useRouterConfig, useRouterSelection } from '@peerfall/machine/hooks'
import { useMachineLock } from '@shared/hooks/machine'
import { useEffect, useMemo, useState } from 'react'

export interface EditorContainerProps {
  /** Why the routers must be left alone right now, e.g. "A run is being measured."; null when they can be changed. */
  waiting: string | null
}

const PICK_A_ROUTER =
  'Select a router on the map, or one of the tabs above, to see the configuration it is running. What you write here reaches the router when you press Apply.'

/**
 * The selected router's running configuration, to edit and apply. It is read from the router
 * when it is selected, after every Apply, and whenever the Machine comes back from a restore
 * (a finished run, Start over), so the editor never shows what a router no longer runs.
 */
export function EditorContainer({ waiting }: EditorContainerProps) {
  const { mission } = useActiveMission()
  const { router, select } = useRouterSelection()
  const { read, apply } = useRouterConfig()
  const machine = useMachineStatus()
  const lock = useMachineLock(machine)
  const [drafts, setDrafts] = useState<ConfigDrafts>({})
  // Goes up to read the selected router again.
  const [reads, setReads] = useState(0)
  const [applying, setApplying] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [errors, setErrors] = useState<readonly string[]>([])

  const routers = useMemo(() => mission?.network.routers.map((each) => each.name) ?? [], [mission])
  const ready = machine.phase === 'ready'

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reads` asks for the same router to be read again
  useEffect(() => {
    if (router === null || !ready) {
      return
    }
    let stale = false
    void read(router).then((running) => {
      if (stale) {
        return
      }
      if (running === null) {
        setStatus(`Router ${router} did not answer. Select it again to retry.`)
      } else {
        setDrafts((current) => withRunning(current, router, running))
      }
    })
    return () => {
      stale = true
    }
  }, [router, ready, reads, read])

  const state = applyStateOf({ router, machineReason: lock?.applyReason ?? null, waiting, applying })

  const onApply = async () => {
    const draft = router === null ? undefined : drafts[router]
    if (router === null || draft === undefined || state.kind !== 'idle') {
      return
    }
    setApplying(true)
    setErrors([])
    setStatus(null)
    const applied = await apply(router, draft.draft)
    setApplying(false)
    if (applied.ok) {
      setDrafts((current) => withApplied(current, router))
      setStatus(`Applied to router ${router}.`)
    } else {
      setErrors(applied.errors)
      setStatus(`Router ${router} refused part of it.`)
    }
    // Read back either way: the lines FRR accepted are running now, in its own wording.
    setReads((count) => count + 1)
  }

  const onReset = () => {
    setDrafts({})
    setErrors([])
    setStatus(null)
    setReads((count) => count + 1)
  }

  const reading = router !== null && drafts[router] === undefined
  return (
    <CodeEditorPresentation
      files={filesOf(routers, drafts)}
      activePath={router === null ? '' : pathOfRouter(router)}
      modified={modifiedPaths(routers, drafts)}
      apply={state}
      status={status}
      errors={errors}
      notice={router === null ? PICK_A_ROUTER : reading ? `Reading what router ${router} is running…` : null}
      onSelectFile={(path) => {
        const next = routerOfPath(path, routers)
        if (next !== null) {
          void select(next)
        }
      }}
      onChange={(path, content) => {
        const edited = routerOfPath(path, routers)
        if (edited !== null) {
          setDrafts((current) => withDraft(current, edited, content))
        }
      }}
      onApply={() => void onApply()}
      onReset={onReset}
    />
  )
}
