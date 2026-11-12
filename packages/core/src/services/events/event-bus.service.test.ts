import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetCoreConfig } from '#config'
import { EventBus, eventBus } from '#services/events/event-bus.service'
import { recordLogs } from '#test/index'

afterEach(resetCoreConfig)

describe('EventBus', () => {
  it('delivers the event to every listener of that type', () => {
    const bus = new EventBus()
    const first = vi.fn()
    const second = vi.fn()
    const other = vi.fn()

    bus.on('GAME_LEVEL_COMPLETED', first)
    bus.on('GAME_LEVEL_COMPLETED', second)
    bus.on('GAME_SAVED', other)
    bus.emit('GAME_LEVEL_COMPLETED', { levelId: '1' }, { source: 'game/level' })

    expect(first).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GAME_LEVEL_COMPLETED',
        payload: { levelId: '1' },
        metadata: expect.objectContaining({ source: 'game/level' }),
      })
    )
    expect(second).toHaveBeenCalledOnce()
    expect(other).not.toHaveBeenCalled()
  })

  it('matches wildcard patterns', () => {
    const bus = new EventBus()
    const game = vi.fn()
    const all = vi.fn()

    bus.on('GAME_*', game)
    bus.on('*', all)
    bus.emit('GAME_SAVED', null)
    bus.emit('LAB_COMMAND_FINISHED', null)

    expect(game).toHaveBeenCalledOnce()
    expect(all).toHaveBeenCalledTimes(2)
  })

  it('stops delivering after unsubscribe or off', () => {
    const bus = new EventBus()
    const listener = vi.fn()

    bus.on('X', listener).unsubscribe()
    bus.emit('X', 1)
    bus.on('Y', listener)
    bus.off('Y', listener)
    bus.emit('Y', 1)

    expect(listener).not.toHaveBeenCalled()
    expect(bus.getListenerCount()).toBe(0)
  })

  it('delivers a once listener a single time', () => {
    const bus = new EventBus()
    const listener = vi.fn()

    bus.once('X', listener)
    bus.emit('X', 1)
    bus.emit('X', 2)

    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps notifying the others when a listener throws', () => {
    const bus = new EventBus()
    const after = vi.fn()
    const { error } = recordLogs()

    bus.on('X', () => {
      throw new Error('boom')
    })
    bus.on('X', after)
    bus.emit('X', 1)

    expect(after).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalledWith('[EventBus] Error in listener for X: boom', expect.any(String))
  })

  it('reports a listener whose promise rejects instead of leaving it unhandled', async () => {
    const bus = new EventBus()
    const { error } = recordLogs()

    bus.on('X', async () => {
      throw new Error('late')
    })
    bus.emit('X', 1)
    await Promise.resolve()
    await Promise.resolve()

    expect(error).toHaveBeenCalledWith('[EventBus] Error in listener for X: late', expect.any(String))
  })

  it('treats only * as a wildcard in a pattern', () => {
    const bus = new EventBus()
    const dotted = vi.fn()

    bus.on('LAB.*', dotted)
    bus.emit('LABX_RUN', null)
    bus.emit('LAB.RUN', null)

    expect(dotted).toHaveBeenCalledOnce()
  })

  it('skips a middleware that throws and still delivers the event once', () => {
    const bus = new EventBus()
    const listener = vi.fn()
    const { error } = recordLogs()

    bus.use(() => {
      throw new Error('broken')
    })
    bus.use((_, next) => {
      next()
      throw new Error('after next')
    })
    bus.on('X', listener)
    bus.emit('X', 1)

    expect(listener).toHaveBeenCalledOnce()
    expect(error).toHaveBeenCalledTimes(2)
  })

  it('counts listeners per pattern and in total, and removes them all', () => {
    const bus = new EventBus()
    bus.on('A', vi.fn())
    bus.on('A', vi.fn())
    bus.on('B', vi.fn())

    expect(bus.getListenerCount('A')).toBe(2)
    expect(bus.getListenerCount()).toBe(3)
    bus.removeAllListeners()
    expect(bus.getListenerCount()).toBe(0)
  })

  it('keeps no history when it is turned off, and clears it on request', () => {
    const quiet = new EventBus({ enableHistory: false })
    quiet.emit('A', 1)
    expect(quiet.getHistory()).toEqual([])

    const bus = new EventBus()
    bus.emit('A', 1)
    bus.clearHistory()
    expect(bus.getHistory()).toEqual([])
  })

  it('warns about an event nobody listens to when asked', () => {
    const { warn } = recordLogs()
    new EventBus({ warnOnNoListeners: true }).emit('LONELY', null)
    expect(warn).toHaveBeenCalledWith('[EventBus] No listeners for event: LONELY')
  })

  it('runs middleware before listeners and can stop an event', () => {
    const bus = new EventBus()
    const listener = vi.fn()

    bus.use((event, next) => {
      if (event.type !== 'BLOCKED') next()
    })
    bus.on('*', listener)
    bus.emit('BLOCKED', 1)
    bus.emit('ALLOWED', 1)

    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps a bounded history and replays from it', () => {
    const bus = new EventBus({ maxHistorySize: 2 })
    const listener = vi.fn()

    bus.emit('A', 1)
    bus.emit('B', 2)
    bus.emit('C', 3)
    const history = bus.getHistory()
    expect(history.map((event) => event.type)).toEqual(['B', 'C'])

    bus.on('B', listener)
    bus.replay(history[0]?.id ?? '')
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ replayed: true }) })
    )
  })

  it('exports one shared bus for the app', () => {
    const listener = vi.fn()
    const subscription = eventBus.on('SHARED', listener)
    eventBus.emit('SHARED', true)
    subscription.unsubscribe()

    expect(listener).toHaveBeenCalledOnce()
  })
})
