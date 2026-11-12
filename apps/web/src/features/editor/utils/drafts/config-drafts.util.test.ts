import { describe, expect, it } from 'vitest'
import {
  applyStateOf,
  filesOf,
  modifiedPaths,
  pathOfRouter,
  routerOfPath,
  withApplied,
  withDraft,
  withRunning,
} from './config-drafts.util'

const ROUTERS = ['a', 'b', 'c']
const RUNNING = 'interface a-c\n ip ospf area 0\n'
const EDITED = `${RUNNING} ip ospf bfd\n`

describe('paths', () => {
  it('names each router’s tab after the router, and reads the router back from it', () => {
    expect(pathOfRouter('a')).toBe('a/frr.conf')
    expect(routerOfPath('b/frr.conf', ROUTERS)).toBe('b')
    expect(routerOfPath('z/frr.conf', ROUTERS)).toBeNull()
  })
})

describe('drafts', () => {
  it('opens a router on what it is running', () => {
    expect(withRunning({}, 'a', RUNNING)).toEqual({ a: { running: RUNNING, draft: RUNNING } })
  })

  it('keeps text the player has not applied when the router is read again', () => {
    const edited = withDraft(withRunning({}, 'a', RUNNING), 'a', EDITED)
    expect(withRunning(edited, 'a', 'changed elsewhere\n')).toEqual({
      a: { running: 'changed elsewhere\n', draft: EDITED },
    })
  })

  it('lets an untouched draft follow the router, as after Start over', () => {
    const untouched = withRunning({}, 'a', EDITED)
    expect(withRunning(untouched, 'a', RUNNING).a).toEqual({ running: RUNNING, draft: RUNNING })
  })

  it('has nothing pending after an Apply, so the router’s own wording replaces the text', () => {
    const applied = withApplied(withDraft(withRunning({}, 'a', RUNNING), 'a', EDITED), 'a')
    expect(modifiedPaths(ROUTERS, applied).size).toBe(0)
    const normalised = `${EDITED}!\n`
    expect(withRunning(applied, 'a', normalised).a?.draft).toBe(normalised)
  })

  it('ignores typing for a router that has not been read', () => {
    expect(withDraft({}, 'a', 'x')).toEqual({})
  })

  it('gives every router a tab and marks the ones with unapplied text', () => {
    const drafts = withDraft(withRunning(withRunning({}, 'a', RUNNING), 'b', 'b\n'), 'a', EDITED)
    expect(filesOf(ROUTERS, drafts)).toEqual([
      { path: 'a/frr.conf', content: EDITED },
      { path: 'b/frr.conf', content: 'b\n' },
      { path: 'c/frr.conf', content: '' },
    ])
    expect([...modifiedPaths(ROUTERS, drafts)]).toEqual(['a/frr.conf'])
  })
})

describe('applyStateOf', () => {
  const facts = { router: 'a', machineReason: null, waiting: null, applying: false }

  it('is ready when a router is selected and nothing is in the way', () => {
    expect(applyStateOf(facts)).toEqual({ kind: 'idle' })
  })

  it('waits for the Machine first, with the Machine’s reason', () => {
    expect(applyStateOf({ ...facts, machineReason: 'Booting Linux. Apply works once the network is up.' })).toEqual({
      kind: 'busy',
      label: 'Starting…',
      reason: 'Booting Linux. Apply works once the network is up.',
    })
  })

  it('shows itself working while the router loads the configuration', () => {
    expect(applyStateOf({ ...facts, applying: true })).toMatchObject({ kind: 'busy', working: true })
  })

  it('leaves the routers alone while a run is measured: its changes would not be kept', () => {
    expect(applyStateOf({ ...facts, waiting: 'A run is being measured.' })).toEqual({
      kind: 'busy',
      label: 'Apply',
      reason: 'A run is being measured. Apply works again when it is done.',
    })
  })

  it('asks for a router when none is selected', () => {
    expect(applyStateOf({ ...facts, router: null })).toMatchObject({
      kind: 'busy',
      reason: 'Select a router on the map first.',
    })
  })
})
