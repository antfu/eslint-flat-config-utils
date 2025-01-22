import { expect, it } from 'vitest'
import { parseRuleId } from '../src/parse'

it('parse', () => {
  expect(parseRuleId('indent'))
    .toEqual({ plugin: null, rule: 'indent' })

  expect(parseRuleId('ts/indent'))
    .toEqual({ plugin: 'ts', rule: 'indent' })

  expect(parseRuleId('@typescript-eslint/indent'))
    .toEqual({ plugin: '@typescript-eslint', rule: 'indent' })

  expect(parseRuleId('foo/ts/indent'))
    .toEqual({ plugin: 'foo', rule: 'ts/indent' })
})
