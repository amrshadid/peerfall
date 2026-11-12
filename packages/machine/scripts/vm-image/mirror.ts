// Alpine deletes an .apk once a newer build replaces it, which would break the pinned build: every
// pinned download is also kept in one flat folder, uploaded as a GitHub Release's assets.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Where the mirror's files live, by name; PF_VM_MIRROR overrides it (a URL ending in `/`). */
export const DEFAULT_MIRROR = 'https://github.com/amrshadid/peerfall/releases/download/vm-mirror/'
/** The mirror's list of checksums, as `sha256sum` writes and checks it. */
export const MIRROR_SUMS = 'SHA256SUMS'

export const mirrorBase = (env: NodeJS.ProcessEnv = process.env) => env.PF_VM_MIRROR || DEFAULT_MIRROR

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * A file by `name`: the cached copy, else `url`, else the mirror's copy. The caller still checks it
 * against the lock, so a mirror can never change what is built.
 */
export async function fetchPinnedFile(
  url: string,
  name: string,
  cacheDir: string,
  mirror: string
): Promise<Uint8Array> {
  const path = join(cacheDir, name)
  if (existsSync(path)) {
    return readFileSync(path)
  }
  let data: Uint8Array
  try {
    data = await download(url)
  } catch (upstream) {
    try {
      data = await download(`${mirror}${name}`)
    } catch (fallback) {
      throw new Error(`${name}: not upstream (${String(upstream)}) nor on the mirror (${String(fallback)})`)
    }
    console.log(`${name}: from the mirror`)
  }
  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(`${path}.part`, data)
  renameSync(`${path}.part`, path)
  return data
}

/** Writes the files, flat, and their SHA256SUMS: everything a mirror release needs. */
export function writeMirror(dir: string, files: ReadonlyMap<string, Uint8Array>): void {
  mkdirSync(dir, { recursive: true })
  const sums: string[] = []
  for (const [name, data] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    writeFileSync(join(dir, name), data)
    sums.push(`${createHash('sha256').update(data).digest('hex')}  ${name}`)
  }
  writeFileSync(join(dir, MIRROR_SUMS), `${sums.join('\n')}\n`)
}
