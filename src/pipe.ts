import type { Arrayable } from 'vitest'
import type { Awaitable, FlatConfigItem } from './types'
import { renamePluginsInConfigs } from './rename'
import { mergeConfigs } from './merge'

/**
 * Create a chainable pipeline object that makes manipulating ESLint flat config easier.
 *
 * It extends Promise, so that you can directly await or export it to `eslint.config.mjs`
 *
 * ```ts
 * // eslint.config.mjs
 * import { pipe } from 'eslint-flat-config-utils'
 *
 * export default pipe(
 *   {
 *     plugins: {},
 *     rules: {},
 *   }
 *   // ...some configs, accepts same arguments as `concat`
 * )
 *   .append(
 *     // appends more configs at the end, accepts same arguments as `concat`
 *   )
 *   .prepend(
 *     // prepends more configs at the beginning, accepts same arguments as `concat`
 *   )
 *   .insertAfter(
 *     'config-name', // specify the name of the target config, or index
 *     // insert more configs after the target, accepts same arguments as `concat`
 *   )
 *   .renamePlugins({
 *     // rename plugins
 *     'old-name': 'new-name',
 *     // for example, rename `n` from `eslint-plugin-n` to more a explicit prefix `node`
 *     'n': 'node'
 *     // applies to all plugins and rules in the configs
 *   })
 *   .override(
 *     'config-name', // specify the name of the target config, or index
 *     {
 *       // merge with the target config
 *       rules: {
 *         'no-console': 'off'
 *       },
 *     }
 *   )
 *
 * // And you an directly return the pipeline object to `eslint.config.mjs`
 * ```
 */
export function pipe<T extends FlatConfigItem = FlatConfigItem>(
  ...configs: Awaitable<Arrayable<FlatConfigItem extends T ? T : FlatConfigItem>>[]
): FlatConfigPipeline<FlatConfigItem extends T ? T : FlatConfigItem> {
  return new FlatConfigPipeline().append(...configs) as any
}

/**
 * The underlying impolementation of `pipe()`.
 *
 * You don't need to use this class directly.
 */
export class FlatConfigPipeline<T extends object = FlatConfigItem> extends Promise<T[]> {
  private _operations: ((items: T[]) => Promise<T[]>)[] = []
  private _operationsPost: ((items: T[]) => Promise<T[]>)[] = []
  private _renames: Record<string, string> = {}

  constructor() {
    super(() => {})
  }

  /**
   * Set plugin renames, like `n` -> `node`, `import-x` -> `import`, etc.
   *
   * This will runs after all config items are resolved. Applies to `plugins` and `rules`.
   */
  public renamePlugins(renames: Record<string, string>): this {
    Object.assign(this._renames, renames)
    return this
  }

  /**
   * Append configs to the end of the current configs array.
   */
  public append(...items: Awaitable<T | T[]>[]): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat() as T[]
      return [...configs, ...resolved]
    })
    return this
  }

  /**
   * Prepend configs to the beginning of the current configs array.
   */
  public prepend(...items: Awaitable<T | T[]>[]): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat() as T[]
      return [...resolved, ...configs]
    })
    return this
  }

  /**
   * Insert configs before a specific config.
   */
  public insertBefore(nameOrIndex: string | number, ...items: Awaitable<T | T[]>[]): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat() as T[]
      const index = getConfigIndex(configs, nameOrIndex)
      configs.splice(index, 0, ...resolved)
      return configs
    })
    return this
  }

  /**
   * Insert configs after a specific config.
   */
  public insertAfter(nameOrIndex: string | number, ...items: Awaitable<T | T[]>[]): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat() as T[]
      const index = getConfigIndex(configs, nameOrIndex)
      configs.splice(index + 1, 0, ...resolved)
      return configs
    })
    return this
  }

  /**
   * Provide overrides to a specific config.
   *
   * It will be merged with the original config, or provide a custom function to replace the config entirely.
   */
  public override(nameOrIndex: string | number, config: T | ((config: T) => Awaitable<T>)): this {
    this._operationsPost.push(async (configs) => {
      const index = getConfigIndex(configs, nameOrIndex)
      const extended = typeof config === 'function'
        ? await config(configs[index])
        : mergeConfigs(configs[index], config) as T
      configs.splice(index, 1, extended)
      return configs
    })
    return this
  }

  /**
   * Provide overrides to multiple configs as an object map.
   *
   * Same as calling `override` multiple times.
   */
  public overrides(overrides: Record<string | number, T | ((config: T) => Awaitable<T>)>): this {
    for (const [name, config] of Object.entries(overrides))
      this.override(name, config)
    return this
  }

  /**
   * Resolve the pipeline and return the final configs.
   *
   * This returns a promise. Calling `.then()` has the same effect.
   */
  public async toConfigs(): Promise<T[]> {
    let configs: T[] = []
    for (const promise of this._operations)
      configs = await promise(configs)
    for (const promise of this._operationsPost)
      configs = await promise(configs)

    configs = renamePluginsInConfigs(configs, this._renames) as T[]
    return configs
  }

  // eslint-disable-next-line ts/explicit-function-return-type
  then(onFulfilled: (value: T[]) => any, onRejected?: (reason: any) => any) {
    return this.toConfigs()
      .then(onFulfilled, onRejected)
  }

  // eslint-disable-next-line ts/explicit-function-return-type
  catch(onRejected: (reason: any) => any) {
    return this.toConfigs().catch(onRejected)
  }

  // eslint-disable-next-line ts/explicit-function-return-type
  finally(onFinally: () => any) {
    return this.toConfigs().finally(onFinally)
  }
}

function getConfigIndex(configs: FlatConfigItem[], nameOrIndex: string | number): number {
  if (typeof nameOrIndex === 'number') {
    if (nameOrIndex < 0 || nameOrIndex >= configs.length)
      throw new Error(`ESLintFlatConfigUtils: Failed to locate config at index ${nameOrIndex}\n(${configs.length} configs in total)`)
    return nameOrIndex
  }
  else {
    const index = configs.findIndex(config => config.name === nameOrIndex)
    if (index === -1) {
      const named = configs.map(config => config.name).filter(Boolean)
      const countUnnamed = configs.length - named.length
      const messages = [
        `Failed to locate config with name "${nameOrIndex}"`,
        `Available names are: ${named.join(', ')}`,
        countUnnamed ? `(${countUnnamed} unnamed configs)` : '',
      ].filter(Boolean).join('\n')
      throw new Error(`ESLintFlatConfigUtils: ${messages}`)
    }
    return index
  }
}
