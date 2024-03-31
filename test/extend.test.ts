import { expect, it } from 'vitest'
import { composer } from '../src/composer'
import { extend } from '../src'

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
