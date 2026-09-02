/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-marketplace`.
 * @module @deepseek-ai/dsh-marketplace/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-marketplace'

/** Cordis companion plugin name. */
export const name = 'marketplace-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the service projects registry and installed-state
 * documents on every call and holds no long-lived state; the Remote failure
 * classification is exercised through the generated wire contracts.
 */
const install: InvariantInstaller = Object.assign(() => {}, { inject: ['marketplace'] })

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
