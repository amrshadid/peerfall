import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetCoreConfig } from '#config'
import { createLoggingMiddleware } from '#services/events/event-logging.service'
import { recordLogs } from '#test/index'
import type { Event } from '#types/definitions/event'

const event = (type: string, metadata: Partial<Event['metadata']> = {}): Event => ({
  id: 'event-1',
  type,
  payload: { levelId: '1.4' },
  metadata: { timestamp: 0, ...metadata },
})

afterEach(resetCoreConfig)

describe('createLoggingMiddleware', () => {
  it('always passes the event on, logged or not', () => {
    recordLogs()
    const next = vi.fn()
    createLoggingMiddleware()(event('GAME_SAVED'), next)
    createLoggingMiddleware({ enabled: true })(event('GAME_SAVED'), next)
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('stays silent until enabled', () => {
    const sink = recordLogs()
    createLoggingMiddleware()(event('GAME_SAVED'), vi.fn())
    expect(sink.debug).not.toHaveBeenCalled()
  })

  it('logs the payload, and the metadata besides the timestamp', () => {
    const sink = recordLogs()
    createLoggingMiddleware({ enabled: true })(event('GAME_SAVED', { source: 'game/save' }), vi.fn())
    expect(sink.debug).toHaveBeenCalledWith(expect.stringMatching(/^\[Event\] GAME_SAVED @ /), {
      payload: { levelId: '1.4' },
      metadata: { source: 'game/save' },
    })
  })

  it('leaves out metadata that holds only the timestamp', () => {
    const sink = recordLogs()
    createLoggingMiddleware({ enabled: true })(event('GAME_SAVED'), vi.fn())
    expect(sink.debug).toHaveBeenCalledWith(expect.any(String), { payload: { levelId: '1.4' } })
  })

  it('logs the whole event when verbose', () => {
    const sink = recordLogs()
    const emitted = event('GAME_SAVED')
    createLoggingMiddleware({ enabled: true, verbose: true })(emitted, vi.fn())
    expect(sink.debug).toHaveBeenCalledWith(expect.any(String), { event: emitted })
  })

  it('logs only what the filter lets through', () => {
    const sink = recordLogs()
    const byRegex = createLoggingMiddleware({ enabled: true, filter: /^LAB_/ })
    const byPredicate = createLoggingMiddleware({ enabled: true, filter: (e) => e.type.endsWith('_FINISHED') })
    byRegex(event('GAME_SAVED'), vi.fn())
    byPredicate(event('GAME_SAVED'), vi.fn())
    expect(sink.debug).not.toHaveBeenCalled()
    byRegex(event('LAB_COMMAND_FINISHED'), vi.fn())
    byPredicate(event('LAB_COMMAND_FINISHED'), vi.fn())
    expect(sink.debug).toHaveBeenCalledTimes(2)
  })
})
