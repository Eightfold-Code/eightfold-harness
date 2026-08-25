import { gzipSync } from 'node:zlib'

/** One regular file to write into a test tarball. */
export interface TestTarFile {
  path: string
  data: Uint8Array
}

/**
 * Build a gzip-compressed ustar archive for the parser tests. Checksums are
 * left blank because the reader does not verify them.
 * @param files - regular-file entries.
 * @param dirs - directory entries (the trailing slash is appended if missing).
 * @returns the gzipped archive bytes.
 */
export function buildTarGz(files: readonly TestTarFile[], dirs: readonly string[] = []): Buffer {
  const blocks: Buffer[] = []
  const pushHeader = (path: string, size: number, type: '0' | '5'): void => {
    const header = Buffer.alloc(512)
    header.write(path, 0, 100, 'utf8')
    header.write('0000644\0', 100, 'utf8')
    header.write('0000000\0', 108, 'utf8')
    header.write('0000000\0', 116, 'utf8')
    if (type === '0') header.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 'utf8')
    header.write('00000000000\0', 136, 'utf8')
    header.write('        \0', 148, 'utf8')
    header[156] = type.charCodeAt(0)
    header.write('ustar\0', 257, 'utf8')
    header.write('00', 263, 'utf8')
    blocks.push(header)
  }
  for (const dir of dirs) pushHeader(dir.endsWith('/') ? dir : `${dir}/`, 0, '5')
  for (const file of files) {
    pushHeader(file.path, file.data.length, '0')
    blocks.push(Buffer.from(file.data))
    const padded = Math.ceil(file.data.length / 512) * 512 - file.data.length
    if (padded > 0) blocks.push(Buffer.alloc(padded))
  }
  blocks.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(blocks))
}

/** The manifest file the installer looks for at an adaptation's root. */
export const VALID_MANIFEST = {
  schemaVersion: 1,
  id: 'hello-eightfold',
  name: 'Hello Eightfold',
  version: '0.1.0',
  description: 'Minimal example Eightfold adaptation.',
  entry: './src/index.ts',
  compatibility: { harness: '>=0.1.0' },
  permissions: [],
  dependencies: [],
}
