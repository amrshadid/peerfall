// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { CLARITY_DENIED, CLARITY_GRANTED, CLARITY_SCRIPT_ID } from './clarity.constants'
import { type ClarityWindow, isClarityLoaded, startClarity, stopClarity } from './clarity.util'

const tags = () => document.querySelectorAll(`script#${CLARITY_SCRIPT_ID}`)

afterEach(() => {
  for (const tag of tags()) {
    tag.remove()
  }
})

describe('startClarity', () => {
  it("adds Clarity's tag once and queues the analytics-only consent until it loads", () => {
    const win: ClarityWindow = {}
    expect(isClarityLoaded(document)).toBe(false)
    startClarity('abc123', win, document)
    expect(tags()).toHaveLength(1)
    const tag = tags()[0] as HTMLScriptElement
    expect(tag.src).toBe('https://www.clarity.ms/tag/abc123')
    expect(tag.async).toBe(true)
    expect(win.clarity?.q).toEqual([['consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' }]])
    startClarity('abc123', win, document)
    expect(tags()).toHaveLength(1)
  })

  it("calls the real API once Clarity's tag has replaced the queue", () => {
    const calls: unknown[][] = []
    const win: ClarityWindow = { clarity: (...args) => void calls.push(args) }
    startClarity('abc123', win, document)
    expect(calls).toEqual([['consentv2', CLARITY_GRANTED]])
  })
})

describe('stopClarity', () => {
  it('does nothing, and loads nothing, on a page that never had the tag', () => {
    const win: ClarityWindow = {}
    stopClarity(win, document)
    expect(isClarityLoaded(document)).toBe(false)
    expect(win.clarity).toBeUndefined()
  })

  it('withdraws consent and stops a running Clarity', () => {
    const win: ClarityWindow = {}
    startClarity('abc123', win, document)
    stopClarity(win, document)
    expect(win.clarity?.q?.slice(1)).toEqual([['consentv2', CLARITY_DENIED], ['stop']])
    expect(CLARITY_DENIED).toEqual({ ad_Storage: 'denied', analytics_Storage: 'denied' })
  })
})
