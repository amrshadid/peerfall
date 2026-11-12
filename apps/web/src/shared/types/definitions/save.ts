/** `memory`: storage is unavailable, so progress lives only in this tab. */
export type SaveState = 'saved' | 'saving' | 'memory' | 'failed'

/** `full`: the browser refused a write; `unreadable`: a stored save kept untouched, this session isn't saved. */
export type StorageIssue = 'private' | 'full' | 'unreadable'
