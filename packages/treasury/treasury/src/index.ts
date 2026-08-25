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
