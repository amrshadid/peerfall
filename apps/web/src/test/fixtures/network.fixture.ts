import type { LinkDefinition, NetworkDefinition, RouterDefinition } from '@peerfall/machine/types'

const NAMES = ['a', 'b', 'c'] as const

function router(name: string, id: number): RouterDefinition {
  const interfaces = NAMES.filter((peer) => peer !== name)
    .map((peer) => `interface ${name}-${peer}\n ip ospf area 0\n ip ospf network point-to-point\n ip ospf cost 10\n!\n`)
    .join('')
  return {
    name,
    loopback: `10.255.0.${id}/32`,
    daemons: ['ospfd', 'bfdd'],
    config: `${interfaces}interface lo\n ip ospf area 0\n ip ospf passive\n!\nrouter ospf\n ospf router-id 10.255.0.${id}\n log-adjacency-changes detail\n!\n`,
  }
}

const link = (first: string, second: string, subnet: number): LinkDefinition => ({
  ends: [
    { router: first, address: `10.0.${subnet}.1/30` },
    { router: second, address: `10.0.${subnet}.2/30` },
  ],
})

/** Three routers in a triangle, OSPF point-to-point in area 0, every link at cost 10: a reaches c directly, or through b. */
export const TRIANGLE: NetworkDefinition = {
  routers: NAMES.map((name, at) => router(name, at + 1)),
  links: [link('a', 'b', 1), link('a', 'c', 2), link('b', 'c', 3)],
}

/** The link the fixtures break. */
export const TRIANGLE_DIRECT_LINK = ['a', 'c'] as const

/** Two routers on one cable: the smallest network the drawing has to hold. */
export const PAIR: NetworkDefinition = {
  routers: [router('a', 1), router('b', 2)],
  links: [link('a', 'b', 1)],
}
