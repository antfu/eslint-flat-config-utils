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
  const patched = factory(original)
  if (patched !== plugin.rules![name])
    plugin.rules![name] = patched
  return plugin
}

const FLAG_DISABLE_FIXES = '__eslint-flat-config-utils-disable-fixes__'

/**
 * Hijack into a rule's `context.report` to disable fixes.
 */
export function disableRuleFixes(rule: Rule.RuleModule): Rule.RuleModule {
  if ((rule as any)[FLAG_DISABLE_FIXES]) {
    return rule
  }
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
    Object.defineProperty(proxiedContext, FLAG_DISABLE_FIXES, { value: true, enumerable: false })
    return originalCreate(proxiedContext)
  }
  return rule
}
