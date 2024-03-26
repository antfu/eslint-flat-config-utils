import { expect, it } from 'vitest'
import { pipe } from '../src/pipe'

it('empty', async () => {
  const p = pipe()
  expect(await p).toEqual([])
})

it('operations', async () => {
  const p = pipe([{ name: 'init' }])
    .setRenames({
      'import-x': 'x',
    })
    .append({ name: 'append' })
    .prepend(
      { name: 'prepend' },
      Promise.resolve([{
        name: 'prepend2',
        plugins: { 'import-x': {} },
        rules: { 'import-x/import': 'error' },
      }]),
    )
    .insertAfter('prepend', { name: 'insertAfter' })
    .override('prepend2', {
      rules: {
        'import-x/foo': 'error',
      },
    })
  expect(await p).toMatchInlineSnapshot(`
    [
      {
        "name": "prepend",
      },
      {
        "name": "insertAfter",
      },
      {
        "name": "prepend2",
        "plugins": {
          "x": {},
        },
        "rules": {
          "x/foo": "error",
          "x/import": "error",
        },
      },
      {
        "name": "init",
      },
      {
        "name": "append",
      },
    ]
  `)
})
