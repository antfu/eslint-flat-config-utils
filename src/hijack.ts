import type { ESLint, Rule } from 'eslint'

/**
 * Replace a rule in a plugin with given factory.
 */
export function hijackPluginRule(
  plugin: ESLint.Plugin,
  name: string,
  factory: (rule: Rule.RuleModule) => Rule.RuleModule,
): ESLint.Plugin {
  const original = plugin.rules?.[name]
  if (!original) {
    throw new Error(`Rule "${name}" not found in plugin "${plugin.meta?.name || plugin.name}"`)
  }
  plugin.rules![name] = factory(original)
  return plugin
}

/**
 * Hijack into a rule's `context.report` to disable fixes.
 */
export function disableRuleFixes(rule: Rule.RuleModule): Rule.RuleModule {
  const originalCreate = rule.create.bind(rule)
  rule.create = (context): any => {
    const clonedContext = { ...context }
    const proxiedContext = new Proxy(clonedContext, {
      get(target, prop, receiver): any {
        if (prop === 'report') {
          return function (report: any) {
            if (report.fix) {
              delete report.fix
            }
            return (Reflect.get(context, prop, receiver) as any)({
              ...report,
              fix: undefined,
            })
          }
        }
        return Reflect.get(context, prop, receiver)
      },
      set(target, prop, value, receiver): any {
        return Reflect.set(context, prop, value, receiver)
      },
    })
    return originalCreate(proxiedContext)
  }
  return rule
}
