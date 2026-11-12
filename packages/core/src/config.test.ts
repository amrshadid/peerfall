import { afterEach, describe, expect, it } from 'vitest'
import { configureCore, getCoreConfig, resetCoreConfig } from '#config'
import { eventBus } from '#services/events/event-bus.service'
import { recordLogs } from '#test/index'

afterEach(resetCoreConfig)

describe('configureCore', () => {
  it('logs events only while logEvents is on, and turning it off removes the logger', () => {
    const sink = recordLogs()
    configureCore({ logEvents: {}, logLevel: 'debug', logSink: sink })
    eventBus.emit('CORE_TEST', {})
    expect(sink.debug).toHaveBeenCalledTimes(1)

    configureCore({ logLevel: 'debug', logSink: sink })
    eventBus.emit('CORE_TEST', {})
    expect(sink.debug).toHaveBeenCalledTimes(1)
    expect(getCoreConfig().logEvents).toBe(false)
  })

  it('keeps tests silent by default', () => {
    expect(getCoreConfig().logLevel).toBe('silent')
  })
})
