import { describe, expect, it } from 'vitest'
import { pipe } from '../src/pipe'

it('empty', async () => {
  const p = pipe()
  expect(await p).toEqual([])
})

it('operations', async () => {
  const p = pipe([{ name: 'init' }])
    .renamePlugins({
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

it('onResolved', async () => {
  const p = pipe([{ name: 'init' }])
    .append({ name: 'append' })
    .onResolved((configs) => {
      return [
        ...configs,
        ...configs,
      ]
    })
  expect(await p).toMatchInlineSnapshot(`
    [
      {
        "name": "init",
      },
      {
        "name": "append",
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

describe('error', () => {
  it('error in config', async () => {
    const p = pipe([{ name: 'init' }])
      .append(Promise.reject(new Error('error in config')))

    expect(async () => await p).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: error in config]`)
  })

  it('error in inset', async () => {
    const p = pipe(
      { name: 'init1' },
      { name: 'init2' },
      { name: 'init3' },
    )
      .append(
        { name: 'append1' },
      )
      .insertAfter('init4', { name: 'insertAfter1' })

    expect(async () => await p).rejects.toThrowErrorMatchingInlineSnapshot(`
      [Error: ESLintFlatConfigUtils: Failed to locate config with name "init4"
      Available names are: init1, init2, init3, append1]
    `)
  })

  it('error in operation', async () => {
    const p = pipe(
      { name: 'init1' },
      { name: 'init2' },
      { }, // unnamed
    )
      .append(
        { name: 'append1' },
      )
      .override('init4', { name: 'insertAfter1' })

    expect(async () => await p).rejects.toThrowErrorMatchingInlineSnapshot(`
      [Error: ESLintFlatConfigUtils: Failed to locate config with name "init4"
      Available names are: init1, init2, append1
      (1 unnamed configs)]
    `)
  })
})
