import type { Linter } from 'eslint'
import type { Arrayable, Awaitable, DefaultConfigNamesMap, FilterType, GetRuleRecordFromConfig, NullableObject, StringLiteralUnion } from './types'
import { renamePluginsInConfigs } from './rename'
import { mergeConfigs } from './merge'

/**
 * Awaitable array of ESLint flat configs or a composer object.
 */
export type ResolvableFlatConfig<T extends Linter.FlatConfig = Linter.FlatConfig> =
  | Awaitable<Arrayable<(T | false | undefined | null)>>
  | Awaitable<(Linter.FlatConfig | false | undefined | null)[]>
  | FlatConfigComposer<any>

/**
 * Create a chainable composer object that makes manipulating ESLint flat config easier.
 *
 * It extends Promise, so that you can directly await or export it to `eslint.config.mjs`
 *
 * ```ts
 * // eslint.config.mjs
 * import { composer } from 'eslint-flat-config-utils'
 *
 * export default composer(
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
 * // And you an directly return the composer object to `eslint.config.mjs`
 * ```
 */
export function composer<
  T extends Linter.FlatConfig = Linter.FlatConfig,
  ConfigNames extends string = keyof DefaultConfigNamesMap,
>(
  ...configs: ResolvableFlatConfig<Linter.FlatConfig extends T ? T : Linter.FlatConfig>[]
): FlatConfigComposer<Linter.FlatConfig extends T ? T : Linter.FlatConfig, ConfigNames> {
  return new FlatConfigComposer(
    ...configs,
  )
}

/**
 * The underlying impolementation of `composer()`.
 */
export class FlatConfigComposer<
  T extends object = Linter.FlatConfig,
  ConfigNames extends string = keyof DefaultConfigNamesMap,
> extends Promise<T[]> {
  private _operations: ((items: T[]) => Promise<T[]>)[] = []
  private _operationsOverrides: ((items: T[]) => Promise<T[]>)[] = []
  private _operationsResolved: ((items: T[]) => Awaitable<T[] | void>)[] = []
  private _renames: Record<string, string> = {}

  constructor(
    ...configs: ResolvableFlatConfig<T>[]
  ) {
    super(() => {})

    if (configs.length)
      this.append(...configs)
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
  public append(...items: ResolvableFlatConfig<T>[]): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat().filter(Boolean) as T[]
      return [...configs, ...resolved]
    })
    return this
  }

  /**
   * Prepend configs to the beginning of the current configs array.
   */
  public prepend(...items: ResolvableFlatConfig<T>[]): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat().filter(Boolean) as T[]
      return [...resolved, ...configs]
    })
    return this
  }

  /**
   * Insert configs before a specific config.
   */
  public insertBefore(
    nameOrIndex: StringLiteralUnion<ConfigNames, string | number>,
    ...items: ResolvableFlatConfig<T>[]
  ): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat().filter(Boolean) as T[]
      const index = getConfigIndex(configs, nameOrIndex)
      configs.splice(index, 0, ...resolved)
      return configs
    })
    return this
  }

  /**
   * Insert configs after a specific config.
   */
  public insertAfter(
    nameOrIndex: StringLiteralUnion<ConfigNames, string | number>,
    ...items: ResolvableFlatConfig<T>[]
  ): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat().filter(Boolean) as T[]
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
  public override(
    nameOrIndex: StringLiteralUnion<ConfigNames, string | number>,
    config: T | ((config: T) => Awaitable<T>),
  ): this {
    this._operationsOverrides.push(async (configs) => {
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
  public overrides(
    overrides: Partial<Record<StringLiteralUnion<ConfigNames, string | number>, T | ((config: T) => Awaitable<T>)>>,
  ): this {
    for (const [name, config] of Object.entries(overrides)) {
      if (config)
        this.override(name, config)
    }
    return this
  }

  /**
   * Override rules and it's options in **all configs**.
   *
   * Pass `null` as the value to remove the rule.
   *
   * @example
   * ```ts
   * composer
   *   .overrideRules({
   *      'no-console': 'off',
   *      'no-unused-vars': ['error', { vars: 'all', args: 'after-used' }],
   *      // remove the rule from all configs
   *      'no-undef': null,
   *   })
   * ```
   */
  public overrideRules(
    rules: NullableObject<GetRuleRecordFromConfig<T>>,
  ): this {
    this._operationsOverrides.push(async (configs) => {
      for (const config of configs) {
        if (!('rules' in config) || !config.rules)
          continue

        const configRules = config.rules as Record<string, any>

        for (const [key, value] of Object.entries(rules)) {
          if (!(key in configRules))
            continue
          if (value == null)
            delete configRules[key]
          else
            configRules[key] = value
        }
      }
      return configs
    })
    return this
  }

  /**
   * Remove rules from **all configs**.
   *
   * @example
   * ```ts
   * composer
   *  .removeRules(
   *    'no-console',
   *    'no-unused-vars'
   *  )
   * ```
   */
  public removeRules(
    ...rules: StringLiteralUnion<FilterType<keyof GetRuleRecordFromConfig<T>, string>, string>[]
  ): this {
    return this.overrideRules(Object.fromEntries(
      rules.map(rule => [rule, null]),
    ) as any)
  }

  /**
   * Remove a specific config by name or index.
   */
  public remove(nameOrIndex: ConfigNames | string | number): this {
    this._operations.push(async (configs) => {
      const index = getConfigIndex(configs, nameOrIndex)
      configs.splice(index, 1)
      return configs
    })
    return this
  }

  /**
   * Replace a specific config by name or index.
   *
   * The original config will be removed and replaced with the new one.
   */
  public replace(
    nameOrIndex: StringLiteralUnion<ConfigNames, string | number>,
    ...items: ResolvableFlatConfig<T>[]
  ): this {
    const promise = Promise.all(items)
    this._operations.push(async (configs) => {
      const resolved = (await promise).flat().filter(Boolean) as T[]
      const index = getConfigIndex(configs, nameOrIndex)
      configs.splice(index, 1, ...resolved)
      return configs
    })
    return this
  }

  /**
   * Hook when all configs are resolved but before returning the final configs.
   *
   * You can modify the final configs here.
   */
  public onResolved(callback: (configs: T[]) => Awaitable<T[] | void>): this {
    this._operationsResolved.push(callback)
    return this
  }

  /**
   * Clone the composer object.
   */
  public clone(): FlatConfigComposer<T> {
    const composer = new FlatConfigComposer<T>()
    composer._operations = this._operations.slice()
    composer._operationsOverrides = this._operationsOverrides.slice()
    composer._operationsResolved = this._operationsResolved.slice()
    composer._renames = { ...this._renames }
    return composer
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
    for (const promise of this._operationsOverrides)
      configs = await promise(configs)

    configs = renamePluginsInConfigs(configs, this._renames) as T[]

    for (const promise of this._operationsResolved)
      configs = await promise(configs) || configs

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

function getConfigIndex(configs: Linter.FlatConfig[], nameOrIndex: string | number): number {
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

/**
 * @deprecated Renamed to `composer`.
 */
export const pipe = composer

/**
 * @deprecated Renamed to `FlatConfigComposer`.
 */
export class FlatConfigPipeline<
  T extends object = Linter.FlatConfig,
  ConfigNames extends string = string,
> extends FlatConfigComposer<T, ConfigNames> {}
