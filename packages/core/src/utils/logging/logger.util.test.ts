import { afterEach, describe, expect, it, vi } from 'vitest'
import { configureCore, resetCoreConfig } from '#config'
import { recordLogs } from '#test/index'
import { logger } from '#utils/logging/logger.util'

afterEach(() => {
  resetCoreConfig()
  vi.restoreAllMocks()
})

describe('logger', () => {
  it('writes nothing in tests unless a test opts in', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('quiet')
    expect(error).not.toHaveBeenCalled()
  })

  it('writes from the configured level up, with its details', () => {
    const sink = recordLogs('warn')

    logger.debug('d')
    logger.info('i')
    logger.warn('w', { n: 1 })
    logger.error('e', 'stack')

    expect(sink.debug).not.toHaveBeenCalled()
    expect(sink.info).not.toHaveBeenCalled()
    expect(sink.warn).toHaveBeenCalledWith('w', { n: 1 })
    expect(sink.error).toHaveBeenCalledWith('e', 'stack')
  })

  it('writes everything at debug, and nothing when silent', () => {
    const loud = recordLogs('debug')
    logger.debug('d')
    expect(loud.debug).toHaveBeenCalledWith('d')

    const quiet = recordLogs('silent')
    logger.error('e')
    expect(quiet.error).not.toHaveBeenCalled()
  })

  it('falls back to the console when no sink is given', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    configureCore({ logLevel: 'debug' })

    logger.debug('d', 1)
    logger.warn('w')

    expect(log).toHaveBeenCalledWith('d', 1)
    expect(warn).toHaveBeenCalledWith('w')
  })
})
