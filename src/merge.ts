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
