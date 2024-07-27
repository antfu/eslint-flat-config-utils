import type { Linter } from 'eslint'

/**
 * A function that returns the config as-is, useful for providing type hints.
 */
export function defineFlatConfig<T extends Linter.Config = Linter.Config>(config: T): T {
  return config
}
