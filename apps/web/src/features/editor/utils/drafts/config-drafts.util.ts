import type { ApplyState, EditorFile } from '@features/editor/types'

/** One router's configuration in the editor: what the router runs, and what the player has written. */
export interface ConfigDraft {
  /** The running configuration as the router last gave it. */
  readonly running: string
  readonly draft: string
}

export type ConfigDrafts = Readonly<Record<string, ConfigDraft>>

const FILE = 'frr.conf'

export const pathOfRouter = (router: string): string => `${router}/${FILE}`

/** The router a tab stands for; null for a path that is no router's. */
export function routerOfPath(path: string, routers: readonly string[]): string | null {
  return routers.find((router) => pathOfRouter(router) === path) ?? null
}

export const isEdited = (draft: ConfigDraft | undefined): boolean =>
  draft !== undefined && draft.draft !== draft.running

/**
 * Takes a router's running configuration as it was just read. Text the player has not applied
 * yet is kept; an untouched draft follows the router.
 */
export function withRunning(drafts: ConfigDrafts, router: string, running: string): ConfigDrafts {
  const current = drafts[router]
  return { ...drafts, [router]: { running, draft: current && isEdited(current) ? current.draft : running } }
}

export function withDraft(drafts: ConfigDrafts, router: string, text: string): ConfigDrafts {
  const current = drafts[router]
  return current ? { ...drafts, [router]: { ...current, draft: text } } : drafts
}

/** After the router took the text: nothing is pending, so the next read replaces it with the router's own wording. */
export function withApplied(drafts: ConfigDrafts, router: string): ConfigDrafts {
  const current = drafts[router]
  return current ? { ...drafts, [router]: { running: current.draft, draft: current.draft } } : drafts
}

/** One tab per router, in the network's order. A router not read yet has an empty tab. */
export function filesOf(routers: readonly string[], drafts: ConfigDrafts): readonly EditorFile[] {
  return routers.map((router) => ({ path: pathOfRouter(router), content: drafts[router]?.draft ?? '' }))
}

export function modifiedPaths(routers: readonly string[], drafts: ConfigDrafts): ReadonlySet<string> {
  return new Set(routers.filter((router) => isEdited(drafts[router])).map(pathOfRouter))
}

export interface ApplyFacts {
  readonly router: string | null
  /** Why the Machine can't take a command yet; null once its shell is up. */
  readonly machineReason: string | null
  /** Why the routers must be left alone right now, e.g. a run is being measured; null when they needn't. */
  readonly waiting: string | null
  readonly applying: boolean
}

/** Whether Apply can be pressed, and the reason when it can't. */
export function applyStateOf({ router, machineReason, waiting, applying }: ApplyFacts): ApplyState {
  if (machineReason !== null) {
    return { kind: 'busy', label: 'Starting…', reason: machineReason }
  }
  if (applying) {
    return { kind: 'busy', label: 'Applying…', reason: 'The router is loading the configuration.', working: true }
  }
  if (waiting !== null) {
    return { kind: 'busy', label: 'Apply', reason: `${waiting} Apply works again when it is done.` }
  }
  if (router === null) {
    return { kind: 'busy', label: 'Apply', reason: 'Select a router on the map first.' }
  }
  return { kind: 'idle' }
}
