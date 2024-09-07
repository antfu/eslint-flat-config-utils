import { expect, it } from 'vitest'
import { extend } from '../src'
import { composer } from '../src/composer'

it('empty', async () => {
  const p = composer(
    await extend(
      [
        {
          files: ['*.js'],
        },
        {
          ignores: ['**/dist/**'],
        },
      ],
      './foo',
    ),
  )
  expect(await p)
    .toMatchInlineSnapshot(`
      [
        {
          "files": [
            "foo/*.js",
          ],
        },
        {
          "ignores": [
            "foo/**/dist/**",
          ],
        },
      ]
    `)
})
