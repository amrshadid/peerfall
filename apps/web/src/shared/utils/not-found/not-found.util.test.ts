import { describe, expect, it } from 'vitest'
import { notFoundLine, savedThemeOf } from './not-found.util'

describe('savedThemeOf', () => {
  it('reads the theme the player chose', () => {
    expect(savedThemeOf(JSON.stringify({ state: { theme: 'dark' }, version: 1 }))).toBe('dark')
    expect(savedThemeOf(JSON.stringify({ state: { theme: 'light' }, version: 1 }))).toBe('light')
  })

  it('reads settings saved before version 1, without the state wrapper', () => {
    expect(savedThemeOf(JSON.stringify({ theme: 'dark' }))).toBe('dark')
  })

  it('leaves the system theme alone, and anything it cannot read', () => {
    expect(savedThemeOf(null)).toBeNull()
    expect(savedThemeOf(JSON.stringify({ state: { theme: 'system' } }))).toBeNull()
    expect(savedThemeOf('{"state":')).toBeNull()
    expect(savedThemeOf('null')).toBeNull()
    expect(savedThemeOf(JSON.stringify({ state: { theme: 'sepia' } }))).toBeNull()
  })
})

describe('notFoundLine', () => {
  it("prints the address as BusyBox ls would: the Machine's own words for a missing file", () => {
    expect(notFoundLine('/nope')).toBe('$ ls /nope\nls: /nope: No such file or directory')
  })

  it('shows an escaped address as it reads, and a malformed one as it was sent', () => {
    expect(notFoundLine('/old%20page')).toContain('ls: /old page: No such file or directory')
    expect(notFoundLine('/100%')).toContain('ls: /100%: No such file or directory')
  })
})
