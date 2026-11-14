import type { GuideBeat } from '@features/guide/types'
import { appContent } from '@peerfall/missions/utils'
import { describe, expect, it } from 'vitest'
import { askedCommandOf, beatCommandsOf, releasesPause, skippedLeadOf, wayInOf } from './guide-command.util'
import { beatsOf, blocksFor } from './guide-story.util'

const beat = (...texts: string[]): GuideBeat => [
  { kind: 'lines', lines: texts.map((text) => ({ speaker: 'zebra', text })) },
]

describe('askedCommandOf', () => {
  it('finds the command a line asks for, by an asking word, a colon or a sentence of its own', () => {
    expect(askedCommandOf('Router a is a Linux computer: type `ip -br link`.')).toBe('ip -br link')
    expect(askedCommandOf('Ask who answered: `show daemons`.')).toBe('show daemons')
    expect(askedCommandOf('Back to `a#` with `end`.')).toBe('end')
    expect(askedCommandOf('`conf t`.')).toBe('conf t')
    expect(askedCommandOf('`show ip route` again.')).toBe('show ip route')
    expect(askedCommandOf("`ip address 10.0.1.2/30`, in a's network.")).toBe('ip address 10.0.1.2/30')
  })

  it('passes over spans the line only names, after the command or instead of one', () => {
    expect(askedCommandOf('Type `/usr/lib/frr/zebra -d -N a`. `-d` sends me away. `-N a` names the router.')).toBe(
      '/usr/lib/frr/zebra -d -N a'
    )
    expect(askedCommandOf('Look without leaving: `do show interface brief`. `do` runs a command of `a#`.')).toBe(
      'do show interface brief'
    )
    expect(askedCommandOf('`UP` for Linux too. Ping c: `ping -c 3 10.0.2.2`.')).toBe('ping -c 3 10.0.2.2')
    expect(askedCommandOf('The file has its own idea about `a-c`: `shutdown`, the setting you met.')).toBeNull()
    expect(askedCommandOf('Every reply came back, with `ttl=63`. `traceroute -n 10.0.2.2` uses that.')).toBeNull()
    expect(askedCommandOf('Line 7, refused with `Unknown command`. `echo $?` prints the last one.')).toBeNull()
    expect(askedCommandOf('`a-c` is `UP`. Now the routing table.')).toBeNull()
  })
})

describe('beatCommandsOf', () => {
  it('waits for the whole line after a word and `?`, which vtysh keeps on the line', () => {
    const beats = [
      beat('Type `description ?`, then Continue.'),
      beat('Finish it: `link to router c`, then Enter.'),
      beat('Type `end`.'),
    ]
    expect(beatCommandsOf(beats)).toEqual(['description ?', 'description link to router c', 'end'])
  })

  it('carries nothing after a `?` that completes a word or stands alone', () => {
    expect(beatCommandsOf([beat('Type `show i?`, then Continue.'), beat('Erase it, and type `sh int br`.')])).toEqual([
      'show i?',
      'sh int br',
    ])
  })
})

describe('releasesPause', () => {
  it('takes the command asked for, cut short as FRR takes it, behind a prompt or not', () => {
    expect(releasesPause('show ip route', 'a# sh ip ro')).toBe(true)
    expect(releasesPause('show ip route', 'show ip route')).toBe(true)
    expect(releasesPause('conf t', 'a# configure terminal')).toBe(true)
    expect(releasesPause('ip -br link', 'a:~# ip   -br  link')).toBe(true)
    expect(releasesPause('vtysh -c "show daemons"', "a:~# vtysh -c 'show daemons'")).toBe(true)
  })

  it('refuses a different command, a word more or less, and another case', () => {
    expect(releasesPause('show ip route', 'show ip')).toBe(false)
    expect(releasesPause('shutdown', 'no shutdown')).toBe(false)
    expect(releasesPause('ping -c 3 10.0.2.2', 'ping -c 3 10.0.2.3')).toBe(false)
    expect(releasesPause('ping -c 3 10.0.2.2', 'ping -c 3 10.0')).toBe(false)
    expect(releasesPause('vtysh', 'VTYSH')).toBe(false)
  })

  it('counts a refused line: a beat may ask for a command in the wrong mode', () => {
    expect(releasesPause('description link to router c', 'a(config)# description link to router c')).toBe(true)
  })

  it('lets any command through where the beat asks for none, or the Machine does not say what was typed', () => {
    expect(releasesPause(null, 'ls')).toBe(true)
    expect(releasesPause('show ip route', undefined)).toBe(true)
  })

  it('leaves a beat that asks for `?` to Continue: the line never runs', () => {
    expect(releasesPause('show i?', 'show i')).toBe(false)
    expect(releasesPause('?', undefined)).toBe(false)
  })
})

describe('wayInOf and skippedLeadOf', () => {
  const routers = ['a', 'b', 'c']

  it('follows vtysh modes and router clicks to where a step leaves the terminal', () => {
    const see = [beat('Type `vtysh`.'), beat('Then `conf t`.'), beat('Now `int lo`.'), beat('Then `end`, back.')]
    expect(wayInOf(see, routers, 'a')).toEqual({ router: null, commands: ['vtysh'] })
    const moved = [beat('Open `vtysh`.'), beat('Click c in the topology and type `ip route`.')]
    expect(wayInOf(moved, routers, 'a')).toEqual({ router: 'c', commands: [] })
  })

  it('says how to get there, unless Build it moves the terminal itself', () => {
    const see = [beat('Click c in the topology.'), beat('Type `vtysh`.')]
    expect(skippedLeadOf(see, [beat('Type `configure terminal`.')], routers, 'a')).toBe(
      'You skipped See it. Build it starts where See it ends: click c in the topology, then type `vtysh`.'
    )
    expect(skippedLeadOf(see, [beat('Click a, and type `vtysh`.')], routers, 'a')).toBeNull()
    expect(skippedLeadOf([beat('Type `ip route`.')], [beat('Open `vtysh`.')], routers, 'a')).toBeNull()
  })
})

describe('the stories on disk', () => {
  const loaded = appContent()
  if (!loaded.ok) {
    throw new Error(loaded.errors.join('\n'))
  }
  const { game, storyOf } = loaded.value
  const commandsOf = (id: string, step: 'see' | 'build' | 'watch') =>
    beatCommandsOf(beatsOf(blocksFor(step, storyOf(id)?.sections)))

  it('asks only for things a player can type', () => {
    for (const mission of game.missions) {
      for (const step of ['see', 'build', 'watch'] as const) {
        for (const command of commandsOf(mission.id, step)) {
          expect(command ?? 'none', `${mission.id} ${step}`).toMatch(/^(?:none|[a-z/?])/)
          expect(command ?? 'none', `${mission.id} ${step}`).not.toMatch(/[#>=]$|=/)
        }
      }
    }
  })

  it("waits for the commands The Router's Language asks for, the refused one and the `?` ones included", () => {
    expect(commandsOf('the-routers-language', 'see')).toEqual([
      'vtysh',
      '?',
      'show i?',
      'sh int br',
      'show interface a-c',
      null,
    ])
    expect(commandsOf('the-routers-language', 'build').slice(0, 5)).toEqual([
      'configure terminal',
      'interface a-c',
      '?',
      'no shutdown',
      'do show interface brief',
    ])
  })

  it('reads the whole description line in What It Does Now, typed after `description ?`', () => {
    expect(commandsOf('what-it-does-now', 'build').slice(1, 5)).toEqual([
      'description link to router c',
      'interface a-c',
      'description ?',
      'description link to router c',
    ])
  })
})
