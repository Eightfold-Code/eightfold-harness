/**
 * Structural validation of the installed skin package: the
 * `eightfold.skin.json` manifest and the `theme.json` entry it points at.
 * Token values live in referenced files, so both documents carry paths, not
 * resolved values.
 *
 * @module @deepseek-ai/dsh-armoury/skin
 */

import { asOptionalString, asRecord, asString, asStringArray } from '@deepseek-ai/dsh-treasury'

/** The single supported skin-document schema version. */
export const SKIN_SCHEMA_VERSION = '1.0'

/** The validated `eightfold.skin.json` manifest of one installed skin. */
export interface SkinManifest {
  readonly schemaVersion: string
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description: string
  /** The theme document path relative to the skin root. */
  readonly entry: string
  /** Named token-file paths relative to the skin root. */
  readonly tokens: Readonly<Record<string, string>>
  /** Preset-file paths relative to the skin root. */
  readonly presets: readonly string[]
  readonly compatibility: Record<string, string>
  readonly presentationOnly: boolean
}

/** The validated `theme.json` entry document of one installed skin. */
export interface SkinTheme {
  readonly schemaVersion: string
  readonly id: string
  /** Which base palette the skin builds on. */
  readonly mode: 'light' | 'dark'
  /** Named token-file paths relative to the skin root. */
  readonly tokens: Readonly<Record<string, string>>
  /** The preset-file path relative to the skin root. */
  readonly preset?: string
}

function parseStringRecord(value: unknown, path: string): Record<string, string> {
  const record = asRecord(value, path)
  const parsed: Record<string, string> = {}
  for (const [key, raw] of Object.entries(record)) {
    parsed[key] = asString(raw, `${path}.${key}`)
  }
  return parsed
}

/**
 * Structurally validate a parsed `eightfold.skin.json` manifest.
 * @param value - the parsed manifest JSON, expected to be an object.
 * @returns the validated manifest.
 * @throws when any required field is missing, mistyped, or the schema version
 * is unsupported.
 */
export function parseSkinManifest(value: unknown): SkinManifest {
  const record = asRecord(value, 'skin')
  const schemaVersion = asString(record.schemaVersion, 'skin.schemaVersion')
  if (schemaVersion !== SKIN_SCHEMA_VERSION) {
    throw new Error(`armoury: unsupported skin schemaVersion ${JSON.stringify(schemaVersion)}`)
  }
  const tokens = record.tokens === undefined ? {} : parseStringRecord(record.tokens, 'skin.tokens')
  const presets = record.presets === undefined ? [] : asStringArray(record.presets, 'skin.presets')
  if (record.presentationOnly !== undefined && typeof record.presentationOnly !== 'boolean') {
    throw new Error('armoury: skin.presentationOnly must be a boolean')
  }
  const compatibility = asRecord(record.compatibility, 'skin.compatibility')
  const parsedCompatibility: Record<string, string> = {}
  for (const [key, raw] of Object.entries(compatibility)) {
    parsedCompatibility[key] = asString(raw, `skin.compatibility.${key}`)
  }
  return {
    schemaVersion,
    id: asString(record.id, 'skin.id'),
    name: asString(record.name, 'skin.name'),
    version: asString(record.version, 'skin.version'),
    description: asString(record.description, 'skin.description'),
    entry: asString(record.entry, 'skin.entry'),
    tokens,
    presets,
    compatibility: parsedCompatibility,
    presentationOnly: record.presentationOnly !== false,
  }
}

/**
 * Structurally validate a parsed `theme.json` entry document.
 * @param value - the parsed theme JSON, expected to be an object.
 * @returns the validated theme.
 * @throws when any required field is missing, mistyped, or the mode is
 * neither `light` nor `dark`.
 */
export function parseSkinTheme(value: unknown): SkinTheme {
  const record = asRecord(value, 'theme')
  const schemaVersion = asString(record.schemaVersion, 'theme.schemaVersion')
  if (schemaVersion !== SKIN_SCHEMA_VERSION) {
    throw new Error(`armoury: unsupported theme schemaVersion ${JSON.stringify(schemaVersion)}`)
  }
  const mode = asString(record.mode, 'theme.mode')
  if (mode !== 'light' && mode !== 'dark') {
    throw new Error(`armoury: theme.mode must be "light" or "dark", got ${JSON.stringify(mode)}`)
  }
  const preset = asOptionalString(record.preset, 'theme.preset')
  return {
    schemaVersion,
    id: asString(record.id, 'theme.id'),
    mode,
    tokens: parseStringRecord(record.tokens, 'theme.tokens'),
    ...(preset === undefined ? {} : { preset }),
  }
}
