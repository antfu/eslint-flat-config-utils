import { expect, it } from 'vitest'
import { renamePluginsInConfigs, renamePluginsInRules } from '../src/rename'

it('renames rules with shared plugin prefixes using the longest match first', () => {
  const renamed = renamePluginsInRules(
    {
      '@eslint-react/debug/jsx': 'error',
      '@eslint-react/dom/no-dangerously-set-innerhtml': 'error',
      '@eslint-react/naming-convention/component-name': 'error',
      '@eslint-react/no-access-state-in-setstate': 'error',
      '@eslint-react/rsc/no-client-hook-in-server-component': 'error',
      '@eslint-react/web-api/no-leaked-event-listener': 'error',
      'no-console': 'off',
    },
    {
      '@eslint-react': 'react',
      '@eslint-react/dom': 'react-dom',
      '@eslint-react/naming-convention': 'react-naming-convention',
      '@eslint-react/rsc': 'react-rsc',
      '@eslint-react/web-api': 'react-web-api',
    },
  )

  expect(renamed).toEqual({
    'react/debug/jsx': 'error',
    'react-dom/no-dangerously-set-innerhtml': 'error',
    'react-naming-convention/component-name': 'error',
    'react/no-access-state-in-setstate': 'error',
    'react-rsc/no-client-hook-in-server-component': 'error',
    'react-web-api/no-leaked-event-listener': 'error',
    'no-console': 'off',
  })
})

it('renames plugins to nested scopes', () => {
  const dummyRule = { create: (): object => ({}) }
  const configs: any[] = [
    {
      plugins: {
        'erasable-syntax-only': {
          meta: { name: 'eslint-plugin-erasable-syntax-only' },
          rules: {
            enums: dummyRule as any,
            namespaces: dummyRule as any,
          },
        },
      },
      rules: {
        'erasable-syntax-only/enums': 'error',
        'erasable-syntax-only/namespaces': 'error',
      },
    },
  ]

  const renamed = renamePluginsInConfigs(configs, {
    'erasable-syntax-only': 'ts/erasable-syntax',
  })

  expect(renamed).toEqual([
    {
      plugins: {
        ts: {
          meta: { name: 'eslint-plugin-erasable-syntax-only' },
          rules: {
            'erasable-syntax/enums': dummyRule,
            'erasable-syntax/namespaces': dummyRule,
          },
        },
      },
      rules: {
        'ts/erasable-syntax/enums': 'error',
        'ts/erasable-syntax/namespaces': 'error',
      },
    },
  ])
})

