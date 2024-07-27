import type { Linter } from 'eslint'
import type { Awaitable } from './types'

/**
 * Extend another flat configs and rename globs paths.
 *
 * @example
 * ```ts
 * import { extend } from 'eslint-flat-config-utils'
 *
 * export default [
 *   ...await extend(
 *     // configs to extend
 *     import('./other-configs/eslint.config.js').then(m => m.default),
 *     // relative directory path
 *     'other-configs/',
 *   ),
 * ]
 * ```
 */
export async function extend(
  configs: Awaitable<Linter.Config[]>,
  relativePath: string,
): Promise<Linter.Config[]> {
  const { join } = await import('pathe')
  const resolved = await configs

  // same directory, no need to rename, return as is
  if (relativePath === '')
    return resolved

  function renameGlobs(i: string): string {
    if (typeof i !== 'string')
      return i
    if (i.startsWith('!'))
      return `!${join(relativePath, i.slice(1))}`
    return join(relativePath, i)
  }

  return resolved.map((i) => {
    if (!i || (!i.files && !i.ignores))
      return i
    const clone = { ...i }
    if (clone.files) {
      clone.files = clone.files.map(
        f => Array.isArray(f)
          ? f.map(t => renameGlobs(t))
          : renameGlobs(f),
      )
    }
    if (clone.ignores) {
      clone.ignores = clone.ignores.map(
        f => renameGlobs(f),
      )
    }
    return clone
  })
}
