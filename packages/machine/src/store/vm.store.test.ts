import { beforeEach, describe, expect, it } from 'vitest'
import { useVmStore } from '#store/vm.store'

const DARK = [
  { name: 'lo', carrier: true },
  { name: 'a-c', carrier: false },
]
const LIT = [
  { name: 'lo', carrier: true },
  { name: 'a-c', carrier: true },
]

describe('the interfaces the Machine last showed', () => {
  beforeEach(() => useVmStore.getState().reset())

  it('keeps each router’s latest reading, and the routers a read left out', () => {
    const store = useVmStore.getState()
    store.recordInterfaces({ routers: { a: { links: DARK }, c: { links: [] } }, pings: [] })
    store.recordInterfaces({ routers: { a: { links: LIT }, b: { daemons: [] } }, pings: [] })
    expect(useVmStore.getState().interfaces).toEqual({ a: LIT, c: [] })
  })

  it('forgets them when a network is built or the Machine is restored', () => {
    const store = useVmStore.getState()
    store.recordInterfaces({ routers: { a: { links: DARK } }, pings: [] })
    store.setNetwork('ready')
    expect(useVmStore.getState().interfaces).toEqual({ a: DARK })
    store.setNetwork('building')
    expect(useVmStore.getState().interfaces).toEqual({})
    store.recordInterfaces({ routers: { a: { links: DARK } }, pings: [] })
    store.forgetInterfaces()
    expect(useVmStore.getState().interfaces).toEqual({})
  })
})

describe('the commands the player finished', () => {
  beforeEach(() => useVmStore.getState().reset())

  it('keeps the command lines the latest count added, and never takes the count back', () => {
    const store = useVmStore.getState()
    store.applyShell({ router: 'a', commandsFinished: 2, lines: ['a:~# vtysh', 'a# configure terminal'] })
    expect(useVmStore.getState()).toMatchObject({
      commandsFinished: 2,
      finishedLines: ['a:~# vtysh', 'a# configure terminal'],
    })
    // A move to another router reports no new command.
    store.applyShell({ router: 'b', commandsFinished: 2 })
    store.applyShell({ router: 'b', commandsFinished: 1, lines: ['stale'] })
    expect(useVmStore.getState()).toMatchObject({
      router: 'b',
      commandsFinished: 2,
      finishedLines: ['a:~# vtysh', 'a# configure terminal'],
    })
  })
})
