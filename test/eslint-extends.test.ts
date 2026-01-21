import { expect, it } from 'vitest'
import { composer } from '../src/composer'

it('basic', async () => {
  const p = composer(
    {
      name: 'main-config',
      files: ['*.js'],
      extends: [
        {
          name: 'foo',
          files: ['*.ts'],
          rules: {
            'no-console': 'error',
          },
        },
      ],
      rules: {
        indent: 'error',
      },
    },
  )
  expect(await p)
    .toMatchInlineSnapshot(`
      [
        {
          "files": [
            [
              "*.js",
              "*.ts",
            ],
          ],
          "name": "main-config > foo",
          "rules": {
            "no-console": "error",
          },
        },
        {
          "files": [
            "*.js",
          ],
          "name": "main-config",
          "rules": {
            "indent": "error",
          },
        },
      ]
    `)
})
