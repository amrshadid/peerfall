import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { constants, zstdCompressSync } from 'node:zlib'
import { sha256 } from '#vm-image/alpine'
import type { ArchiveEntry } from '#vm-image/archive'

// v86's 9p format, version 3: [name, size, mtime, mode, uid, gid, children | link target | file name].
type Node = [string, number, number, number, number, number, Node[] | string]

const S_IFLNK = 0xa000
const S_IFREG = 0x8000
const S_IFDIR = 0x4000
const HASH_LENGTH = 10

/** Later entries win, like unpacking packages over a root; hard links become copies. */
export function mergeTree(sources: readonly (readonly ArchiveEntry[])[]): Map<string, ArchiveEntry> {
  const tree = new Map<string, ArchiveEntry>()
  for (const entries of sources) {
    for (const entry of entries) {
      if (!entry.path || entry.path.startsWith('.')) {
        continue
      }
      if (entry.kind === 'hardlink') {
        const target = tree.get(entry.link)
        if (!target) {
          throw new Error(`hard link to unknown file: ${entry.link}`)
        }
        tree.set(entry.path, { ...entry, kind: 'file', data: target.data })
        continue
      }
      tree.set(entry.path, entry)
    }
  }
  return tree
}

/**
 * Writes `fs.json` and one zstd file per distinct content under `flat/`; v86 fetches a
 * file only when the guest opens it, and decompresses it on load.
 */
export function writeV86Fs(tree: Map<string, ArchiveEntry>, out: string): { files: number; bytes: number } {
  const flat = join(out, 'flat')
  mkdirSync(flat, { recursive: true })
  const root: Node[] = []
  const dirs = new Map<string, Node[]>([['', root]])
  let total = 0
  let files = 0

  const childrenOf = (path: string): Node[] => {
    const known = dirs.get(path)
    if (known) {
      return known
    }
    const slash = path.lastIndexOf('/')
    const children: Node[] = []
    childrenOf(path.slice(0, Math.max(0, slash))).push([path.slice(slash + 1), 0, 0, 0o755 | S_IFDIR, 0, 0, children])
    dirs.set(path, children)
    return children
  }

  for (const path of [...tree.keys()].sort()) {
    const entry = tree.get(path)
    if (!entry) {
      continue
    }
    const slash = path.lastIndexOf('/')
    const parent = path.slice(0, Math.max(0, slash))
    const name = path.slice(slash + 1)
    if (entry.kind === 'dir') {
      if (!dirs.has(path)) {
        const children: Node[] = []
        childrenOf(parent).push([name, 0, entry.mtime, entry.mode | S_IFDIR, entry.uid, entry.gid, children])
        dirs.set(path, children)
      }
      continue
    }
    if (entry.kind === 'symlink') {
      childrenOf(parent).push([
        name,
        entry.link.length,
        entry.mtime,
        entry.mode | S_IFLNK,
        entry.uid,
        entry.gid,
        entry.link,
      ])
      continue
    }
    const file = `${sha256(entry.data).slice(0, HASH_LENGTH)}.bin.zst`
    const target = join(flat, file)
    if (!existsSync(target)) {
      writeFileSync(target, zstdCompressSync(entry.data, { params: { [constants.ZSTD_c_compressionLevel]: 19 } }))
      files++
    }
    total += entry.data.length
    childrenOf(parent).push([name, entry.data.length, entry.mtime, entry.mode | S_IFREG, entry.uid, entry.gid, file])
  }

  writeFileSync(join(out, 'fs.json'), JSON.stringify({ fsroot: root, version: 3, size: total }))
  return { files, bytes: total }
}
