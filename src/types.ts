import type { Linter } from 'eslint'

/**
 * Extended ESLint flat config item with a name field.
 *
 * @see https://github.com/eslint/eslint/issues/18231
 */
export interface FlatConfigItem extends Linter.FlatConfig {
  name?: string
}

/**
 * A type that can be awaited. Promise<T> or T.
 */
export type Awaitable<T> = T | Promise<T>

/**
 * A type that can be an array or a single item.
 */
export type Arrayable<T> = T | T[]
