/** Theme preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Built-in preferences accepted by the product Appearance row. */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

/** Settings namespace owned by the theme plugin. */
export const THEME_SETTINGS_NAMESPACE = 'ui-theme'

/** Field carrying the selected built-in theme preference. */
export const THEME_PREFERENCE_FIELD = 'preference'

/** A built-in preference or an installed extension theme id. */
export type BuiltInThemePreference = typeof THEME_PREFERENCES[number]
export type ThemePreference = BuiltInThemePreference | (string & {})

/** Default preference when the user-settings document has no override. */
export const DEFAULT_PREFERENCE: ThemePreference = 'system'

/** Durable theme section shared by the Host schema and the browser scope. */
export interface ThemeSettings {
  /** Selected built-in preference or installed extension theme id. */
  preference: ThemePreference
}

/** Durable theme schema; also the wire envelope the browser scope validates against. */
export const ThemeSettingsSchema: z<ThemeSettings> = z.object({
  [THEME_PREFERENCE_FIELD]: z.string().min(1).default(DEFAULT_PREFERENCE),
})

/**
 * Narrow one value to a built-in preference.
 * @param value - value crossing the settings or registry boundary.
 * @returns whether the value is a built-in preference.
 */
export function isThemePreference(value: unknown): value is BuiltInThemePreference {
  return THEME_PREFERENCES.some(preference => preference === value)
}
