/**
 * Armoury registry transport: fetch the public skin registry JSON with a
 * timeout and positioned errors, unvalidated; `parseArmouryRegistry` owns
 * validation.
 *
 * @module @deepseek-ai/dsh-armoury/client
 */

import type { HttpFetch } from '@deepseek-ai/dsh-treasury'

/** Default location of the public Eightfold Armoury registry. */
export const ARMOURY_REGISTRY_URL
  = 'https://raw.githubusercontent.com/Eightfold-Code/eightfold-armoury/main/registry.json'

/** Environment variable that overrides the Armoury registry location. */
export const EIGHTFOLD_ARMOURY_URL_ENV = 'EIGHTFOLD_ARMOURY_URL'

/** Timeout for one registry fetch, in milliseconds. */
export const ARMOURY_FETCH_TIMEOUT_MS = 15_000

/**
 * Resolve the Armoury registry URL: `$EIGHTFOLD_ARMOURY_URL` when set and
 * non-blank, otherwise the public default.
 * @param env - environment mapping used to read the override.
 * @returns the registry URL.
 */
export function resolveArmouryRegistryUrl(env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env[EIGHTFOLD_ARMOURY_URL_ENV]
  const selected = fromEnv !== undefined && fromEnv.trim().length > 0 ? fromEnv : ARMOURY_REGISTRY_URL
  return selected
}

/**
 * Fetch the Armoury registry document. The response is parsed as JSON but not
 * validated; {@link parseArmouryRegistry} is the validation authority.
 * @param fetcher - fetch implementation.
 * @param url - the registry URL.
 * @param timeoutMs - request timeout in milliseconds.
 * @returns the parsed registry document.
 * @throws when the request fails, times out, returns a non-2xx status, or the
 * body is not valid JSON.
 */
export async function fetchArmouryRegistry(
  fetcher: HttpFetch = fetch,
  url = resolveArmouryRegistryUrl(),
  timeoutMs = ARMOURY_FETCH_TIMEOUT_MS,
): Promise<unknown> {
  let response: Response
  try {
    response = await fetcher(url, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`armoury: failed to fetch registry from ${url}: ${reason}`, { cause })
  }
  if (!response.ok) {
    throw new Error(`armoury: registry request to ${url} failed with HTTP ${response.status} ${response.statusText}`)
  }
  let text: string
  try {
    text = await response.text()
  } catch (cause) {
    throw new Error(`armoury: failed to read the registry body from ${url}`, { cause })
  }
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new Error(`armoury: registry at ${url} is not valid JSON`, { cause })
  }
}
