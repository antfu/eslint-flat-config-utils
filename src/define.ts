import type { FlatConfigItem } from './types'

/**
 * A function that returns the config as-is, useful for providing type hints.
 */
export function defineFlatConfig<T extends FlatConfigItem = FlatConfigItem>(config: T): T {
  return config
}
