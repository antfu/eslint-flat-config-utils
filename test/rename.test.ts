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

it('renames plugins in configs when Object.groupBy is unavailable', () => {
  // Object.groupBy is only available since Node.js 21
  // https://github.com/antfu/eslint-flat-config-utils/issues/11
  const originalGroupBy = Object.groupBy
  Object.groupBy = undefined as unknown as typeof Object.groupBy
  try {
    expect(renamePluginsInConfigs(
      [{ plugins: { 'foo': {}, 'bar-baz': {} } }],
      { 'bar-baz': 'bar' },
    )).toEqual([{ plugins: { foo: {}, bar: {} } }])

    expect(renamePluginsInConfigs(
      [{ plugins: { a: {}, b: { meta: { name: 'b' } } } }],
      { a: 'x', b: 'x' },
    )).toEqual([{ plugins: { x: { meta: { name: 'b' } } } }])
  }
  finally {
    Object.groupBy = originalGroupBy
  }
})
