import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type ArchiveEntry, readTarGz } from '#vm-image/archive'

export interface IndexPackage {
  name: string
  version: string
  repo: string
  depends: string[]
}

export interface PackageIndex {
  packages: Map<string, IndexPackage>
  /** `so:libc.musl-x86.so.1`, `cmd:gcc`, … → the package that provides it. */
  provides: Map<string, string>
}

export const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

const bare = (dependency: string) => dependency.split(/[<>=~]/)[0] ?? dependency

/** Downloads once into the cache; later builds read the cached copy. */
export async function cachedFetch(url: string, cacheDir: string, name: string): Promise<Uint8Array> {
  const path = join(cacheDir, name)
  if (existsSync(path)) {
    return readFileSync(path)
  }
  mkdirSync(cacheDir, { recursive: true })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`)
  }
  const data = new Uint8Array(await response.arrayBuffer())
  writeFileSync(`${path}.part`, data)
  renameSync(`${path}.part`, path)
  return data
}

/** Reads an APKINDEX: blank-line separated records of `X:value` lines. */
export function parseIndex(text: string, repo: string, into: PackageIndex): void {
  for (const record of text.split('\n\n')) {
    const fields = new Map<string, string>()
    for (const line of record.split('\n')) {
      if (line.length > 2 && line[1] === ':') {
        fields.set(line[0] ?? '', line.slice(2))
      }
    }
    const name = fields.get('P')
    const version = fields.get('V')
    if (!name || !version || into.packages.has(name)) {
      continue
    }
    into.packages.set(name, { name, version, repo, depends: (fields.get('D') ?? '').split(' ').filter(Boolean) })
    for (const provided of (fields.get('p') ?? '').split(' ').filter(Boolean)) {
      if (!into.provides.has(bare(provided))) {
        into.provides.set(bare(provided), name)
      }
    }
  }
}

export function indexFromApkIndex(archive: Uint8Array): string {
  const entry = readTarGz(archive).find((candidate) => candidate.path === 'APKINDEX')
  if (!entry) {
    throw new Error('APKINDEX.tar.gz has no APKINDEX')
  }
  return new TextDecoder().decode(entry.data)
}

/** What the minirootfs already installed, by name and by what it provides. */
export function installedNames(minirootfs: readonly ArchiveEntry[]): Set<string> {
  const db = minirootfs.find((entry) => entry.path === 'lib/apk/db/installed')
  const names = new Set<string>()
  for (const line of new TextDecoder().decode(db?.data).split('\n')) {
    if (line.startsWith('P:')) {
      names.add(line.slice(2))
    } else if (line.startsWith('p:')) {
      for (const provided of line.slice(2).split(' ')) {
        names.add(bare(provided))
      }
    }
  }
  return names
}

/** Every package `wanted` needs, minus what is installed already. */
export function resolve(wanted: readonly string[], index: PackageIndex, installed: Set<string>): IndexPackage[] {
  const seen = new Set(installed)
  const order: IndexPackage[] = []
  const stack = [...wanted]
  while (stack.length > 0) {
    const dependency = bare(stack.pop() ?? '')
    if (dependency.startsWith('!') || seen.has(dependency)) {
      continue
    }
    const name = index.packages.has(dependency) ? dependency : index.provides.get(dependency)
    const found = name === undefined ? undefined : index.packages.get(name)
    if (!found) {
      throw new Error(`no package provides ${dependency}`)
    }
    seen.add(dependency)
    if (seen.has(found.name) && found.name !== dependency) {
      continue
    }
    seen.add(found.name)
    order.push(found)
    stack.push(...found.depends)
  }
  return order
}
