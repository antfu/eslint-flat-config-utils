import type { Awaitable, FlatConfigItem } from './types'
import { renamePluginsInConfigs } from './rename'
import { mergeConfigs } from './merge'

/**
 * Create a pipeline to build a flat config.
 *
 * @example
 *
 * ```ts
 * import { pipe } from 'eslint-flat-config-utils'
 *
 * export pipe(
 *   // ...flat configs
 * )
 *   .prepend(
 *     // ...flat configs
 *   )
 *   .insetAfter('some-config',
 *     // ...flat configs
 *   )
 *   .override('some-config', {
 *     rules: {
 *      'no-console': 'off',
 *     }
 *   })
 *   .setRenames({
 *     'n': 'node',
 *     'import-x': 'import',
 *     '@typescript-eslint': 'ts'
 *   })
 * ```
 */
export function pipe(...configs: Awaitable<FlatConfigItem | FlatConfigItem[]>[]) {
  return new FlatConfigPipeline().append(...configs)
}

export class FlatConfigPipeline<T extends FlatConfigItem = FlatConfigItem> extends Promise<T[]> {
  private _promises: ((items: T[]) => Promise<T[]>)[] = []
  private _renames: Record<string, string> = {}

  constructor() {
    super(() => {})
  }

  public setRenames(renames: Record<string, string>) {
    Object.assign(this._renames, renames)
    return this
  }

  public getRenames() {
    return this._renames
  }

  public append(...items: Awaitable<T | T[]>[]) {
    this._promises.push(async (configs) => {
      const resolved = (await Promise.all(items)).flat() as T[]
      return [...configs, ...resolved]
    })
    return this
  }

  public prepend(...items: Awaitable<T | T[]>[]) {
    this._promises.push(async (configs) => {
      const resolved = (await Promise.all(items)).flat() as T[]
      return [...resolved, ...configs]
    })
    return this
  }

  public insertBefore(name: string, ...items: Awaitable<T | T[]>[]) {
    this._promises.push(async (configs) => {
      const resolved = (await Promise.all(items)).flat() as T[]
      const index = configs.findIndex(config => config.name === name)
      if (index === -1)
        throw new Error(`Cannot find config with name "${name}"`)
      configs.splice(index, 0, ...resolved)
      return configs
    })
    return this
  }

  public insertAfter(name: string, ...items: Awaitable<T | T[]>[]) {
    this._promises.push(async (configs) => {
      const resolved = (await Promise.all(items)).flat() as T[]
      const index = configs.findIndex(config => config.name === name)
      if (index === -1)
        throw new Error(`Cannot find config with name "${name}"`)
      configs.splice(index + 1, 0, ...resolved)
      return configs
    })
    return this
  }

  public override(name: string, config: T | ((config: T) => Awaitable<T>)) {
    this._promises.push(async (configs) => {
      const index = configs.findIndex(config => config.name === name)
      if (index === -1)
        throw new Error(`Cannot find config with name "${name}"`)
      const extended = typeof config === 'function'
        ? await config(configs[index])
        : mergeConfigs(configs[index], config) as T
      configs.splice(index, 1, extended)
      return configs
    })
    return this
  }

  public overrides(overrides: Record<string, T | ((config: T) => Awaitable<T>)>) {
    for (const [name, config] of Object.entries(overrides))
      this.override(name, config)
    return this
  }

  public async toConfigs(): Promise<T[]> {
    let configs: T[] = []
    for (const promise of this._promises)
      configs = await promise(configs)

    configs = renamePluginsInConfigs(configs, this._renames) as T[]
    return configs
  }

  then(onFulfilled: (value: T[]) => any, onRejected?: (reason: any) => any) {
    return this.toConfigs()
      .then(onFulfilled, onRejected)
  }

  catch(onRejected: (reason: any) => any) {
    return this.toConfigs().catch(onRejected)
  }

  finally(onFinally: () => any) {
    return this.toConfigs().finally(onFinally)
  }
}
