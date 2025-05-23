import type { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'
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
        <Linter.Config>{
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

  composer<Linter.Config, Names>()
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

it('remove plugins', async () => {
  const p = composer([
    {
      name: 'init',
      plugins: {
        node: {},
      },
      rules: {
        'no-console': 'error',
        'no-unused-vars': 'error',
      },
    },
    {
      rules: {
        'node/no-console': 'error',
        'node/no-unused-vars': 'error',
      },
    },
    {
      plugins: {
        node: {},
        node2: {},
      },
      rules: {
        'node/no-console': 'off',
        'node/no-unused-vars': 'error',
        'node2/no-unused-vars': 'error',
      },
    },
  ])
    .removePlugins('node')

  expect(await p).toMatchInlineSnapshot(`
    [
      {
        "name": "init",
        "plugins": {},
        "rules": {
          "no-console": "error",
          "no-unused-vars": "error",
        },
      },
      {
        "rules": {},
      },
      {
        "plugins": {
          "node2": {},
        },
        "rules": {
          "node2/no-unused-vars": "error",
        },
      },
    ]
  `)
})

describe('error', () => {
  it('error in config', async () => {
    const p = composer([{ name: 'init' }])
      .append(Promise.reject(new Error('error in config')))

    await expect(async () => await p).rejects.toThrowErrorMatchingInlineSnapshot(`[Error: error in config]`)
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

    await expect(async () => await p)
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`
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

    await expect(async () => await p)
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`
        [Error: ESLintFlatConfigUtils: Failed to locate config with name "init4"
        Available names are: init1, init2, append1
        (1 unnamed configs)]
      `)
  })

  it('error in conflicts', async () => {
    // No error without calling s
    await composer(
      { name: 'init1', plugins: { 'import-x': {} } },
      { name: 'init2', plugins: { 'import-x': {} } },
    )

    await expect(async () => {
      await composer(
        { name: 'init1', plugins: { 'import-x': {} } },
        { name: 'init2', plugins: { 'import-x': {} } },
      )
        .setPluginConflictsError()
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(
        `[Error: ESLintFlatConfigUtils: Different instances of plugin "import-x" found in multiple configs: init1, init2. It's likely you misconfigured the merge of these configs.]`,
      )

    await expect(async () => {
      await composer(
        { name: 'init1', plugins: { 'import-x': {} } },
        { name: 'init2', plugins: { 'import-x': {} } },
        { name: 'init3', plugins: { import: {} } },
        { name: 'init4', plugins: { import: {} } },
      )
        .setPluginConflictsError()
        .setPluginConflictsError(
          'import',
          plugin => `Plugin "${plugin}" is duplicated in multiple configs`,
        )
    })
      .rejects
      .toThrowErrorMatchingInlineSnapshot(`
      [Error: ESLintFlatConfigUtils:
        1: Different instances of plugin "import-x" found in multiple configs: init1, init2. It's likely you misconfigured the merge of these configs.
        2: Plugin "import" is duplicated in multiple configs]
    `)
  })
})
