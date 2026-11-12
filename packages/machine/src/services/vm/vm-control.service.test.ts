import { describe, expect, it } from 'vitest'
import { CONTROL_LOST, createVmControl } from '#services/vm/vm-control.service'
import { VM_CONTROL_DONE } from '#types/definitions/vm'

/** A guest that answers each line after a tick, with what its command printed first. */
function guest(statusOf: (line: string) => number) {
  const sent: string[] = []
  const control = createVmControl((bytes) => {
    const line = new TextDecoder().decode(bytes).trimEnd()
    sent.push(line)
    setTimeout(() => {
      for (const byte of new TextEncoder().encode(`some output\r\n${VM_CONTROL_DONE} ${statusOf(line)}\r\n`)) {
        control.push(byte)
      }
    })
  })
  return { control, sent }
}

describe('the root control channel', () => {
  it('answers each line with its exit status, past whatever the command printed', async () => {
    const { control, sent } = guest((line) => (line === 'false' ? 1 : 0))
    expect(await control.run('ip netns add a')).toBe(0)
    expect(await control.run('false')).toBe(1)
    expect(sent).toEqual(['ip netns add a', 'false'])
  })

  it('captures what a line printed before its status', async () => {
    const { control } = guest(() => 0)
    expect(await control.capture('ip netns list')).toEqual({ status: 0, output: 'some output\r\n' })
  })

  it('gives up on a line a restore wiped, or one that never answers, and goes on with the next', async () => {
    const sent: string[] = []
    const control = createVmControl((bytes) => sent.push(new TextDecoder().decode(bytes).trimEnd()), 20)
    const wiped = control.run('tc -n a qdisc del dev a-c root')
    await Promise.resolve()
    control.drop()
    expect(await wiped).toBe(CONTROL_LOST)
    expect(await control.run('silence')).toBe(CONTROL_LOST)
    expect(sent).toEqual(['tc -n a qdisc del dev a-c root', 'silence'])
  })

  it('sends the next line only once the previous one has finished', async () => {
    const { control, sent } = guest(() => 0)
    const first = control.run('ip netns add a')
    const second = control.run('ip netns add b')
    await Promise.resolve()
    expect(sent).toEqual(['ip netns add a'])
    await first
    await second
    expect(sent).toEqual(['ip netns add a', 'ip netns add b'])
  })

  it('ignores bytes that arrive when no line is waiting', async () => {
    const { control } = guest(() => 0)
    for (const byte of new TextEncoder().encode(`${VM_CONTROL_DONE} 7\r\n`)) {
      control.push(byte)
    }
    expect(await control.run('true')).toBe(0)
  })
})
