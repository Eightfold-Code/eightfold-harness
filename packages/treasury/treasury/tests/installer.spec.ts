import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EIGHTFOLD_HOME_ENV, type InstallerIo } from '../src/installer.ts'
import {
  installAdaptation,
  planExtraction,
  readInstalledState,
  removeAdaptation,
  resolveEightfoldHome,
  writeInstalledState,
} from '../src/installer.ts'
import { decompressTarGz, parseTarArchive } from '../src/tar.ts'
import { buildTarGz, VALID_MANIFEST } from './helpers.ts'

const COMMIT = 'a'.repeat(40)
const manifestBytes = (manifest: object): Uint8Array => new TextEncoder().encode(JSON.stringify(manifest))

/** A fake installer I/O bundle backed by an in-memory archive. */
function ioWithArchive(archive: Uint8Array, resolver: InstallerIo['gitLsRemote'] = async () => COMMIT): InstallerIo {
  return {
    fetch: async (_url: string | URL | Request) => {
      const body = new Uint8Array(archive)
      return new Response(body, { status: 200 })
    },
    gitLsRemote: resolver,
  }
}

const validDescriptor = {
  name: 'Hello Eightfold',
  description: 'Minimal example Eightfold adaptation.',
  version: '0.1.0',
  entry: 'index.ts',
  compatibility: { eightfoldHarness: '>=0.1.0' },
  source: { repository: 'Eightfold-Code/eightfold-treasury', branch: 'adaptation/hello-eightfold' },
}

const validArchive = () => buildTarGz(
  [
    { path: `eightfold-treasury-${COMMIT}/eightfold.json`, data: manifestBytes(VALID_MANIFEST) },
    { path: `eightfold-treasury-${COMMIT}/src/index.ts`, data: new TextEncoder().encode('export const hi = 1') },
    { path: `eightfold-treasury-${COMMIT}/README.md`, data: new TextEncoder().encode('# Hello') },
  ],
  [`eightfold-treasury-${COMMIT}/src/`],
)

