import { describe, expect, it } from 'vitest'
import { applyRouterConfig, readRouterConfig, shorterNegation } from '#services/vm/vm-config.service'

const RUNNING =
  'Building configuration...\n\nCurrent configuration:\n!\nhostname b\n!\ninterface b-a\n description to a\n ip ospf cost 10\nexit\n!\nend\n'

/** A router that knows `no description` but not `no description to a`, and nothing called `bdf`. */
function router() {
  const lines: string[] = []
  const control = async (line: string) => {
    lines.push(line)
    if (line.includes('show running-config')) {
      return { status: 0, output: RUNNING }
    }
    const refused =
      line.includes("'no description to'") || line.includes("'no description to a'") || line.includes('bdf')
    return { status: refused ? 1 : 0, output: refused ? '% Unknown command: that line\r\n' : '' }
  }
  return { control, lines }
}

describe('a router’s configuration through its vtysh', () => {
  it('reads the running configuration as text', async () => {
    expect(await readRouterConfig(router().control, 'b')).toBe(
      'hostname b\n!\ninterface b-a\n description to a\n ip ospf cost 10\nexit\n!\n'
    )
  })

  it('types nothing when the text is what the router already has', async () => {
    const { control, lines } = router()
    const text = (await readRouterConfig(control, 'b')) ?? ''
    expect(await applyRouterConfig(control, 'b', text)).toEqual({ ok: true, value: null })
    expect(lines.filter((line) => line.includes('configure terminal'))).toEqual([])
  })

  it('takes a line away with fewer words when FRR refuses the whole line', async () => {
    const { control, lines } = router()
    const applied = await applyRouterConfig(control, 'b', 'interface b-a\n ip ospf cost 10\nexit\n')
    expect(applied).toEqual({ ok: true, value: null })
    expect(lines.at(-1)).toBe("vtysh -N b -c 'configure terminal' -c 'interface b-a' -c 'no description' -c 'end'")
  })

  it('reports FRR’s own message for a line it does not know', async () => {
    const applied = await applyRouterConfig(
      router().control,
      'b',
      'interface b-a\n description to a\n ip ospf cost 10\n ip ospf bdf\nexit\n'
    )
    expect(applied).toEqual({ ok: false, errors: ['% Unknown command: that line'] })
  })

  it('knows the next shorter way to take a line away', () => {
    expect(shorterNegation('no description to a')).toBe('no description to')
    expect(shorterNegation('no description')).toBeNull()
    expect(shorterNegation('ip ospf bfd')).toBeNull()
  })
})
