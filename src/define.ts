import type { FlatConfigItem } from './types'

/**
 * A function that returns the config as-is, useful for providing type hints.
 */
export function defineFlatConfig(config: FlatConfigItem): FlatConfigItem {
  return config
}
