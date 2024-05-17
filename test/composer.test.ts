import { describe, expect, it } from 'vitest'
import type { Linter } from 'eslint'
import { composer } from '../src/composer'

it('empty', async () => {
  const p = composer()
  expect(await p).toEqual([])
})

it('operations', async () => {
  const p = composer([{ name: 'init' }])
    .renamePlugins({
      'import-x': 'x',
    })
    .append({ name: 'append' })
    .prepend(
      { name: 'prepend' },
      undefined,
      Promise.resolve([
        <Linter.FlatConfig>{
          name: 'prepend2',
          plugins: { 'import-x': {} },
          rules: { 'import-x/import': 'error' },
        },
        false as const,
      ]),
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
  const p = composer([{ name: 'init' }])
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

it('clone', async () => {
  const p = composer([{ name: 'init' }])
    .append({ name: 'append' })
    .clone()
    .append({ name: 'append2' })

  const clone = p.clone()
  clone.append({ name: 'append3' })

  expect((await p).length).toBe((await clone).length - 1)
})

it('config name completion', () => {
  type Names = 'foo' | 'bar'

  composer<Linter.FlatConfig, Names>()
    .override('foo', { name: 'foo' })
    //         ^| here it should suggest 'foo' | 'bar'
})

it('override rules', async () => {
  let p = composer([
    {
      name: 'init',
      rules: {
        'no-console': 'error',
        'no-unused-vars': 'error',
      },
    },
  ])
    .append({
      name: 'init2',
      rules: {
        'no-console': 'off',
      },
    })

    .overrideRules({
      'no-unused-vars': ['error', { vars: 'all', args: 'after-used' }],
      'no-exists': null,
    })

  expect(await p).toMatchInlineSnapshot(`
    [
      {
        "name": "init",
        "rules": {
          "no-console": "error",
          "no-unused-vars": [
            "error",
            {
              "args": "after-used",
              "vars": "all",
            },
          ],
        },
      },
      {
        "name": "init2",
        "rules": {
          "no-console": "off",
        },
      },
    ]
  `)

  p = p.clone()
    .removeRules('no-console')

  expect(await p).toMatchInlineSnapshot(`
    [
      {
        "name": "init",
        "rules": {
          "no-unused-vars": [
            "error",
            {
              "args": "after-used",
              "vars": "all",
            },
          ],
        },
      },
      {
        "name": "init2",
        "rules": {},
      },
    ]
  `)
})

describe('error', () => {
  it('error in config', async () => {
    const p = composer([{ name: 'init' }])
      .append(Promise.reject(new Error('error in config')))

    expect(async () => await p).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: error in config]`)
  })

  it('error in inset', async () => {
    const p = composer(
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
    const p = composer(
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
