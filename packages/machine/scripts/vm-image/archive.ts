import { gunzipSync, gzipSync } from 'node:zlib'

export type EntryKind = 'file' | 'dir' | 'symlink' | 'hardlink'

export interface ArchiveEntry {
  path: string
  kind: EntryKind
  mode: number
  uid: number
  gid: number
  mtime: number
  /** The target of a symlink or hard link. */
  link: string
  data: Uint8Array
}

const BLOCK = 512
const decoder = new TextDecoder()

const text = (block: Uint8Array, start: number, length: number) =>
  decoder.decode(block.subarray(start, start + length)).replace(/\0.*$/s, '')
const octal = (block: Uint8Array, start: number, length: number) =>
  Number.parseInt(text(block, start, length).trim() || '0', 8)

/** PAX records are `<length> <key>=<value>\n`. */
function paxRecords(data: Uint8Array): Map<string, string> {
  const records = new Map<string, string>()
  let offset = 0
  while (offset < data.length) {
    const space = data.indexOf(0x20, offset)
    const length = Number.parseInt(decoder.decode(data.subarray(offset, space)), 10)
    const record = decoder.decode(data.subarray(space + 1, offset + length - 1))
    const equals = record.indexOf('=')
    records.set(record.slice(0, equals), record.slice(equals + 1))
    offset += length
  }
  return records
}

/**
 * Reads a gzip'd tar, including Alpine's .apk files: three gzip members back to back,
 * whose tars end without the closing zero blocks, so zero blocks are skipped, not an end.
 */
export function readTarGz(archive: Uint8Array): ArchiveEntry[] {
  const tar = gunzipSync(archive)
  const entries: ArchiveEntry[] = []
  let longName: string | null = null
  let longLink: string | null = null
  let pax = new Map<string, string>()
  let offset = 0
  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK)
    offset += BLOCK
    if (header.every((byte) => byte === 0)) {
      continue
    }
    const size = octal(header, 124, 12)
    const data = tar.subarray(offset, offset + size)
    offset += Math.ceil(size / BLOCK) * BLOCK
    const type = String.fromCharCode(header[156] ?? 0)
    if (type === 'L') {
      longName = text(data, 0, data.length)
      continue
    }
    if (type === 'K') {
      longLink = text(data, 0, data.length)
      continue
    }
    if (type === 'x') {
      pax = paxRecords(data)
      continue
    }
    if (type === 'g') {
      continue
    }
    const prefix = text(header, 345, 155)
    const name = text(header, 0, 100)
    const path = pax.get('path') ?? longName ?? (prefix ? `${prefix}/${name}` : name)
    const link = pax.get('linkpath') ?? longLink ?? text(header, 157, 100)
    longName = null
    longLink = null
    pax = new Map()
    const kind: EntryKind | null =
      type === '0' || type === '\0' || type === '7'
        ? 'file'
        : type === '5'
          ? 'dir'
          : type === '2'
            ? 'symlink'
            : type === '1'
              ? 'hardlink'
              : null
    if (kind === null) {
      continue
    }
    entries.push({
      path: path.replace(/^\.\//, '').replace(/\/$/, ''),
      kind,
      mode: octal(header, 100, 8) & 0o7777,
      uid: octal(header, 108, 8),
      gid: octal(header, 116, 8),
      mtime: octal(header, 136, 12),
      link: link.replace(/^\.\//, ''),
      data: kind === 'file' ? new Uint8Array(data) : new Uint8Array(),
    })
  }
  return entries
}

export interface CpioEntry {
  path: string
  /** Includes the file type bits, e.g. 0o100755 or 0o40755. */
  mode: number
  data: Uint8Array
}

/** A gzip'd newc cpio archive, the format the kernel unpacks as its initramfs. */
export function writeCpioGz(entries: readonly CpioEntry[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const encoder = new TextEncoder()
  const pad = (length: number) => new Uint8Array((4 - (length % 4)) % 4)
  const all = [...entries, { path: 'TRAILER!!!', mode: 0, data: new Uint8Array() }]
  all.forEach((entry, index) => {
    const name = encoder.encode(`${entry.path}\0`)
    const fields = [index + 1, entry.mode, 0, 0, 1, 0, entry.data.length, 0, 0, 0, 0, name.length, 0]
    const header = encoder.encode(`070701${fields.map((value) => value.toString(16).padStart(8, '0')).join('')}`)
    chunks.push(header, name, pad(header.length + name.length), entry.data, pad(entry.data.length))
  })
  const archive = gzipSync(Buffer.concat(chunks), { level: 9 })
  // zlib writes the building OS here (3 on Linux, 19 on macOS), which would change the image's id.
  archive[GZIP_OS_BYTE] = GZIP_OS_UNIX
  return archive
}

const GZIP_OS_BYTE = 9
const GZIP_OS_UNIX = 3
