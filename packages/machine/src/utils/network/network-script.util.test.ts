import { describe, expect, it } from 'vitest'
import type { NetworkDefinition } from '#types/definitions/network'
import {
  frrConfig,
  interfaceName,
  linkFaultLine,
  networkProblems,
  networkSetupLines,
} from '#utils/network/network-script.util'

const triangle: NetworkDefinition = {
  routers: [
    {
      name: 'a',
      loopback: '10.255.0.1/32',
      daemons: ['ospfd', 'bfdd'],
      config: 'router ospf\n ospf router-id 10.255.0.1\n',
    },
    { name: 'b', loopback: '10.255.0.2/32', daemons: ['ospfd', 'bfdd'], config: 'router ospf\n' },
    { name: 'c', daemons: ['ospfd'], config: '' },
  ],
  links: [
    {
      ends: [
        { router: 'a', address: '10.0.1.1/30' },
        { router: 'b', address: '10.0.1.2/30' },
      ],
    },
    {
      ends: [
        { router: 'a', address: '10.0.2.1/30' },
        { router: 'c', address: '10.0.2.2/30' },
      ],
    },
  ],
}

const decoded = (line: string): string[] =>
  [...line.matchAll(/echo (\S+) \| base64 -d/g)].map((match) =>
    new TextDecoder().decode(Uint8Array.from(atob(match[1] ?? ''), (char) => char.charCodeAt(0)))
  )

describe('a network’s setup lines', () => {
  it('finds nothing wrong with a valid network', () => {
    expect(networkProblems(triangle)).toEqual([])
  })

  it('builds namespaces, then cables, then files, daemons and configuration', () => {
    const lines = networkSetupLines(triangle)
    expect(lines).toHaveLength(3 + 2 + 3 + 3 + 3)
    expect(lines[0]).toBe(
      'ip netns add a && ip -n a link set lo up && ip -n a addr add 10.255.0.1/32 dev lo && ip netns exec a sysctl -qw net.ipv4.ip_forward=1'
    )
    expect(lines[2]).toBe(
      'ip netns add c && ip -n c link set lo up && ip netns exec c sysctl -qw net.ipv4.ip_forward=1'
    )
    expect(lines[4]).toBe(
      'ip link add a-c netns a type veth peer name c-a netns c && ip -n a addr add 10.0.2.1/30 dev a-c && ip -n c addr add 10.0.2.2/30 dev c-a && ip -n a link set a-c up && ip -n c link set c-a up'
    )
    expect(lines[8]).toBe(
      ['zebra', 'mgmtd', 'ospfd', 'bfdd']
        .map((daemon) => `ip netns exec a unshare -u sh -c 'hostname a && exec /usr/lib/frr/${daemon} -d -N a'`)
        .join(' && ')
    )
    expect(lines.slice(11)).toEqual(['vtysh -N a -b', 'vtysh -N b -b', 'vtysh -N c -b'])
  })

  it('writes each router’s frr.conf with the Machine’s own lines first, owned by frr', () => {
    const line = networkSetupLines(triangle)[5] ?? ''
    expect(line.startsWith('mkdir -p /etc/frr/a /run/frr/a /var/lib/frr/a /lib/frr/a && ')).toBe(true)
    expect(line.endsWith(' && chown -R frr:frr /etc/frr/a /run/frr/a /var/lib/frr/a /lib/frr/a')).toBe(true)
    expect(decoded(line)).toEqual([
      'frr defaults traditional\nhostname a\nlog file /var/log/frr/a.log\nlog timestamp precision 3\n!\nrouter ospf\n ospf router-id 10.255.0.1\n',
      'hostname a\nservice integrated-vtysh-config\n',
    ])
  })

  it('keeps a configuration with quotes and non-ASCII text intact', () => {
    const config = 'banner motd \'héllo "you"\'\n'
    const [router] = triangle.routers
    expect(
      decoded(networkSetupLines({ routers: [{ ...router, name: 'a', daemons: [], config }], links: [] })[1] ?? '')[0]
    ).toBe(frrConfig({ name: 'a', daemons: [], config }))
  })

  it('names an interface after the router it faces', () => {
    expect(interfaceName('a', 'c')).toBe('a-c')
  })

  it('drops a link’s packets on both ends, and stops', () => {
    const [, link] = triangle.links
    if (!link) {
      throw new Error('the triangle has two links')
    }
    expect(linkFaultLine(link, true)).toBe(
      'tc -n a qdisc add dev a-c root netem loss 100% && tc -n c qdisc add dev c-a root netem loss 100%'
    )
    expect(linkFaultLine(link, false)).toBe('tc -n a qdisc del dev a-c root && tc -n c qdisc del dev c-a root')
  })
})

describe('a network’s problems', () => {
  it('refuses names and addresses that are not plain shell words', () => {
    const problems = networkProblems({
      routers: [
        { name: 'a; reboot', daemons: [], config: '' },
        { name: 'b', loopback: '10.255.0.2', daemons: [], config: '' },
        { name: 'b', daemons: ['ripd' as never], config: '' },
      ],
      links: [
        {
          ends: [
            { router: 'b', address: '10.0.1.1/30 dev lo' },
            { router: 'z', address: '10.0.1.2/30' },
          ],
        },
      ],
    })
    expect(problems).toEqual([
      'routers[0].name: expected a lower-case name of at most 6 characters, got "a; reboot"',
      'routers[1].loopback: expected an address like 10.255.0.1/32, got "10.255.0.2"',
      'routers[2].name: "b" is used twice',
      'routers[2].daemons: unknown daemon "ripd"',
      'links[0].ends[0].address: expected an address like 10.0.2.1/30, got "10.0.1.1/30 dev lo"',
      'links[0].ends[1].router: no router named "z"',
    ])
  })

  it('refuses a link from a router to itself, and a second link between the same two', () => {
    const ends = (first: string, second: string) =>
      ({
        ends: [
          { router: first, address: '10.0.1.1/30' },
          { router: second, address: '10.0.1.2/30' },
        ],
      }) as const
    const routers = ['a', 'b'].map((name) => ({ name, daemons: [], config: '' }))
    expect(networkProblems({ routers, links: [ends('a', 'a'), ends('a', 'b'), ends('b', 'a')] })).toEqual([
      'links[0]: both ends are on "a"',
      'links[2]: "b" and "a" already have a link',
    ])
  })
})
