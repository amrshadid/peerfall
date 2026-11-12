import { describe, expect, it } from 'vitest'
import { configChanges, configEntries, configErrors, runningConfigText } from '#utils/config/config-diff.util'

// `show running-config` on router a of the triangle, copied from the Machine (FRR 10.6.1).
const RUNNING = `Building configuration...

Current configuration:
!
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
interface a-b
 ip ospf area 0
 ip ospf cost 10
 ip ospf network point-to-point
exit
!
interface a-c
 ip ospf area 0
 ip ospf cost 10
 ip ospf network point-to-point
exit
!
interface lo
 ip ospf area 0
 ip ospf passive
exit
!
router ospf
 ospf router-id 10.255.0.1
 log-adjacency-changes detail
exit
!
end
`

const text = runningConfigText(RUNNING)

describe('a router’s configuration as text', () => {
  it('is the running configuration without vtysh’s words around it', () => {
    expect(text.startsWith('frr version 10.6.1\n')).toBe(true)
    expect(text.endsWith('router ospf\n ospf router-id 10.255.0.1\n log-adjacency-changes detail\nexit\n!\n')).toBe(
      true
    )
    expect(text).not.toContain('Building configuration')
    expect(text).not.toMatch(/\nend\n?$/)
  })

  it('reads each line with the block it sits in, and leaves the Machine’s own lines out', () => {
    const entries = configEntries(text)
    expect(entries).toContainEqual({ context: [], line: 'interface a-c' })
    expect(entries).toContainEqual({ context: ['interface a-c'], line: 'ip ospf cost 10' })
    expect(entries).toContainEqual({ context: ['router ospf'], line: 'log-adjacency-changes detail' })
    expect(entries.some(({ line }) => /^(hostname|log |frr )/.test(line))).toBe(false)
  })

  it('reads nested blocks', () => {
    expect(
      configEntries(
        'router bgp 65001\n neighbor 10.0.0.2 remote-as 65002\n address-family ipv4 unicast\n  network 10.1.0.0/24\n exit-address-family\nexit\n'
      )
    ).toEqual([
      { context: [], line: 'router bgp 65001' },
      { context: ['router bgp 65001'], line: 'neighbor 10.0.0.2 remote-as 65002' },
      { context: ['router bgp 65001'], line: 'address-family ipv4 unicast' },
      { context: ['router bgp 65001', 'address-family ipv4 unicast'], line: 'network 10.1.0.0/24' },
    ])
  })
})

describe('the commands that change a configuration', () => {
  it('are none when nothing changed, whatever the order and spacing', () => {
    expect(configChanges(text, text)).toEqual([])
    expect(
      configChanges(text, text.replace(' ip ospf area 0\n ip ospf cost 10\n', ' ip ospf cost 10\n ip ospf area 0\n'))
    ).toEqual([])
  })

  it('enter a new line in its block', () => {
    const wanted = text.replace('interface a-c\n', 'interface a-c\n ip ospf bfd\n')
    expect(configChanges(text, wanted)).toEqual([['interface a-c', 'ip ospf bfd']])
  })

  it('negate a line that is gone, in its block', () => {
    const current = text.replace('interface a-c\n', 'interface a-c\n ip ospf bfd\n')
    expect(configChanges(current, text)).toEqual([['interface a-c', 'no ip ospf bfd']])
  })

  it('replace a changed line: the old one out, the new one in', () => {
    const wanted = text.replace(
      'interface a-b\n ip ospf area 0\n ip ospf cost 10',
      'interface a-b\n ip ospf area 0\n ip ospf cost 50'
    )
    expect(configChanges(text, wanted)).toEqual([['interface a-b', 'no ip ospf cost 10', 'ip ospf cost 50']])
  })

  it('negate a whole block once, not each of its lines', () => {
    const wanted = text.replace('router ospf\n ospf router-id 10.255.0.1\n log-adjacency-changes detail\nexit\n!\n', '')
    expect(configChanges(text, wanted)).toEqual([['no router ospf']])
  })

  it('open a new block and fill it', () => {
    const wanted = `${text}ip route 10.9.0.0/24 10.0.1.2\nrouter bgp 65001\n neighbor 10.0.1.2 remote-as 65002\nexit\n`
    expect(configChanges(text, wanted)).toEqual([
      ['ip route 10.9.0.0/24 10.0.1.2', 'router bgp 65001'],
      ['router bgp 65001', 'neighbor 10.0.1.2 remote-as 65002'],
    ])
  })

  it('never touch the Machine’s own lines, even when the player deletes them', () => {
    expect(configChanges(text, text.replace('hostname a\n', '').replace('log file /var/log/frr/a.log\n', ''))).toEqual(
      []
    )
  })

  it('turn a removed `no` line back into the line', () => {
    expect(configChanges('no ip forwarding\n', '')).toEqual([['ip forwarding']])
  })
})

describe('FRR’s complaints', () => {
  it('are the lines vtysh starts with a percent sign, each once', () => {
    expect(
      configErrors(
        '% Unknown command: ip ospf bdf\r\nsomething else\r\n% Unknown command: ip ospf bdf\r\n% Area does not exist\r\n'
      )
    ).toEqual(['% Unknown command: ip ospf bdf', '% Area does not exist'])
    expect(configErrors('')).toEqual([])
  })
})
