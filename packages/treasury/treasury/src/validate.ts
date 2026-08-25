/**
 * Structural validation helpers shared by the Treasury registry and
 * adaptation manifest parsers.
 *
 * @module @deepseek-ai/dsh-treasury/validate
 */

/** Return a plain object or throw a positioned structural error. */
export function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`treasury: ${path} must be an object`)
  }
  return value as Record<string, unknown>
}

/** Return a required string field or throw a positioned structural error. */
export function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new Error(`treasury: ${path} must be a string`)
  }
  return value
}

/** Return a required number field or throw a positioned structural error. */
export function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`treasury: ${path} must be a number`)
  }
  return value
}

/** Return an optional string field; `undefined` and absent both pass. */
export function asOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined
  return asString(value, path)
}

/** Return a required string-array field or throw a positioned structural error. */
export function asStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`treasury: ${path} must be an array of strings`)
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`treasury: ${path} must be an array of strings`)
    }
  }
  return value as string[]
}
