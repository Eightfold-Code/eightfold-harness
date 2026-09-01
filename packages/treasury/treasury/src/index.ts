/**
 * @deepseek-ai/dsh-treasury — Eightfold Treasury distribution layer.
 *
 * The Treasury client fetches the public registry and the registry parser
 * structurally validates the registry document.
 *
 * @module @deepseek-ai/dsh-treasury
 */

export {
  EIGHTFOLD_TREASURY_URL_ENV,
  TREASURY_FETCH_TIMEOUT_MS,
  TREASURY_REGISTRY_URL,
  fetchRegistry,
  resolveRegistryUrl,
  type HttpFetch,
} from './client.ts'
export {
  ADAPTATION_COMPATIBILITY_KEY,
  REGISTRY_SCHEMA_VERSION,
  isCompatible,
  parseRegistry,
  type AdaptationDescriptor,
  type AdaptationSource,
  type TreasuryRegistry,
} from './registry.ts'
export {
  MANIFEST_COMPATIBILITY_KEY,
  MANIFEST_SCHEMA_VERSION,
  parseManifest,
  type EightfoldManifest,
} from './manifest.ts'
export {
  EIGHTFOLD_HOME_DIR_NAME,
  EIGHTFOLD_HOME_ENV,
  GIT_LS_REMOTE_TIMEOUT_MS,
  INSTALLED_STATE_SCHEMA_VERSION,
  adaptationsDirectory,
  defaultInstallerIo,
  downloadBytes,
  extractPlanned,
  installAdaptation,
  installedStatePath,
  planExtraction,
  readInstalledState,
  removeAdaptation,
  resolveCommit,
  resolveEightfoldHome,
  writeInstalledState,
  type InstallerIo,
  type InstalledAdaptation,
  type InstalledSource,
  type InstalledState,
} from './installer.ts'
export {
  decompressTarGz,
  parseTarArchive,
  type TarEntry,
} from './tar.ts'
