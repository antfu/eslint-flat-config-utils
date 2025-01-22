import { Linter } from 'eslint'
import pluginUnusedImports from 'eslint-plugin-unused-imports'
import { expect, it } from 'vitest'
import { composer } from '../src'

it('for 3rd party plugins', async () => {
  const raw: Linter.Config[] = [
    {
      name: 'test',
      plugins: {
        'unused-imports': pluginUnusedImports as any,
      },
      rules: {
        'unused-imports/no-unused-imports': 'error',
      },
    },
  ]

  const fixture = 'import { foo, bar } from "bar"\nbar()'

  const linter = new Linter({
    cwd: process.cwd(),
    configType: 'flat',
  })
  const resultNormal = linter.verifyAndFix(fixture, raw)
  expect(resultNormal).toMatchInlineSnapshot(`
    {
      "fixed": true,
      "messages": [],
      "output": "import { bar } from "bar"
    bar()",
    }
  `)

  const configs = composer(raw)

  configs.disableRulesFix(
    ['unused-imports/no-unused-imports'],
  )

  const resolved = await configs

  const result = linter.verifyAndFix(fixture, resolved)
  expect(result)
    .toMatchInlineSnapshot(`
      {
        "fixed": false,
        "messages": [
          {
            "column": 10,
            "endColumn": 13,
            "endLine": 1,
            "line": 1,
            "message": "'foo' is defined but never used.",
            "messageId": "unusedVar",
            "nodeType": null,
            "ruleId": "unused-imports/no-unused-imports",
            "severity": 2,
          },
        ],
        "output": "import { foo, bar } from "bar"
      bar()",
      }
    `)
})

it('for builtin plugins', async () => {
  const raw: Linter.Config[] = [
    {
      name: 'test',
      rules: {
        'prefer-const': 'error',
      },
    },
  ]

  const fixture = 'let foo = 1'

  const linter = new Linter({
    cwd: process.cwd(),
    configType: 'flat',
  })
  const resultNormal = linter.verifyAndFix(fixture, raw)
  expect(resultNormal).toMatchInlineSnapshot(`
    {
      "fixed": true,
      "messages": [],
      "output": "const foo = 1",
    }
  `)

  await expect(async () => {
    const configs = composer(raw)
    configs.disableRulesFix(['prefer-const'])
    await configs
  })
    .rejects
    .toThrowErrorMatchingInlineSnapshot(`[Error: Patching core rule "prefer-const" require pass \`{ builtinRules: () => import('eslint/use-at-your-own-risk').then(r => r.builtinRules) }\` in the options]`)

  const configs = composer(raw)
  configs.disableRulesFix(
    ['prefer-const'],
    {
      builtinRules: () => import('eslint/use-at-your-own-risk').then(r => r.builtinRules),
    },
  )
  const resolved = await configs

  const result = linter.verifyAndFix(fixture, resolved)
  expect(result)
    .toMatchInlineSnapshot(`
      {
        "fixed": false,
        "messages": [
          {
            "column": 5,
            "endColumn": 8,
            "endLine": 1,
            "line": 1,
            "message": "'foo' is never reassigned. Use 'const' instead.",
            "messageId": "useConst",
            "nodeType": "Identifier",
            "ruleId": "prefer-const",
            "severity": 2,
          },
        ],
        "output": "let foo = 1",
      }
    `)
})
