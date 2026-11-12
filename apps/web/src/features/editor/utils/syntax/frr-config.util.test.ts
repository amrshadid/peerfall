import { describe, expect, it } from 'vitest'
import { tokenizeFrrLine } from './frr-config.util'

/** Each highlighted piece with its kind; plain text is left out. */
const marked = (line: string) =>
  tokenizeFrrLine(line)
    .filter((token) => token.kind !== null)
    .map((token) => [line.slice(token.from, token.to), token.kind])

describe('tokenizeFrrLine', () => {
  it('reads a line that starts with ! or # as a comment, indented or not', () => {
    expect(marked('!')).toEqual([['!', 'comment']])
    expect(marked(' ! bfd on both ends')).toEqual([['! bfd on both ends', 'comment']])
    expect(marked('# note')).toEqual([['# note', 'comment']])
  })

  it('marks the word that names the command, not the words after it', () => {
    expect(marked('router ospf')).toEqual([['router', 'keyword']])
    expect(marked(' ip ospf bfd')).toEqual([['ip', 'keyword']])
    expect(marked('interface a-c')).toEqual([['interface', 'keyword']])
  })

  it('marks no and the command it negates', () => {
    expect(marked(' no ip ospf bfd')).toEqual([
      ['no', 'keyword'],
      ['ip', 'keyword'],
    ])
  })

  it('marks addresses, prefixes and plain numbers', () => {
    expect(marked(' ospf router-id 10.255.0.1')).toEqual([
      ['ospf', 'keyword'],
      ['10.255.0.1', 'number'],
    ])
    expect(marked(' ip address 10.0.2.1/30')).toEqual([
      ['ip', 'keyword'],
      ['10.0.2.1/30', 'number'],
    ])
    expect(marked(' ip ospf cost 10')).toEqual([
      ['ip', 'keyword'],
      ['10', 'number'],
    ])
  })

  it('leaves an interface name with a digit in it whole and plain', () => {
    expect(marked('interface eth0')).toEqual([['interface', 'keyword']])
    expect(marked(' neighbor 2001:db8::1 remote-as 65001')).toEqual([
      ['neighbor', 'keyword'],
      ['65001', 'number'],
    ])
  })

  it('covers every character of the line exactly once', () => {
    const line = ' ip ospf dead-interval 40 ! not a comment here'
    const tokens = tokenizeFrrLine(line)
    expect(tokens.map((token) => line.slice(token.from, token.to)).join('')).toBe(line)
    expect(marked(line).some(([, kind]) => kind === 'comment')).toBe(false)
  })
})
