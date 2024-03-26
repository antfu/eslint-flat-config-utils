import type { Awaitable, FlatConfigItem } from './types'

/**
 * Concat multiple flat configs into a single flat config array.
 *
 * It also resolves promises and flattens the result.
 *
 * @example
 *
 * ```ts
 * import { concat } from 'eslint-flat-config-utils'
 * import eslint from '@eslint/js'
 * import stylistic from '@stylistic/eslint-plugin'
 *
 * export default concat(
 *   eslint,
 *   stylistic.configs.customize(),
 *   { rules: { 'no-console': 'off' } },
 *   // ...
 * )
 * ```
 */
export async function concat<T extends FlatConfigItem = FlatConfigItem>(...configs: Awaitable<T | T[]>[]): Promise<T[]> {
  const resolved = await Promise.all(configs)
  return resolved.flat() as T[]
}
