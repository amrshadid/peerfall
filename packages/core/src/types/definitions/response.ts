/**
 * What every package's `services/api` returns: expected failures are values,
 * never thrown. `error.code` is a string so a package can add codes beyond `ErrorCode`.
 */
export interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}
