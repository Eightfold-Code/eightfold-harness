/**
 * Structural validation of an adaptation's `eightfold.json` manifest. The
 * manifest declares identity, the entry point, version compatibility, and the
 * permissions and dependencies an activation would need. A malformed manifest
 * throws with the offending path before the installer writes any file.
 *
 * @module @deepseek-ai/dsh-treasury/manifest
 */

import { asNumber, asRecord, asString, asStringArray } from './validate.ts'

/** The single supported manifest schema version. */
export const MANIFEST_SCHEMA_VERSION = 1

/** The compatibility key an adaptation uses to name the harness it targets. */
export const MANIFEST_COMPATIBILITY_KEY = 'harness'

/** A validated `eightfold.json` adaptation manifest. */
export interface EightfoldManifest {
  readonly schemaVersion: number
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description: string
  readonly entry: string
  readonly compatibility: Record<string, string>
  readonly permissions: readonly string[]
  readonly dependencies: readonly string[]
}

/**
 * Structurally validate a parsed manifest document.
 * @param value - the parsed manifest JSON, expected to be an object.
 * @returns the validated manifest.
 * @throws when any required field is missing, mistyped, or the schema version
 * is unsupported.
 */
export function parseManifest(value: unknown): EightfoldManifest {
  const record = asRecord(value, 'manifest')
  const schemaVersion = asNumber(record.schemaVersion, 'manifest.schemaVersion')
  if (schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(`treasury: unsupported manifest schemaVersion ${String(schemaVersion)}`)
  }
  const compatibility = asRecord(record.compatibility, 'manifest.compatibility')
  const compat: Record<string, string> = {}
  for (const [key, raw] of Object.entries(compatibility)) {
    compat[key] = asString(raw, `manifest.compatibility.${key}`)
  }
  return {
    schemaVersion,
    id: asString(record.id, 'manifest.id'),
    name: asString(record.name, 'manifest.name'),
    version: asString(record.version, 'manifest.version'),
    description: asString(record.description, 'manifest.description'),
    entry: asString(record.entry, 'manifest.entry'),
    compatibility: compat,
    permissions: asStringArray(record.permissions, 'manifest.permissions'),
    dependencies: asStringArray(record.dependencies, 'manifest.dependencies'),
  }
}
