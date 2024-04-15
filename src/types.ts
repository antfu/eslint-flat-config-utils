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

/**
 * Default config names map. Used for type augmentation.
 *
 * @example
 * ```ts
 * declare module 'eslint-flat-config-utils' {
 *   interface DefaultConfigNamesMap {
 *     'my-custom-config': true
 *   }
 * }
 * ```
 */
export interface DefaultConfigNamesMap {}

interface Nothing { }

/**
 * type StringLiteralUnion<'foo'> = 'foo' | string
 * This has auto completion whereas `'foo' | string` doesn't
 * Adapted from https://github.com/microsoft/TypeScript/issues/29729
 */
export type StringLiteralUnion<T extends U, U = string> = T | (U & Nothing)

export type FilterType<T, F> = T extends F ? T : never

export type NullableObject<T> = {
  [K in keyof T]?: T[K] | null | undefined
}

export type GetRuleRecordFromConfig<T> = T extends { rules?: infer R } ? R : Linter.RulesRecord
