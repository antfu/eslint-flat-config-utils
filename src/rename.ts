import type { Plugin } from '@eslint/config-helpers'
import type { Linter } from 'eslint'

/**
 * Rename plugin prefixes in a rule object.
 * Accepts a map of prefixes to rename.
 *
 * @example
 * ```ts
 * import { renamePluginsInRules } from 'eslint-flat-config-utils'
 *
 * export default [{
 *   rules: renamePluginsInRules(
 *     {
 *       '@typescript-eslint/indent': 'error'
 *     },
 *     { '@typescript-eslint': 'ts' }
 *   )
 * }]
 * ```
 */
export function renamePluginsInRules(rules: Record<string, any>, map: Record<string, string>): Record<string, any> {
  const entries = Object.entries(map).sort(([a], [b]) => b.length - a.length)

  return Object.fromEntries(
    Object.entries(rules)
      .map(([key, value]) => {
        for (const [from, to] of entries) {
          if (key.startsWith(`${from}/`))
            return [to + key.slice(from.length), value]
        }
        return [key, value]
      }),
  )
}

/**
 * Rename plugin names a flat configs array
 *
 * @example
 * ```ts
 * import { renamePluginsInConfigs } from 'eslint-flat-config-utils'
 * import someConfigs from './some-configs'
 *
 * export default renamePluginsInConfigs(someConfigs, {
 *   '@typescript-eslint': 'ts',
 *   'import-x': 'import',
 * })
 * ```
 */
export function renamePluginsInConfigs<T extends Linter.Config = Linter.Config>(configs: T[], map: Record<string, string>): T[] {
  return configs.map((i) => {
    const clone = { ...i }
    if (clone.rules)
      clone.rules = renamePluginsInRules(clone.rules, map)
    if (clone.plugins) {
      const renamed: [string, Plugin][] = Object.entries(clone.plugins)
        .map(([key, value]) => {
          if (key in map)
            return [map[key], value]
          return [key, value]
        })
      for (const [key, values] of Object.entries(Object.groupBy(renamed, ([key]) => key))) {
        if (values!.length > 1)
          console.warn(`ESLintFlatConfigUtils: Trying to rename multiple plugins to the name "${key}", using the last one`)
      }
      clone.plugins = Object.fromEntries(renamed)
    }
    return clone
  })
}
