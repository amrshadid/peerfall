// Each package wraps these in its own error-handling service.

import type { ErrorCode, ExtractedError, HandleServiceErrorOptions } from '#types/definitions/error'
import type { ServiceResponse } from '#types/definitions/response'

const UNKNOWN_ERROR_CODE: ErrorCode = 'UNKNOWN_ERROR'
const UNKNOWN_ERROR_MESSAGE = 'An unexpected error occurred'

type CodedError = { code?: unknown; message?: unknown; details?: unknown }

const codeOf = (coded: CodedError): string => (typeof coded.code === 'string' ? coded.code : UNKNOWN_ERROR_CODE)

/** What a thrown value says about itself: its code, message and details, whatever was thrown. */
export function extractError(error: unknown): ExtractedError {
  if (error instanceof Error) {
    const coded = error as Error & CodedError
    return { code: codeOf(coded), message: error.message || UNKNOWN_ERROR_MESSAGE, details: coded.details }
  }
  if (error !== null && typeof error === 'object') {
    const coded = error as CodedError
    return {
      code: codeOf(coded),
      message: typeof coded.message === 'string' ? coded.message : UNKNOWN_ERROR_MESSAGE,
      details: coded.details ?? error,
    }
  }
  return { code: UNKNOWN_ERROR_CODE, message: UNKNOWN_ERROR_MESSAGE, details: error }
}

/** Wraps any thrown value in a failed `ServiceResponse`. Never throws. */
export function handleServiceError(error: unknown, options: HandleServiceErrorOptions = {}): ServiceResponse<never> {
  const extracted = extractError(error)
  const code =
    options.fallbackCode !== undefined && extracted.code === UNKNOWN_ERROR_CODE ? options.fallbackCode : extracted.code
  const overridden = options.override?.({ ...extracted, code })
  return {
    success: false,
    error: {
      code: overridden?.code ?? code,
      message: overridden?.message ?? extracted.message,
      details: extracted.details,
    },
  }
}

/** An expected failure as a value, for a service that knows what went wrong without anything being thrown. */
export function errorResponse(code: ErrorCode, message: string, details?: unknown): ServiceResponse<never> {
  return { success: false, error: { code, message, details } }
}
