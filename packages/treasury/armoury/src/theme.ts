/**
 * Skin theme resolution: read the referenced token documents of an installed
 * skin and map its primitive color vocabulary onto the harness client's
 * `--dsw-alias-*` override variables, producing the token dictionary a theme
 * registry consumes.
 *
 * @module @deepseek-ai/dsh-armoury/theme
 */

import { readFile } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { asRecord, asString } from '@deepseek-ai/dsh-treasury'
import { parseSkinTheme, type SkinManifest } from './skin.ts'

/**
 * One Armoury color primitive mapped onto the client alias variables it
 * overrides. Unlisted primitives resolve to nothing; a skin may carry a
 * vocabulary this mapping does not know.
 */
export const SKIN_COLOR_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  background: ['--dsw-alias-bg-base'],
  surface: ['--dsw-alias-bg-layer-1'],
  surfaceElevated: ['--dsw-alias-bg-layer-2'],
  surfaceMuted: ['--dsw-alias-bg-layer-3', '--dsw-alias-interactive-bg-hover'],
  text: ['--dsw-alias-label-primary'],
  textMuted: ['--dsw-alias-label-secondary'],
  textSubtle: ['--dsw-alias-label-tertiary', '--dsw-alias-label-caption'],
  border: ['--dsw-alias-border-l1', '--dsw-alias-border-l2'],
  borderStrong: ['--dsw-alias-border-l3'],
  accent: ['--dsw-alias-brand-primary'],
  accentStrong: ['--dsw-alias-button-primary-hover'],
  accentContrast: ['--dsw-alias-brand-text'],
  success: ['--dsw-alias-state-success-primary'],
  warning: ['--dsw-alias-state-warn-primary'],
  danger: ['--dsw-alias-state-error-primary'],
})

/** One skin resolved into client theme vocabulary. */
export interface ResolvedSkin {
  /** The skin id. */
  readonly id: string
  /** The skin display name. */
  readonly name: string
  /** Which base palette the resolved tokens build on. */
  readonly colorScheme: 'light' | 'dark'
  /** Client alias-variable overrides keyed by variable name. */
  readonly tokens: Readonly<Record<string, string>>
}

/** Validate one token-file path as relative and contained in the skin root. */
function containedSkinPath(skinDirectory: string, relative: string, path: string): string {
  if (relative.length === 0 || isAbsolute(relative) || relative.includes('\\') || relative.includes(':')) {
    throw new Error(`armoury: ${path} must be a relative POSIX path`)
  }
  const target = resolve(join(skinDirectory, relative))
  const root = resolve(skinDirectory)
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`armoury: ${path} escapes the skin directory`)
  }
  return target
}

/** Read and validate one token document, returning its primitive color record. */
async function readColorTokens(file: string, path: string): Promise<Record<string, string>> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(file, 'utf8')) as unknown
  } catch (cause) {
    throw new Error(`armoury: ${path} is missing or is not valid JSON`, { cause })
  }
  const record = asRecord(parsed, path)
  const colors = asRecord(record.colors, `${path}.colors`)
  const tokens: Record<string, string> = {}
  for (const [primitive, raw] of Object.entries(colors)) {
    tokens[primitive] = asString(raw, `${path}.colors.${primitive}`)
  }
  return tokens
}

/**
 * Resolve one installed skin into client theme vocabulary: read the manifest
 * entry document, read every referenced token document, and map the color
 * primitives onto client alias variables.
 * @param skinDirectory - the installed skin root directory.
 * @param manifest - the validated skin manifest.
 * @returns the resolved skin.
 * @throws when the entry document or a referenced token document is missing,
 * malformed, or escapes the skin directory.
 */
export async function resolveSkinTheme(skinDirectory: string, manifest: SkinManifest): Promise<ResolvedSkin> {
  const entryFile = containedSkinPath(skinDirectory, manifest.entry, 'skin.entry')
  let text: string
  try {
    text = await readFile(entryFile, 'utf8')
  } catch (cause) {
    throw new Error(`armoury: skin entry ${JSON.stringify(manifest.entry)} is missing or unreadable`, { cause })
  }
  let theme
  try {
    theme = parseSkinTheme(JSON.parse(text) as unknown)
  } catch (cause) {
    throw new Error(`armoury: skin entry ${JSON.stringify(manifest.entry)} is not a valid theme document`, { cause })
  }
  const tokens: Record<string, string> = {}
  for (const [group, relative] of Object.entries(theme.tokens)) {
    // Only the color group carries client-mappable values; other groups are
    // deferred vocabulary.
    if (group !== 'colors') continue
    const file = containedSkinPath(skinDirectory, relative, `theme.tokens.${group}`)
    const colors = await readColorTokens(file, `theme.tokens.${group}`)
    for (const [primitive, value] of Object.entries(colors)) {
      for (const alias of SKIN_COLOR_ALIASES[primitive] ?? []) {
        tokens[alias] = value
      }
    }
  }
  return {
    id: manifest.id,
    name: manifest.name,
    colorScheme: theme.mode,
    tokens: Object.freeze(tokens),
  }
}
