/**
 * Treasury registry transport: fetch the registry JSON with a timeout and
 * clear, positioned errors. Parsing and validation live in `registry.ts`;
 * this module only performs the HTTP round trip.
 *
 * @module @deepseek-ai/dsh-treasury/client
 */

/** Default location of the public Eightfold Treasury registry. */
export const TREASURY_REGISTRY_URL =
  'https://raw.githubusercontent.com/Eightfold-Code/eightfold-treasury/main/registry.json'

/** Environment variable that overrides the default Treasury registry URL. */
export const EIGHTFOLD_TREASURY_URL_ENV = 'EIGHTFOLD_TREASURY_URL'

/** Default timeout for registry and archive downloads, in milliseconds. */
export const TREASURY_FETCH_TIMEOUT_MS = 15_000

/** Fetch implementation compatible with the global `fetch` used by Node. */
export type HttpFetch = typeof fetch

/**
 * Resolve the Treasury registry URL, honoring `$EIGHTFOLD_TREASURY_URL` over
 * the default. A blank override is treated as unset.
 * @param env - environment mapping used to read the override.
 * @returns the registry URL to fetch.
 */
export function resolveRegistryUrl(env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env[EIGHTFOLD_TREASURY_URL_ENV]
  if (fromEnv !== undefined && fromEnv.trim().length > 0) return fromEnv
  return TREASURY_REGISTRY_URL
}

/**
 * Fetch and JSON-parse the Treasury registry.
 * @param fetcher - fetch implementation (defaults to the global `fetch`).
 * @param url - registry URL (defaults to {@link resolveRegistryUrl}).
 * @param timeoutMs - abort timeout for the request.
 * @returns the parsed registry JSON, unvalidated.
 * @throws when the request fails, times out, returns a non-2xx status, or the
 * body is not valid JSON.
 */
export async function fetchRegistry(
  fetcher: HttpFetch = fetch,
  url = resolveRegistryUrl(),
  timeoutMs = TREASURY_FETCH_TIMEOUT_MS,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`treasury: failed to fetch registry from ${url}: ${reason}`, { cause })
  }
  if (!response.ok) {
    throw new Error(`treasury: registry request to ${url} failed with HTTP ${response.status} ${response.statusText}`)
  }
  let text: string
  try {
    text = await response.text()
  } catch (cause) {
    throw new Error(`treasury: failed to read the registry body from ${url}`, { cause })
  }
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new Error(`treasury: registry at ${url} is not valid JSON`, { cause })
  }
}
