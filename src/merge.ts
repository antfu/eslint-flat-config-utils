import type { FlatConfigItem } from './types'

/**
 * Merge multiple flat configs into a single flat config.
 *
 * Note there is no guarantee that the result works the same as the original configs.
 */

export function mergeConfigs(...configs: FlatConfigItem[]): FlatConfigItem {
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
  }, {} as FlatConfigItem)

  // Remove unused keys
  for (const key of keys) {
    if (!keys.has(key))
      delete (merged as any)[key]
  }

  return merged
}
