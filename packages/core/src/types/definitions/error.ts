/** The codes every package's services share; a package may add its own beside them. */
export type ErrorCode =
  /** Called before the service was started or configured. */
  | 'NOT_READY'
  /** The service is doing something that must finish first. */
  | 'BUSY'
  /** Something the service needs failed to load or stopped (a worker, the compiler, storage). */
  | 'UNAVAILABLE'
  /** What was asked for doesn't exist (a level id). */
  | 'NOT_FOUND'
  /** It exists but isn't allowed yet (a locked level). */
  | 'FORBIDDEN'
  /** The input didn't pass validation; `details` lists every problem. */
  | 'VALIDATION_ERROR'
  /** Something was thrown that carried no code. */
  | 'UNKNOWN_ERROR'

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

/** What could be read from a thrown value. A package may use codes of its own, so `code` stays open. */
export interface ExtractedError {
  code: ErrorCode | (string & {})
  message: string
  details?: unknown
}

/** Gets what was extracted; returns a new code and/or message, or `undefined` to keep them. */
export type ErrorOverride = (extracted: ExtractedError) => Partial<Pick<ExtractedError, 'code' | 'message'>> | undefined

export interface HandleServiceErrorOptions {
  /** For plain `Error`s with no code: the package knows better what failed (a dead worker is `UNAVAILABLE`). */
  fallbackCode?: ErrorCode
  /** Rewrites the code or message after the fallback is applied. */
  override?: ErrorOverride
}
