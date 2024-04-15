import type { Linter } from 'eslint'

/**
 * A function that returns the config as-is, useful for providing type hints.
 */
export function defineFlatConfig<T extends Linter.FlatConfig = Linter.FlatConfig>(config: T): T {
  return config
}