it('renames and merges plugins with nested scopes', () => {
  const ruleTs = { create: (): object => ({}) }
  const ruleErasable = { create: (): object => ({}) }
  const configs: any[] = [
    {
      plugins: {
        '@typescript-eslint': {
          meta: { name: '@typescript-eslint' },
          rules: {
            'no-explicit-any': ruleTs as any,
          },
        },
        'erasable-syntax-only': {
          meta: { name: 'eslint-plugin-erasable-syntax-only' },
          rules: {
            enums: ruleErasable as any,
          },
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        'erasable-syntax-only/enums': 'error',
      },
    },
  ]

  const renamed = renamePluginsInConfigs(
    configs,
    {
      '@typescript-eslint': 'ts',
      'erasable-syntax-only': 'ts/erasable-syntax',
    },
    { mergePlugins: true },
  )

  expect(renamed).toEqual([
    {
      plugins: {
        ts: {
          meta: { name: 'merged plugin of [@typescript-eslint, eslint-plugin-erasable-syntax-only]' },
          rules: {
            'no-explicit-any': ruleTs,
            'erasable-syntax/enums': ruleErasable,
          },
        },
      },
      rules: {
        'ts/no-explicit-any': 'error',
        'ts/erasable-syntax/enums': 'error',
      },
    },
  ])
})

it('works end-to-end with ESLint Linter verification', async () => {
  const { Linter } = await import('eslint')
  const linter = new Linter({ configType: 'flat' })

  const configs = renamePluginsInConfigs(
    [
      {
        plugins: {
          'some-plugin': {
            rules: {
              'nested-rule': {
                create(context): any {
                  return {
                    Identifier(node: any): void {
                      if (node.name === 'bad')
                        context.report({ node, message: 'bad identifier' })
                    },
                  }
                },
              },
            },
          },
        },
        rules: {
          'some-plugin/nested-rule': 'error',
        },
      },
    ],
    {
      'some-plugin': 'ts/erasable-syntax',
    },
  )

  const messages = linter.verify('const bad = 1;', configs)
  expect(messages).toHaveLength(1)
  expect(messages[0].ruleId).toBe('ts/erasable-syntax/nested-rule')
  expect(messages[0].message).toBe('bad identifier')
})

it('renames plugins to deeply nested scopes', () => {
  const dummyRule = { create: (): object => ({}) }
  const configs: any[] = [
    {
      plugins: {
        'my-plugin': {
          rules: {
            'check-something': dummyRule as any,
          },
        },
      },
      rules: {
        'my-plugin/check-something': 'error',
      },
    },
  ]

  const renamed = renamePluginsInConfigs(configs, {
    'my-plugin': 'foo/deep/nested/scope',
  })

  expect(renamed).toEqual([
    {
      plugins: {
        foo: {
          rules: {
            'deep/nested/scope/check-something': dummyRule,
          },
        },
      },
      rules: {
        'foo/deep/nested/scope/check-something': 'error',
      },
    },
  ])
})

it('renames multiple plugins to different nested scopes under the same root', () => {
  const ruleA = { create: (): object => ({}) }
  const ruleB = { create: (): object => ({}) }
  const configs: any[] = [
    {
      plugins: {
        'plugin-a': {
          meta: { name: 'plugin-a' },
          rules: { rule1: ruleA as any },
        },
        'plugin-b': {
          meta: { name: 'plugin-b' },
          rules: { rule2: ruleB as any },
        },
      },
      rules: {
        'plugin-a/rule1': 'error',
        'plugin-b/rule2': 'warn',
      },
    },
  ]

  const renamed = renamePluginsInConfigs(
    configs,
    {
      'plugin-a': 'ts/scope-a',
      'plugin-b': 'ts/scope-b',
    },
    { mergePlugins: true },
  )

  expect(renamed).toEqual([
    {
      plugins: {
        ts: {
          meta: { name: 'merged plugin of [plugin-a, plugin-b]' },
          rules: {
            'scope-a/rule1': ruleA,
            'scope-b/rule2': ruleB,
          },
        },
      },
      rules: {
        'ts/scope-a/rule1': 'error',
        'ts/scope-b/rule2': 'warn',
      },
    },
  ])
})

it('preserves non-rule plugin properties and handles plugins without rules', () => {
  const dummyProcessor = { preprocess: (): string[] => [], postprocess: (): any[] => [] }
  const configs: any[] = [
    {
      plugins: {
        'processor-plugin': {
          meta: { name: 'processor-plugin', version: '1.0.0' },
          processors: { custom: dummyProcessor },
        },
      },
    },
  ]

  const renamed = renamePluginsInConfigs(configs, {
    'processor-plugin': 'tool/processor',
  })

  expect(renamed).toEqual([
    {
      plugins: {
        tool: {
          meta: { name: 'processor-plugin', version: '1.0.0' },
          processors: { custom: dummyProcessor },
        },
      },
    },
  ])
})

it('handles scoped target plugins without treating slash as sub-prefix', () => {
  const dummyRule = { create: (): object => ({}) }
  const configs: any[] = [
    {
      plugins: {
        unscoped: {
          meta: { name: 'unscoped' },
          rules: { 'my-rule': dummyRule as any },
        },
      },
      rules: {
        'unscoped/my-rule': 'error',
      },
    },
  ]

  const renamed = renamePluginsInConfigs(configs, {
    unscoped: '@my-scope/my-plugin',
  })

  expect(renamed).toEqual([
    {
      plugins: {
        '@my-scope/my-plugin': {
          meta: { name: 'unscoped' },
          rules: { 'my-rule': dummyRule },
        },
      },
      rules: {
        '@my-scope/my-plugin/my-rule': 'error',
      },
    },
  ])
})
