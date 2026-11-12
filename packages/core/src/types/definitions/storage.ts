/** Key-value storage the app injects (localStorage on the web), e.g. for save games. */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * Every localStorage key the game uses. The `v1` is the key format's version, so
 * a format change can read the old key and migrate it.
 */
export const STORAGE_KEYS = {
  SETTINGS: 'peerfall:v1:settings',
  PROFILE: 'peerfall:v1:profile',
  /** Written and removed at startup to learn whether storage works at all (a private window may refuse it). */
  STORAGE_PROBE: 'peerfall:v1:probe',
} as const
