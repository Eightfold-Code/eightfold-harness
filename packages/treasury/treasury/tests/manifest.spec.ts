import { describe, expect, it } from 'vitest'
import { parseManifest } from '../src/manifest.ts'
import { MANIFEST_SCHEMA_VERSION } from '../src/manifest.ts'

const manifestFixture = {
  schemaVersion: 1,
  id: 'hello-eightfold',
  name: 'Hello Eightfold',
  version: '0.1.0',
  description: 'Minimal example Eightfold adaptation.',
  entry: './src/index.ts',
  compatibility: { harness: '>=0.1.0' },
  permissions: ['shell'],
  dependencies: ['@deepseek-ai/dsh-tool-bash'],
}

describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const manifest = parseManifest(manifestFixture)
    expect(manifest.schemaVersion).toBe(MANIFEST_SCHEMA_VERSION)
    expect(manifest.id).toBe('hello-eightfold')
    expect(manifest.permissions).toEqual(['shell'])
    expect(manifest.dependencies).toEqual(['@deepseek-ai/dsh-tool-bash'])
  })

  it('accepts empty permission and dependency lists', () => {
    const manifest = parseManifest({ ...manifestFixture, permissions: [], dependencies: [] })
    expect(manifest.permissions).toEqual([])
    expect(manifest.dependencies).toEqual([])
  })

  it('rejects a non-object manifest', () => {
    expect(() => parseManifest(null)).toThrow('manifest must be an object')
    expect(() => parseManifest('manifest')).toThrow('manifest must be an object')
  })

  it('rejects an unsupported schemaVersion', () => {
    expect(() => parseManifest({ ...manifestFixture, schemaVersion: 2 })).toThrow('unsupported manifest schemaVersion 2')
  })

  it('rejects malformed fields with their path', () => {
    expect(() => parseManifest({ ...manifestFixture, id: 42 })).toThrow('manifest.id must be a string')
    expect(() => parseManifest({ ...manifestFixture, compatibility: { harness: 1 } }))
      .toThrow('manifest.compatibility.harness must be a string')
    expect(() => parseManifest({ ...manifestFixture, permissions: 'shell' }))
      .toThrow('manifest.permissions must be an array of strings')
    expect(() => parseManifest({ ...manifestFixture, permissions: ['shell', 1] }))
      .toThrow('manifest.permissions must be an array of strings')
    expect(() => parseManifest({ ...manifestFixture, dependencies: {} }))
      .toThrow('manifest.dependencies must be an array of strings')
  })
})
