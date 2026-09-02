/**
 * @deepseek-ai/dsh-armoury — Eightfold Armoury distribution layer.
 *
 * The Armoury client fetches the public skin registry, the registry and skin
 * parsers structurally validate the documents, and the installer installs
 * skins under the Eightfold home.
 *
 * @module @deepseek-ai/dsh-armoury
 */

export {
  ARMOURY_FETCH_TIMEOUT_MS,
  ARMOURY_REGISTRY_URL,
  EIGHTFOLD_ARMOURY_URL_ENV,
  fetchArmouryRegistry,
  resolveArmouryRegistryUrl,
} from './client.ts'
export {
  DEFAULT_SKIN_MANIFEST,
  REGISTRY_SCHEMA_VERSION,
  parseArmouryRegistry,
  type ArmouryRegistry,
  type SkinDescriptor,
  type SkinSource,
} from './registry.ts'
export {
  SKIN_SCHEMA_VERSION,
  parseSkinManifest,
  parseSkinTheme,
  type SkinManifest,
  type SkinTheme,
} from './skin.ts'
export { SKIN_COLOR_ALIASES, resolveSkinTheme, type ResolvedSkin } from './theme.ts'
export {
  INSTALLED_SKINS_SCHEMA_VERSION,
  installSkin,
  installedSkinsPath,
  readInstalledSkins,
  removeSkin,
  resolveSkinCommit,
  skinsDirectory,
  writeInstalledSkins,
  type InstalledSkin,
  type InstalledSkinsState,
} from './installer.ts'
export { resolveEightfoldHome } from '@deepseek-ai/dsh-treasury'
