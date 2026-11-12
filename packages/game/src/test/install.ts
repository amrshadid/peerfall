import type { StorageAdapter } from '@peerfall/core/types'
import { configureGame, resetGameConfig } from '#config'
import { cleanupGameListeners, setupGameListeners } from '#events/listeners'
import { settleSaves } from '#services/utils/save-queue.service'
import { useProgressStore } from '#store/progress.store'
import { exampleContent } from '#test/example-mission'
import { FakeClock } from '#test/fake-clock'
import { createMemoryStorage, type MemoryStorage } from '#test/memory-storage'
import type { GameConfig } from '#types/definitions/config'

export interface TestGameOptions<S extends StorageAdapter | null> {
  /** Storage to start from, e.g. to reopen a game saved by an earlier install; `null` for none at all. */
  readonly storage?: S
  readonly clock?: FakeClock
  /** Overrides for the game's options, including the content to play. */
  readonly options?: Partial<GameConfig>
}

export interface TestGame<S extends StorageAdapter | null> {
  readonly storage: S
  readonly clock: FakeClock
}

/**
 * Configures the game with in-memory storage, the example content and a fake
 * clock, sets up its listeners and empties the progress store: a fresh, closed game.
 */
export function installTestGame<S extends StorageAdapter | null = MemoryStorage>(
  options: TestGameOptions<S> = {}
): TestGame<S> {
  const storage = options.storage === undefined ? (createMemoryStorage() as StorageAdapter as S) : options.storage
  const clock = options.clock ?? new FakeClock()
  configureGame({ storage, content: exampleContent(), clock, ...options.options })
  setupGameListeners()
  useProgressStore.getState().reset()
  return { storage, clock }
}

/** Lets queued writes land, then stops the listeners and forgets the configuration. */
export async function uninstallTestGame(): Promise<void> {
  await settleSaves()
  cleanupGameListeners()
  resetGameConfig()
}
