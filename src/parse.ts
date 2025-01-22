// Ported from https://github.com/eslint/eslint/blob/e39d3f22ff793db42e1f1fc3808cbb12fc513118/lib/config/flat-config-helpers.js#L35-L58
export function parseRuleId(ruleId: string): {
  plugin: string | null
  rule: string
} {
  let plugin: string | null
  let rule = ruleId

  // distinguish between core rules and plugin rules
  if (ruleId.includes('/')) {
    // mimic scoped npm packages
    if (ruleId.startsWith('@')) {
      plugin = ruleId.slice(0, ruleId.lastIndexOf('/'))
    }
    else {
      plugin = ruleId.slice(0, ruleId.indexOf('/'))
    }

    rule = ruleId.slice(plugin.length + 1)
  }
  else {
    plugin = null
    rule = ruleId
  }

  return {
    plugin,
    rule,
  }
}
