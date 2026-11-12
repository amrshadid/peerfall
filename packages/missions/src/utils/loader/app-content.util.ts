import type { Validated } from '@peerfall/core/types'
import type { LoadedContent } from '#types/definitions/content'
import { CONTENT_FILES } from '#utils/loader/content-files.util'
import { loadContent } from '#utils/loader/load-content.util'

let loaded: Validated<LoadedContent> | null = null

/**
 * The game's content, checked once. Invalid content stops the game with a readable list of
 * problems, because playing a half-valid mission would teach something wrong.
 */
export function appContent(): Validated<LoadedContent> {
  loaded ??= loadContent(CONTENT_FILES)
  return loaded
}
