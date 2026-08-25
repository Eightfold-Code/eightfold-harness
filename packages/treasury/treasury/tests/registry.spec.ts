import { describe, expect, it } from 'vitest'
import { parseRegistry, isCompatible } from '../src/registry.ts'
import { REGISTRY_SCHEMA_VERSION } from '../src/registry.ts'

const registryFixture = {
  schemaVersion: 1,
  adaptations: {
    'hello-eightfold': {
      name: 'Hello Eightfold',
      description: 'Minimal example Eightfold adaptation.',
      version: '0.1.0',
      source: {
        repository: 'Eightfold-Code/eightfold-treasury',
        branch: 'adaptation/hello-eightfold',
      },
      entry: 'index.ts',
      compatibility: { eightfoldHarness: '>=0.1.0' },
    },
  },
  bundles: {
    developer: ['hello-eightfold'],
  },
}

describe('parseRegistry', () => {
  it('parses a valid registry', () => {
    const registry = parseRegistry(registryFixture)
    expect(registry.schemaVersion).toBe(REGISTRY_SCHEMA_VERSION)
    expect(Object.keys(registry.adaptations)).toEqual(['hello-eightfold'])
    expect(registry.adaptations['hello-eightfold']?.source.branch).toBe('adaptation/hello-eightfold')
    expect(registry.bundles.developer).toEqual(['hello-eightfold'])
  })

  it('accepts a registry without bundles', () => {
    const { bundles: _bundles, ...withoutBundles } = registryFixture
    expect(parseRegistry(withoutBundles).bundles).toEqual({})
  })

  it('accepts an explicit commit pin', () => {
    const registry = parseRegistry({
      ...registryFixture,
      adaptations: {
        'hello-eightfold': {
          ...registryFixture.adaptations['hello-eightfold'],
          source: { repository: 'a/b', branch: 'main', commit: '0'.repeat(40) },
        },
      },
    })
    expect(registry.adaptations['hello-eightfold']?.source.commit).toBe('0'.repeat(40))
  })

  it('rejects a non-object registry', () => {
    expect(() => parseRegistry(null)).toThrow('registry must be an object')
    expect(() => parseRegistry([])).toThrow('registry must be an object')
    expect(() => parseRegistry('registry')).toThrow('registry must be an object')
  })

  it('rejects an unsupported schemaVersion', () => {
    expect(() => parseRegistry({ ...registryFixture, schemaVersion: 2 })).toThrow('unsupported registry schemaVersion 2')
  })

  it('rejects a missing adaptations map', () => {
    expect(() => parseRegistry({ schemaVersion: 1 })).toThrow('registry.adaptations must be an object')
  })

  it('rejects malformed adaptation fields with their path', () => {
    expect(() => parseRegistry({
      schemaVersion: 1,
      adaptations: { x: { ...registryFixture.adaptations['hello-eightfold'], name: 42 } },
    })).toThrow('registry.adaptations.x.name must be a string')
    expect(() => parseRegistry({
      schemaVersion: 1,
      adaptations: { x: { ...registryFixture.adaptations['hello-eightfold'], source: { repository: 'a/b' } } },
    })).toThrow('registry.adaptations.x.source.branch must be a string')
    expect(() => parseRegistry({
      schemaVersion: 1,
      adaptations: { x: { ...registryFixture.adaptations['hello-eightfold'], compatibility: { eightfoldHarness: 1 } } },
    })).toThrow('registry.adaptations.x.compatibility.eightfoldHarness must be a string')
  })

  it('rejects malformed bundles and dangling adaptation ids', () => {
    expect(() => parseRegistry({ ...registryFixture, bundles: { developer: 'hello-eightfold' } }))
      .toThrow('registry.bundles.developer must be an array')
    expect(() => parseRegistry({ ...registryFixture, bundles: { developer: [42] } }))
      .toThrow('registry.bundles.developer[0] must be a string')
    expect(() => parseRegistry({ ...registryFixture, bundles: { developer: ['hello-eightfold', 'hello-eightfold'] } }))
      .toThrow('registry.bundles.developer must not contain duplicate adaptations')
    expect(() => parseRegistry({ ...registryFixture, bundles: { developer: ['missing'] } }))
      .toThrow('registry.bundles.developer references unknown adaptation "missing"')
  })

  it('accepts an absent optional source commit', () => {
    const registry = parseRegistry(registryFixture)
    expect(registry.adaptations['hello-eightfold']?.source.commit).toBeUndefined()
  })
})

describe('isCompatible', () => {
  const descriptor = registryFixture.adaptations['hello-eightfold']
  it('admits a version above the floor and rejects one below', () => {
    expect(isCompatible({ ...descriptor, compatibility: { eightfoldHarness: '>=0.1.0' } }, '0.2.0')).toBe(true)
    expect(isCompatible({ ...descriptor, compatibility: { eightfoldHarness: '>=0.1.0' } }, '0.0.9')).toBe(false)
    expect(isCompatible({ ...descriptor, compatibility: { eightfoldHarness: '>=1.0.0' } }, '0.9.0')).toBe(false)
  })

  it('treats a missing or unparsable floor as compatible', () => {
    expect(isCompatible({ ...descriptor, compatibility: {} }, '0.0.1')).toBe(true)
    expect(isCompatible({ ...descriptor, compatibility: { eightfoldHarness: '~1.2' } }, '0.0.1')).toBe(true)
  })
})
