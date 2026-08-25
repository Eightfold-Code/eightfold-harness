/**
 * Minimal ustar tar.gz reader for Treasury archives. GitHub codeload tarballs
 * are gzip-compressed ustar archives with a single repository-root directory;
 * this reader supports regular files and directories and rejects every other
 * entry type so a hostile archive cannot plant symlinks or hard links.
 *
 * @module @deepseek-ai/dsh-treasury/tar
 */

import { gunzipSync } from 'node:zlib'

/** One parsed archive entry, kept in memory so nothing is written pre-validate. */
export interface TarEntry {
  readonly path: string
  readonly type: 'file' | 'directory'
  readonly data: Uint8Array
}

const BLOCK_SIZE = 512
const HEADER_NAME = 0
const HEADER_SIZE = 124
const HEADER_TYPE = 156
const HEADER_PREFIX = 345
const NAME_FIELD = 100
const SIZE_FIELD = 12
const PREFIX_FIELD = 155
const REGULAR_FILE_ZERO = 0x00
const REGULAR_FILE = 0x30
const DIRECTORY = 0x35
const GNU_LONG_NAME = 0x4c
const GNU_LONG_LINK = 0x4b
const PAX_EXTENDED = 0x78
const PAX_GLOBAL = 0x67
const BASE_256_MARK = 0x80
const BASE_256_SIGN = 0x40

/**
 * Entry types whose data payload is metadata, never file content: pax
 * extended/global headers and GNU long-name/link records. Their payload is
 * skipped and never interpreted; the following ustar header is still parsed
 * and path-validated independently, so a forged record cannot smuggle a path.
 */
const METADATA_TYPES = new Set([GNU_LONG_NAME, GNU_LONG_LINK, PAX_EXTENDED, PAX_GLOBAL])

/**
 * Decompress a gzip archive. The whole archive stays in memory so every entry
 * is validated before the installer writes anything.
 * @param data - the gzip-compressed archive bytes.
 * @returns the uncompressed ustar bytes.
 */
export function decompressTarGz(data: Uint8Array): Uint8Array {
  return gunzipSync(data)
}

/** Read a NUL-padded header field as a trimmed string. */
function readTextField(header: Uint8Array, start: number, length: number): string {
  let end = start + length
  while (end > start && header[end - 1] === 0) end -= 1
  return new TextDecoder().decode(header.subarray(start, end)).replace(/\s+$/, '')
}

/** Read an octal (or base-256) header size field. */
function readSizeField(header: Uint8Array, start: number): number {
  const field = header.subarray(start, start + SIZE_FIELD)
  const first = field[0] ?? 0
  if ((first & BASE_256_MARK) !== 0) {
    let value = 0n
    for (let i = 1; i < SIZE_FIELD; i += 1) {
      value = (value << 8n) | BigInt(field[i] ?? 0)
    }
    if ((first & BASE_256_SIGN) !== 0) {
      value -= 1n << BigInt(SIZE_FIELD * 8 - 1)
    }
    return Number(value)
  }
  const octal = new TextDecoder().decode(field).replace(/[^0-7]/g, '')
  if (octal.length === 0) return 0
  const value = Number.parseInt(octal, 8)
  if (Number.isNaN(value)) {
    throw new Error('treasury: malformed tarball: non-numeric size field')
  }
  return value
}

/**
 * Parse a ustar archive into in-memory entries.
 * @param buffer - uncompressed ustar bytes.
 * @returns the parsed file and directory entries.
 * @throws when the archive is structurally malformed or contains an entry
 * type other than a regular file or directory.
 */
export function parseTarArchive(buffer: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = []
  let offset = 0
  while (offset + BLOCK_SIZE <= buffer.length) {
    const header = buffer.subarray(offset, offset + BLOCK_SIZE)
    if (header.every(byte => byte === 0)) break
    const name = readTextField(header, HEADER_NAME, NAME_FIELD)
    const prefix = readTextField(header, HEADER_PREFIX, PREFIX_FIELD)
    const path = prefix.length > 0 ? `${prefix}/${name}` : name
    const size = readSizeField(header, HEADER_SIZE)
    const type = header[HEADER_TYPE] ?? 0
    offset += BLOCK_SIZE
    const paddedSize = Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE
    if (offset + paddedSize > buffer.length) {
      throw new Error(`treasury: malformed tarball: data for ${path} extends past the archive`)
    }
    if (type === REGULAR_FILE || type === REGULAR_FILE_ZERO) {
      entries.push({ path, type: 'file', data: buffer.subarray(offset, offset + size) })
    } else if (type === DIRECTORY) {
      // Directory names conventionally end in `/`; normalize so downstream
      // path handling sees one consistent form.
      entries.push({ path: path.replace(/\/+$/, ''), type: 'directory', data: new Uint8Array() })
    } else if (METADATA_TYPES.has(type)) {
      // Skip the metadata payload; the next header is parsed independently.
    } else {
      throw new Error(`treasury: unsupported tarball entry type ${JSON.stringify(String.fromCharCode(type))} for ${path}`)
    }
    offset += paddedSize
  }
  return entries
}
