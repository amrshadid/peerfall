import { describe, expect, it } from 'vitest'
import { type PackageIndex, parseIndex, resolve } from '#vm-image/alpine'

const INDEX = `P:gcc
V:15.2.0-r5
D:binutils so:libc.musl-x86.so.1 so:libgmp.so.10

P:binutils
V:2.45-r0
D:so:libc.musl-x86.so.1

P:gmp
V:6.3.0-r4
p:so:libgmp.so.10=10.5.0

P:bash
V:5.3.9-r1
D:!bash-legacy /bin/sh
`

function index(): PackageIndex {
  const parsed: PackageIndex = { packages: new Map(), provides: new Map() }
  parseIndex(INDEX, 'main', parsed)
  return parsed
}

describe('resolve', () => {
  it('follows dependencies and what other packages provide, skipping what is installed', () => {
    const names = resolve(['gcc'], index(), new Set(['so:libc.musl-x86.so.1'])).map((found) => found.name)
    expect(names.sort()).toEqual(['binutils', 'gcc', 'gmp'])
  })

  it('ignores conflicts and fails loudly on a dependency nothing provides', () => {
    expect(resolve(['bash'], index(), new Set(['/bin/sh'])).map((found) => found.name)).toEqual(['bash'])
    expect(() => resolve(['clang'], index(), new Set())).toThrow('no package provides clang')
  })
})
