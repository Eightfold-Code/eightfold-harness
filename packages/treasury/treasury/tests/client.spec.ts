import { describe, expect, it } from 'vitest'
import {
  EIGHTFOLD_TREASURY_URL_ENV,
  TREASURY_REGISTRY_URL,
  fetchRegistry,
  resolveRegistryUrl,
  type HttpFetch,
} from '../src/client.ts'

/** A fake Response-like object for the transport tests. */
function responseOf(body: string, status = 200): Response {
  return new Response(body, { status, statusText: status === 200 ? 'OK' : 'Nope' })
}

const fetcherOf = (result: Response | Error): HttpFetch =>
  async () => {
    if (result instanceof Error) throw result
    return result
  }

describe('resolveRegistryUrl', () => {
  it('defaults to the public registry and honors a non-blank override', () => {
    expect(resolveRegistryUrl({})).toBe(TREASURY_REGISTRY_URL)
    expect(resolveRegistryUrl({ [EIGHTFOLD_TREASURY_URL_ENV]: 'https://example.test/registry.json' }))
      .toBe('https://example.test/registry.json')
    expect(resolveRegistryUrl({ [EIGHTFOLD_TREASURY_URL_ENV]: '   ' })).toBe(TREASURY_REGISTRY_URL)
  })
})

describe('fetchRegistry', () => {
  it('returns the parsed JSON body', async () => {
    const fetched = await fetchRegistry(fetcherOf(responseOf('{"schemaVersion":1,"adaptations":{}}')))
    expect(fetched).toEqual({ schemaVersion: 1, adaptations: {} })
  })

  it('throws with the URL on a network failure', async () => {
    await expect(fetchRegistry(fetcherOf(new Error('boom')), 'https://example.test/r.json'))
      .rejects.toThrow('failed to fetch registry from https://example.test/r.json: boom')
    await expect(fetchRegistry(fetcherOf(new Error('boom')), 'https://example.test/r.json'))
      .rejects.toThrow('boom')
  })

  it('throws with the HTTP status on a non-2xx response', async () => {
    await expect(fetchRegistry(fetcherOf(responseOf('nope', 404)), 'https://example.test/r.json'))
      .rejects.toThrow('failed with HTTP 404 Nope')
  })

  it('throws when the body is not valid JSON', async () => {
    await expect(fetchRegistry(fetcherOf(responseOf('<html>')), 'https://example.test/r.json'))
      .rejects.toThrow('not valid JSON')
  })
})
