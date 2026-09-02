/**
 * Structural validation of the Armoury registry document. The registry maps
 * skin ids to descriptors and may define named collections of skin ids; every
 * field is checked and a malformed shape throws with the offending path.
 *
 * @module @deepseek-ai/dsh-armoury/registry
 */

import {
  parseDescriptorCompatibility,
  parseDescriptorSource,
  asOptionalString,
  asRecord,
  asString,
} from '@deepseek-ai/dsh-treasury'

/** The single supported registry schema version. */
export const REGISTRY_SCHEMA_VERSION = '1.0'

/** Source location of a skin: an owner/repo pair plus a branch or pin. */
export interface SkinSource {
  readonly repository: string
  readonly branch: string
  /** Explicit commit pin; when present it overrides branch resolution. */
  readonly commit?: string
}

/** One registry entry describing an installable skin. */
export interface SkinDescriptor {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly version: string
  readonly source: SkinSource
  /** Skin manifest file name at the archive root; defaults to `eightfold.skin.json`. */
  readonly manifest?: string
  readonly compatibility: Record<string, string>
}

/** The validated Armoury registry document. */
export interface ArmouryRegistry {
  readonly schemaVersion: string
  readonly skins: Readonly<Record<string, SkinDescriptor>>
  /** Named sets of skin ids that can be installed together. */
  readonly collections: Readonly<Record<string, readonly string[]>>
}

/** The default skin manifest file name. */
export const DEFAULT_SKIN_MANIFEST = 'eightfold.skin.json'

function parseDescriptor(id: string, value: unknown): SkinDescriptor {
  const path = `registry.skins.${id}`
  const record = asRecord(value, path)
  const entryId = asString(record.id, `${path}.id`)
  if (entryId !== id) {
    throw new Error(`armoury: ${path}.id ${JSON.stringify(entryId)} does not match registry key ${JSON.stringify(id)}`)
  }
  const manifest = asOptionalString(record.manifest, `${path}.manifest`)
  return {
    id: entryId,
    name: asString(record.name, `${path}.name`),
    description: asString(record.description, `${path}.description`),
    version: asString(record.version, `${path}.version`),
    source: parseDescriptorSource(record.source, `${path}.source`),
    ...(manifest === undefined ? {} : { manifest }),
    compatibility: parseDescriptorCompatibility(record.compatibility, `${path}.compatibility`),
  }
}

function parseCollections(value: unknown, skins: Readonly<Record<string, SkinDescriptor>>): Record<string, readonly string[]> {
  if (value === undefined) return {}
  const record = asRecord(value, 'registry.collections')
  const collections: Record<string, readonly string[]> = {}
  for (const [collection, raw] of Object.entries(record)) {
    if (!Array.isArray(raw)) throw new Error(`armoury: registry.collections.${collection} must be an array`)
    const ids = raw.map((item, index) => asString(item, `registry.collections.${collection}.${index}`))
    const seen = new Set<string>()
    for (const id of ids) {
      if (skins[id] === undefined) {
        throw new Error(`armoury: registry.collections.${collection} references unknown skin ${JSON.stringify(id)}`)
      }
      if (seen.has(id)) {
        throw new Error(`armoury: registry.collections.${collection} contains duplicate skin ${JSON.stringify(id)}`)
      }
      seen.add(id)
    }
    collections[collection] = ids
  }
  return collections
}

/**
 * Structurally validate a parsed registry document.
 * @param value - the parsed registry JSON, expected to be an object.
 * @returns the validated registry.
 * @throws when any required field is missing, mistyped, or the schema version
 * is unsupported.
 */
export function parseArmouryRegistry(value: unknown): ArmouryRegistry {
  const record = asRecord(value, 'registry')
  const schemaVersion = asString(record.schemaVersion, 'registry.schemaVersion')
  if (schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    throw new Error(`armoury: unsupported registry schemaVersion ${JSON.stringify(schemaVersion)}`)
  }
  const skinsRaw = asRecord(record.skins, 'registry.skins')
  const skins: Record<string, SkinDescriptor> = {}
  for (const [id, raw] of Object.entries(skinsRaw)) {
    skins[id] = parseDescriptor(id, raw)
  }
  const collections = parseCollections(record.collections, skins)
  return { schemaVersion, skins, collections }
}
