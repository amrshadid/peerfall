import { describe, expect, it } from 'vitest'
import { clearsTerminal, vmStatusLine } from './vm-status.util'

describe('vmStatusLine', () => {
  it('says what the Machine is doing while it starts, dimmed, and nothing once the shell is up', () => {
    expect(vmStatusLine('booting', null)).toBe('\x1b[2mBooting Linux…\x1b[0m\r\n')
    expect(vmStatusLine('setting-up', null)).toContain('starting FRR on each router')
    expect(vmStatusLine('ready', null)).toBeNull()
    expect(vmStatusLine('restoring', null)).toBeNull()
  })

  it('gives the reason a start failed', () => {
    expect(vmStatusLine('failed', 'No Linux image at /vm/')).toContain('could not start: No Linux image at /vm/')
  })
})

describe('clearsTerminal', () => {
  it('clears when a running Machine goes back to a saved network or builds a new one', () => {
    expect(clearsTerminal('ready', 'restoring')).toBe(true)
    expect(clearsTerminal('ready', 'setting-up')).toBe(true)
  })

  it('keeps the start-up lines: the first boot, a restore of the saved boot, and a failure', () => {
    expect(clearsTerminal(null, 'restoring')).toBe(false)
    expect(clearsTerminal('loading', 'booting')).toBe(false)
    expect(clearsTerminal('booting', 'ready')).toBe(false)
    expect(clearsTerminal('setting-up', 'ready')).toBe(false)
    expect(clearsTerminal('ready', 'failed')).toBe(false)
  })
})