const temps: string[] = []
/** Allocate a repo-lifetime temp home under the OS temp directory. */
async function tempHome(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-treasury-'))
  temps.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(temps.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('resolveEightfoldHome', () => {
  it('defaults to .eightfold under the invoking directory', () => {
    expect(resolveEightfoldHome({})).toBe(join(process.cwd(), '.eightfold'))
  })

  it('prefers a non-blank EIGHTFOLD_HOME and expands a tilde', () => {
    expect(resolveEightfoldHome({ [EIGHTFOLD_HOME_ENV]: '/srv/eightfold' })).toBe('/srv/eightfold')
    expect(resolveEightfoldHome({ [EIGHTFOLD_HOME_ENV]: '   ' })).toBe(join(process.cwd(), '.eightfold'))
    expect(resolveEightfoldHome({ [EIGHTFOLD_HOME_ENV]: '~/apps' })).toBe(join(homedir(), 'apps'))
    expect(resolveEightfoldHome({ [EIGHTFOLD_HOME_ENV]: '~' })).toBe(homedir())
  })
})

describe('planExtraction', () => {
  it('strips the repository-root directory and validates all paths', () => {
    const planned = planExtraction(parseTarArchive(decompressTarGz(validArchive())))
    const paths = planned.map(entry => entry.segments.join('/'))
    expect(paths).toEqual(expect.arrayContaining(['eightfold.json', 'src/index.ts', 'README.md', 'src']))
  })

  it('rejects traversal, absolute, backslash, and drive-colon paths', () => {
    const unsafe = [
      'repo-x/../../evil',
      '/etc/passwd',
      'repo-x/a/../b',
      'repo-x\\a\\b',
      'repo-x/C:/evil',
    ]
    for (const path of unsafe) {
      const archive = buildTarGz([{ path, data: new TextEncoder().encode('x') }])
      expect(() => planExtraction(parseTarArchive(decompressTarGz(archive))), path).toThrow()
    }
  })
})

describe('installAdaptation', () => {
  it('pins, downloads, validates, extracts, and records an adaptation', async () => {
    const home = await tempHome()
    const fetched: string[] = []
    const io: InstallerIo = {
      fetch: async (url: string | URL | Request) => {
        fetched.push(url as string)
        return new Response(new Uint8Array(validArchive()), { status: 200 })
      },
      gitLsRemote: async () => COMMIT,
    }
    const record = await installAdaptation(home, 'hello-eightfold', validDescriptor, io)

    expect(fetched).toEqual([`https://codeload.github.com/Eightfold-Code/eightfold-treasury/tar.gz/${COMMIT}`])
    expect(record.source.commit).toBe(COMMIT)
    expect(record.manifest.id).toBe('hello-eightfold')
    expect(record.permissions).toEqual([])

    expect(await readFile(join(home, 'adaptations/hello-eightfold/eightfold.json'), 'utf8'))
      .toBe(JSON.stringify(VALID_MANIFEST))
    expect(await readFile(join(home, 'adaptations/hello-eightfold/src/index.ts'), 'utf8')).toBe('export const hi = 1')

    const state = await readInstalledState(home)
    expect(state.adaptations['hello-eightfold']?.source.commit).toBe(COMMIT)
  })

  it('prefers an explicit commit pin over branch resolution', async () => {
    const home = await tempHome()
    let resolved = false
    const io: InstallerIo = {
      fetch: async () => new Response(new Uint8Array(validArchive()), { status: 200 }),
      gitLsRemote: async () => {
        resolved = true
        return COMMIT
      },
    }
    await installAdaptation(home, 'hello-eightfold', {
      ...validDescriptor,
      source: { repository: 'a/b', branch: 'main', commit: COMMIT },
    }, io)
    expect(resolved).toBe(false)
  })

  it('rejects a manifest id that does not match the adaptation', async () => {
    const home = await tempHome()
    const archive = buildTarGz([
      { path: 'repo-x/eightfold.json', data: manifestBytes({ ...VALID_MANIFEST, id: 'other' }) },
    ])
    await expect(installAdaptation(home, 'hello-eightfold', validDescriptor, ioWithArchive(archive)))
      .rejects.toThrow('does not match requested adaptation "hello-eightfold"')
  })

  it('rejects an archive without a root manifest before writing anything', async () => {
    const home = await tempHome()
    const archive = buildTarGz([{ path: 'repo-x/src/index.ts', data: new TextEncoder().encode('x') }])
    await expect(installAdaptation(home, 'hello-eightfold', validDescriptor, ioWithArchive(archive)))
      .rejects.toThrow('contains no root eightfold.json manifest')
    expect((await readInstalledState(home)).adaptations['hello-eightfold']).toBeUndefined()
  })

  it('rejects an invalid manifest with a positioned error', async () => {
    const home = await tempHome()
    const archive = buildTarGz([
      { path: 'repo-x/eightfold.json', data: manifestBytes({ ...VALID_MANIFEST, permissions: 'shell' }) },
    ])
    await expect(installAdaptation(home, 'hello-eightfold', validDescriptor, ioWithArchive(archive)))
      .rejects.toThrow('invalid manifest')
  })

  it('writes nothing when an entry escapes the extraction directory', async () => {
    const home = await tempHome()
    const archive = buildTarGz([
      { path: 'repo-x/eightfold.json', data: manifestBytes(VALID_MANIFEST) },
      { path: 'repo-x/../../escaped.txt', data: new TextEncoder().encode('x') },
    ])
    await expect(installAdaptation(home, 'hello-eightfold', validDescriptor, ioWithArchive(archive)))
      .rejects.toThrow('escapes the extraction directory')
    expect(await readFile(join(home, 'adaptations/hello-eightfold/eightfold.json'), 'utf8').catch(() => 'missing'))
      .toBe('missing')
    expect((await readInstalledState(home)).adaptations['hello-eightfold']).toBeUndefined()
  })
})

describe('installed state', () => {
  it('round-trips a recorded state', async () => {
    const home = await tempHome()
    const record = {
      manifest: VALID_MANIFEST,
      permissions: ['shell'],
      source: { repository: 'a/b', branch: 'main', commit: COMMIT },
      installedAt: '2026-08-25T00:00:00.000Z',
    }
    await writeInstalledState(home, { schemaVersion: 1, adaptations: { x: record } })
    expect(await readInstalledState(home)).toEqual({ schemaVersion: 1, adaptations: { x: record } })
  })

  it('treats a missing state file as empty', async () => {
    const home = await tempHome()
    expect(await readInstalledState(home)).toEqual({ schemaVersion: 1, adaptations: {} })
  })

  it('rejects a structurally invalid state file', async () => {
    const home = await tempHome()
    await writeInstalledState(home, { schemaVersion: 1, adaptations: {} })
    await writeFile(join(home, 'installed.json'), JSON.stringify({ schemaVersion: 2, adaptations: {} }))
    await expect(readInstalledState(home)).rejects.toThrow('unsupported installed-state schemaVersion 2')
  })
})

describe('removeAdaptation', () => {
  it('removes the record and the extracted directory', async () => {
    const home = await tempHome()
    await installAdaptation(home, 'hello-eightfold', validDescriptor, ioWithArchive(validArchive()))
    expect(await removeAdaptation(home, 'hello-eightfold')).toBe(true)
    expect((await readInstalledState(home)).adaptations['hello-eightfold']).toBeUndefined()
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(home, 'adaptations/hello-eightfold'))).toBe(false)
  })

  it('reports a missing adaptation as not removed', async () => {
    const home = await tempHome()
    expect(await removeAdaptation(home, 'ghost')).toBe(false)
  })
})
