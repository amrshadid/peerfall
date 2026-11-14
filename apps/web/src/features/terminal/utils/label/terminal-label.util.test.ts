import { describe, expect, it } from 'vitest'
import { terminalLabelOf } from './terminal-label.util'

describe('terminalLabelOf', () => {
  it('names the router the terminal is in', () => {
    expect(terminalLabelOf({ router: 'b', firstRouter: 'a', routersBuilt: true })).toBe('router b')
  })

  it('says where the terminal is going while it moves into the first router', () => {
    expect(terminalLabelOf({ router: null, firstRouter: 'a', routersBuilt: true })).toBe('going into router a…')
  })

  it("asks for a router only when the terminal is in the Machine's shell and going nowhere", () => {
    expect(terminalLabelOf({ router: null, firstRouter: 'a', routersBuilt: false })).toBe(
      'the Machine: select a router on the map'
    )
    expect(terminalLabelOf({ router: null, firstRouter: null, routersBuilt: true })).toBe(
      'the Machine: select a router on the map'
    )
  })
})
