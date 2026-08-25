import { describe, expect, it } from 'vitest'
import { decompressTarGz, parseTarArchive } from '../src/tar.ts'
import { buildTarGz } from './helpers.ts'

describe('parseTarArchive', () => {
  it('parses files and directories and strips gzip framing', () => {
    const archive = buildTarGz(
      [
        { path: 'repo-deadbeef/eightfold.json', data: new TextEncoder().encode('{"ok":true}') },
        { path: 'repo-deadbeef/src/index.ts', data: new TextEncoder().encode('export const hi = 1') },
      ],
      ['repo-deadbeef/src/'],
    )
    const entries = parseTarArchive(decompressTarGz(archive))
    expect(entries).toHaveLength(3)
    expect(entries[0]).toEqual({ path: 'repo-deadbeef/src', type: 'directory', data: new Uint8Array() })
    expect(entries[1]).toMatchObject({ path: 'repo-deadbeef/eightfold.json', type: 'file' })
    expect(new TextDecoder().decode(entries[1]?.data)).toBe('{"ok":true}')
    expect(entries[2]).toMatchObject({ path: 'repo-deadbeef/src/index.ts', type: 'file' })
  })

  it('rejects an unsupported entry type (symlink)', () => {
    // A symlink entry (type '2') cannot be produced by the test builder, so
    // hand-construct one header block with typeflag '2'.
    const header = Buffer.alloc(512)
    header.write('repo-deadbeef/evil', 0, 100, 'utf8')
    header[156] = '2'.charCodeAt(0)
    const archive = Buffer.concat([header, Buffer.alloc(1024)])
    expect(() => parseTarArchive(archive)).toThrow('unsupported tarball entry type "2"')
  })

  it('rejects data that extends past the archive', () => {
    const header = Buffer.alloc(512)
    header.write('repo-deadbeef/file', 0, 100, 'utf8')
    header.write(`${(1024).toString(8).padStart(11, '0')}\0`, 124, 'utf8')
    header[156] = '0'.charCodeAt(0)
    const archive = Buffer.concat([header, Buffer.alloc(100)])
    expect(() => parseTarArchive(archive)).toThrow('extends past the archive')
  })
})
