import { expect, it } from 'vitest'
import { renamePluginsInRules } from '../src/rename'

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
