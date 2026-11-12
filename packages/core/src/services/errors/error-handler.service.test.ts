import { describe, expect, it } from 'vitest'
import { errorResponse, extractError, handleServiceError } from '#services/errors/error-handler.service'

describe('extractError', () => {
  it('reads an Error, keeping a code it carries', () => {
    const coded = Object.assign(new Error('gone'), { code: 'UNAVAILABLE', details: { pid: 1 } })
    expect(extractError(coded)).toEqual({ code: 'UNAVAILABLE', message: 'gone', details: { pid: 1 } })
    expect(extractError(new Error(''))).toMatchObject({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    })
  })

  it('reads an AppError-like object and keeps the object as details when it has none', () => {
    const thrown = { code: 'NOT_FOUND', message: 'unknown level "x"' }
    expect(extractError(thrown)).toEqual({ ...thrown, details: thrown })
  })

  it('keeps any other value as details', () => {
    expect(extractError('boom')).toEqual({
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      details: 'boom',
    })
  })
})

describe('handleServiceError', () => {
  it('turns a thrown Error into a failed response', () => {
    expect(handleServiceError(new Error('worker gone'))).toEqual({
      success: false,
      error: { code: 'UNKNOWN_ERROR', message: 'worker gone', details: undefined },
    })
  })

  it('uses the fallback code only when the thrown value has none', () => {
    expect(handleServiceError(new Error('x'), { fallbackCode: 'UNAVAILABLE' }).error?.code).toBe('UNAVAILABLE')
    expect(handleServiceError({ code: 'BUSY', message: 'x' }, { fallbackCode: 'UNAVAILABLE' }).error?.code).toBe('BUSY')
  })

  it('lets the package override the code and message after the fallback', () => {
    const response = handleServiceError(new Error('x'), {
      fallbackCode: 'UNAVAILABLE',
      override: (extracted) => ({
        code: extracted.code === 'UNAVAILABLE' ? 'NOT_READY' : 'BUSY',
        message: 'no compiler',
      }),
    })
    expect(response.error).toMatchObject({ code: 'NOT_READY', message: 'no compiler' })
  })
})

describe('errorResponse', () => {
  it('builds a failed response without anything being thrown', () => {
    expect(errorResponse('VALIDATION_ERROR', 'bad save', ['a'])).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'bad save', details: ['a'] },
    })
  })
})
