import type { NetworkDefinition, RouterDefinition } from '#types/definitions/network'

const NAMES = ['a', 'b', 'c'] as const

function router(name: string, id: number): RouterDefinition {
  const interfaces = NAMES.filter((peer) => peer !== name)
    .map((peer) => `interface ${name}-${peer}\n ip ospf area 0\n ip ospf network point-to-point\n ip ospf cost 10\n!\n`)
    .join('')
  return {
    name,
    loopback: `10.255.0.${id}/32`,
    daemons: ['ospfd', 'bfdd'],
    config: `${interfaces}interface lo\n ip ospf area 0\n ip ospf passive\n!\nrouter ospf\n ospf router-id 10.255.0.${id}\n log-adjacency-changes detail\n`,
  }
}

const link = (first: string, second: string, subnet: number) => ({
  ends: [
    { router: first, address: `10.0.${subnet}.1/30` },
    { router: second, address: `10.0.${subnet}.2/30` },
  ] as const,
})

/** Three routers in a triangle, OSPF point-to-point in area 0, every link at cost 10: a reaches c directly, or through b. */
export const TRIANGLE: NetworkDefinition = {
  routers: NAMES.map((name, at) => router(name, at + 1)),
  links: [link('a', 'b', 1), link('a', 'c', 2), link('b', 'c', 3)],
}

/** The link the first mission breaks. */
export const TRIANGLE_DIRECT_LINK = link('a', 'c', 2)
