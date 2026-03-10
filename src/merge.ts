import type { Plugin } from '@eslint/config-helpers'
import type { Linter } from 'eslint'

/**
 * Merge multiple flat configs into a single flat config.
 *
 * Note there is no guarantee that the result works the same as the original configs.
 */
export function mergeConfigs<T extends Linter.Config = Linter.Config>(...configs: T[]): T {
  const keys = new Set(configs.flatMap(i => Object.keys(i)))
  const merged = configs.reduce((acc, cur) => {
    return {
      ...acc,
      ...cur,
      files: [
        ...(acc.files || []),
        ...(cur.files || []),
      ],
      ignores: [
        ...(acc.ignores || []),
        ...(cur.ignores || []),
      ],
      plugins: {
        ...acc.plugins,
        ...cur.plugins,
      },
      rules: {
        ...acc.rules,
        ...cur.rules,
      },
      languageOptions: {
        ...acc.languageOptions,
        ...cur.languageOptions,
      },
      linterOptions: {
        ...acc.linterOptions,
        ...cur.linterOptions,
      },
    }
  }, {} as T)

  // Remove unused keys
  for (const key of Object.keys(merged)) {
    if (!keys.has(key))
      delete (merged as any)[key]
  }

  return merged as T
}

/**
 * Merge two or more plugins into one.
 *
 * Note there is no guarantee that the result works the same as the original plugins.
 *
 * Limitations:
 * - The resulting plugin will not have a `configs` property.
 * - In the case of conflicts, the last plugin will be used.
 */
export function mergePlugins(...plugins: readonly [Plugin, ...Plugin[]]): Plugin
export function mergePlugins(...plugins: readonly Plugin[]): Plugin | undefined
export function mergePlugins(...plugins: readonly Plugin[]): Plugin | undefined {
  const uniquePlugins = [...new Set(plugins)]
  if (uniquePlugins.length <= 1)
    return uniquePlugins[0]

  const shallowMergeInto = <T extends Record<string, any>>(a: T, b: T): T => Object.assign(a, b)

  const mergedPlugin: Plugin = {
    meta: {
      name: `merged plugin of [${uniquePlugins.map(p => p.meta?.name ?? p.name ?? 'unnamed').join(', ')}]`,
    },
  }

  const environments = new Set(uniquePlugins.map(p => p?.environments).filter(a => a !== undefined))
  if (environments.size > 0) {
    mergedPlugin.environments = [...environments].reduce(shallowMergeInto, {})
  }

  const languages = new Set(uniquePlugins.map(p => p?.languages).filter(a => a !== undefined))
  if (languages.size > 0) {
    mergedPlugin.languages = [...languages].reduce(shallowMergeInto, {})
  }

  const processors = new Set(uniquePlugins.map(p => p?.processors).filter(a => a !== undefined))
  if (processors.size > 0) {
    mergedPlugin.processors = [...processors].reduce(shallowMergeInto, {})
  }

  const rules = new Set(uniquePlugins.map(p => p?.rules).filter(a => a !== undefined))
  if (rules.size > 0) {
    mergedPlugin.rules = [...rules].reduce(shallowMergeInto, {})
  }

  return mergedPlugin
}
