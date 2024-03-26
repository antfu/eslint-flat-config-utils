import type { Linter } from 'eslint'

export interface FlatConfigItem extends Linter.FlatConfig {
  name?: string
}

export type Awaitable<T> = T | Promise<T>
