/**
 * Structural validation of the Treasury registry document. The registry maps
 * adaptation ids to descriptors; every field is checked and a malformed shape
 * throws with the offending path.
 *
 * @module @deepseek-ai/dsh-treasury/registry
 */

import { asNumber, asOptionalString, asRecord, asString } from './validate.ts'

/** The single supported registry schema version. */
export const REGISTRY_SCHEMA_VERSION = 1

/** The versioned adaptation compatibility floor this installer understands. */
export const ADAPTATION_COMPATIBILITY_KEY = 'eightfoldHarness'

/** Source location of an adaptation: an owner/repo pair plus a branch or pin. */
export interface AdaptationSource {
  readonly repository: string
  readonly branch: string
  /** Explicit commit pin; when present it overrides branch resolution. */
  readonly commit?: string
}

/** One registry entry describing an installable adaptation. */
export interface AdaptationDescriptor {
  readonly name: string
  readonly description: string
  readonly version: string
  readonly source: AdaptationSource
  readonly entry: string
  readonly compatibility: Record<string, string>
}

/** The validated Treasury registry document. */
export interface TreasuryRegistry {
  readonly schemaVersion: number
  readonly adaptations: Readonly<Record<string, AdaptationDescriptor>>
}

function parseSource(value: unknown, path: string): AdaptationSource {
  const record = asRecord(value, path)
  const commit = asOptionalString(record.commit, `${path}.commit`)
  return {
    repository: asString(record.repository, `${path}.repository`),
    branch: asString(record.branch, `${path}.branch`),
    ...(commit === undefined ? {} : { commit }),
  }
}

function parseCompatibility(value: unknown, path: string): Record<string, string> {
  const record = asRecord(value, path)
  const compatibility: Record<string, string> = {}
  for (const [key, raw] of Object.entries(record)) {
    compatibility[key] = asString(raw, `${path}.${key}`)
  }
  return compatibility
}

function parseDescriptor(id: string, value: unknown): AdaptationDescriptor {
  const path = `registry.adaptations.${id}`
  const record = asRecord(value, path)
  return {
    name: asString(record.name, `${path}.name`),
    description: asString(record.description, `${path}.description`),
    version: asString(record.version, `${path}.version`),
    entry: asString(record.entry, `${path}.entry`),
    source: parseSource(record.source, `${path}.source`),
    compatibility: parseCompatibility(record.compatibility, `${path}.compatibility`),
  }
}

/**
 * Structurally validate a parsed registry document.
 * @param value - the parsed registry JSON, expected to be an object.
 * @returns the validated registry.
 * @throws when any required field is missing, mistyped, or the schema version
 * is unsupported.
 */
export function parseRegistry(value: unknown): TreasuryRegistry {
  const record = asRecord(value, 'registry')
  const schemaVersion = asNumber(record.schemaVersion, 'registry.schemaVersion')
  if (schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    throw new Error(`treasury: unsupported registry schemaVersion ${String(schemaVersion)}`)
  }
  const adaptationsRaw = asRecord(record.adaptations, 'registry.adaptations')
  const adaptations: Record<string, AdaptationDescriptor> = {}
  for (const [id, raw] of Object.entries(adaptationsRaw)) {
    adaptations[id] = parseDescriptor(id, raw)
  }
  return { schemaVersion, adaptations }
}

/**
 * Verify an adaptation descriptor against the running harness version.
 * @param descriptor - the validated adaptation descriptor.
 * @param harnessVersion - the installed Eightfold Harness version.
 * @returns true when the descriptor's compatibility floor admits the version.
 */
export function isCompatible(descriptor: AdaptationDescriptor, harnessVersion: string): boolean {
  const floor = descriptor.compatibility[ADAPTATION_COMPATIBILITY_KEY]
  if (floor === undefined) return true
  // The compatibility floor is a semantic version range such as ">=0.1.0".
  // A naive prefix comparison is the pragmatic prototype: exact prefix match
  // for ">=x.y.z" floors admits newer minors and patches on the same major.
  const match = /^>=(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(floor)
  if (match === null) return true
  const installed = harnessVersion.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
  if (installed === null) return true
  const floorMajor = Number(match[1])
  const floorMinor = Number(match[2] ?? 0)
  const floorPatch = Number(match[3] ?? 0)
  const major = Number(installed[1])
  const minor = Number(installed[2] ?? 0)
  const patch = Number(installed[3] ?? 0)
  if (major !== floorMajor) return major > floorMajor
  if (minor !== floorMinor) return minor > floorMinor
  return patch >= floorPatch
}
