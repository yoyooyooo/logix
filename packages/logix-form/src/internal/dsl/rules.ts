import { Schema } from 'effect'
import * as Rule from '../../Rule.js'
import * as Validators from '../validators/index.js'
import type { CanonicalListItem, CanonicalListPath, CanonicalPath, CanonicalValue } from '../form/types.js'

/**
 * RulesSpec: the input shape of `Form.make({ rules })`.
 *
 * - Task 028 compiles `rules` into an equivalent `StateTraitSpec`; `rules` itself does not introduce a second runtime.
 */
export type RulesSpec<TValues extends object> = Readonly<{
  readonly _tag: 'FormRulesSpec'
  readonly decls: ReadonlyArray<Rule.RulesDecl<TValues>>
}>

export type RulesFieldNode = Readonly<{
  readonly _tag: 'FormRulesNodeField'
  readonly rule: Rule.RuleInput<any, any>
}>

export type RulesObjectNode = Readonly<{
  readonly _tag: 'FormRulesNodeObject'
  readonly shape: Readonly<Record<string, RulesNode>>
  readonly refineRule?: Rule.RuleInput<any, any>
  readonly superRefineRule?: Rule.RuleInput<any, any>
  readonly refine: (rule: Rule.RuleInput<any, any>) => RulesObjectNode
  readonly superRefine: (rule: Rule.RuleInput<any, any>) => RulesObjectNode
}>

export type RulesArrayNode = Readonly<{
  readonly _tag: 'FormRulesNodeArray'
  readonly item: RulesNode
  readonly identity: Rule.ListIdentityPolicy
  readonly refineRule?: Rule.RuleInput<any, any>
  readonly superRefineRule?: Rule.RuleInput<any, any>
  readonly refine: (rule: Rule.RuleInput<any, any>) => RulesArrayNode
  readonly superRefine: (rule: Rule.RuleInput<any, any>) => RulesArrayNode
}>

export type RulesNode = RulesFieldNode | RulesObjectNode | RulesArrayNode

type TrackByKey<Item> = Item extends object
  ? CanonicalPath<Item> extends never
    ? string
    : CanonicalPath<Item>
  : string

export type RulesDsl<TValues extends object> = {
  (...decls: ReadonlyArray<Rule.RulesDecl<TValues>>): RulesSpec<TValues>
  (...decls: ReadonlyArray<Rule.RulesDecl<TValues> | ReadonlyArray<Rule.RulesDecl<TValues>>>): RulesSpec<TValues>
  readonly schema: (node: RulesNode) => RulesSpec<TValues>
  readonly at: (prefix: string) => RulesDsl<TValues>
  readonly root: <Ctx = unknown>(rule: Rule.RuleInput<TValues, Ctx>) => Rule.RootDecl<TValues, Ctx>
  readonly list: <P extends CanonicalListPath<TValues>, Ctx = unknown>(
    listPath: P,
    spec: {
      readonly identity:
        | Readonly<{ readonly mode: 'trackBy'; readonly trackBy: TrackByKey<CanonicalListItem<TValues, P>> }>
        | Readonly<{ readonly mode: 'store' }>
        | Readonly<{ readonly mode: 'index' }>
      readonly item?: Rule.RuleInput<CanonicalListItem<TValues, P>, Ctx>
      readonly list?: Rule.RuleInput<ReadonlyArray<CanonicalListItem<TValues, P>>, Ctx>
    },
  ) => Rule.ListDecl<CanonicalListItem<TValues, P>, Ctx>
  readonly field: {
    <P extends CanonicalPath<TValues>, Ctx = unknown>(
      valuePath: P,
      rule: Rule.RuleInput<CanonicalValue<TValues, P>, Ctx>,
      options?: { readonly errorTarget?: Rule.ErrorTarget },
    ): Rule.FieldDecl<CanonicalValue<TValues, P>, Ctx>
    (schema: Schema.Schema<any, any, never>): RulesFieldNode
    (rule: Rule.RuleInput<any, any>): RulesFieldNode
  }
  readonly object: (shape: Readonly<Record<string, RulesNode>>) => RulesObjectNode
  readonly array: (item: RulesNode, options: { readonly identity: Rule.ListIdentityPolicy }) => RulesArrayNode
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizePrefix = (prefix: string): string => {
  const p = String(prefix ?? '').trim()
  if (!p) return ''
  if (p.includes('[]') || p.includes('[') || p.includes(']')) {
    throw new Error(`[Form.rules] Invalid prefix "${p}" (bracket syntax is not allowed)`)
  }
  const segments = p
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return ''
  for (const seg of segments) {
    if (/^[0-9]+$/.test(seg)) {
      throw new Error(`[Form.rules] Invalid prefix "${p}" (numeric segments are not allowed)`)
    }
  }
  return segments.join('.')
}

const joinPath = (prefix: string, path: string): string => {
  const p = String(prefix ?? '').trim()
  const s = String(path ?? '').trim()
  if (!p) return s
  if (!s) return p
  return `${p}.${s}`
}

const flattenDecls = <T>(decls: ReadonlyArray<T | ReadonlyArray<T>>): ReadonlyArray<T> => {
  const out: Array<T> = []
  for (const item of decls) {
    if (Array.isArray(item)) out.push(...item)
    else out.push(item as T)
  }
  return out
}

const withPrefix = <TValues extends object>(
  prefix: string,
  decls: ReadonlyArray<Rule.RulesDecl<TValues>>,
): ReadonlyArray<Rule.RulesDecl<TValues>> => {
  if (!prefix) return decls
  return decls.map((decl) => {
    if (!decl || typeof decl !== 'object') return decl
    if ((decl as any).kind === 'field') {
      const valuePath = joinPath(prefix, String((decl as any).valuePath ?? ''))
      return { ...(decl as any), valuePath }
    }
    if ((decl as any).kind === 'list') {
      const listPath = joinPath(prefix, String((decl as any).listPath ?? ''))
      return { ...(decl as any), listPath }
    }
    return decl
  })
}

const makeFieldNode = (rule: Rule.RuleInput<any, any>): RulesFieldNode => ({
  _tag: 'FormRulesNodeField',
  rule,
})

const fieldFromSchema = (schema: Schema.Schema<any, any, never>): Rule.RuleInput<any, any> => ({
  validate: {
    schema: (value: unknown) => {
      const decoded = Schema.decodeUnknownEither(schema)(value) as any
      return decoded._tag === 'Right' ? undefined : Validators.schemaErrorMessage(decoded.left)
    },
  },
})

const makeObjectNode = (params: {
  readonly shape: Readonly<Record<string, RulesNode>>
  readonly refineRule?: Rule.RuleInput<any, any>
  readonly superRefineRule?: Rule.RuleInput<any, any>
}): RulesObjectNode => {
  const base: any = {
    _tag: 'FormRulesNodeObject',
    shape: params.shape,
    ...(params.refineRule !== undefined ? { refineRule: params.refineRule } : {}),
    ...(params.superRefineRule !== undefined ? { superRefineRule: params.superRefineRule } : {}),
  }

  base.refine = (rule: Rule.RuleInput<any, any>) => {
    if (params.refineRule !== undefined || params.superRefineRule !== undefined) {
      throw new Error(`[Form.rules.schema] object.refine(...) can only be specified once`)
    }
    return makeObjectNode({ ...params, refineRule: rule })
  }

  base.superRefine = (rule: Rule.RuleInput<any, any>) => {
    if (params.refineRule !== undefined || params.superRefineRule !== undefined) {
      throw new Error(`[Form.rules.schema] object.superRefine(...) can only be specified once`)
    }
    return makeObjectNode({ ...params, superRefineRule: rule })
  }

  return base as RulesObjectNode
}

const makeArrayNode = (params: {
  readonly item: RulesNode
  readonly identity: Rule.ListIdentityPolicy
  readonly refineRule?: Rule.RuleInput<any, any>
  readonly superRefineRule?: Rule.RuleInput<any, any>
}): RulesArrayNode => {
  const base: any = {
    _tag: 'FormRulesNodeArray',
    item: params.item,
    identity: params.identity,
    ...(params.refineRule !== undefined ? { refineRule: params.refineRule } : {}),
    ...(params.superRefineRule !== undefined ? { superRefineRule: params.superRefineRule } : {}),
  }

  base.refine = (rule: Rule.RuleInput<any, any>) => {
    if (params.refineRule !== undefined || params.superRefineRule !== undefined) {
      throw new Error(`[Form.rules.schema] array.refine(...) can only be specified once`)
    }
    return makeArrayNode({ ...params, refineRule: rule })
  }

  base.superRefine = (rule: Rule.RuleInput<any, any>) => {
    if (params.refineRule !== undefined || params.superRefineRule !== undefined) {
      throw new Error(`[Form.rules.schema] array.superRefine(...) can only be specified once`)
    }
    return makeArrayNode({ ...params, superRefineRule: rule })
  }

  return base as RulesArrayNode
}

const assertValidListIdentity = (identity: Rule.ListIdentityPolicy, listPath: string): void => {
  if (!identity || typeof identity !== 'object') {
    throw new Error(`[Form.rules] Missing list identity for "${listPath}"`)
  }
  const mode = (identity as any).mode
  if (mode === 'trackBy') {
    const trackBy = (identity as any).trackBy
    if (typeof trackBy !== 'string' || trackBy.trim().length === 0) {
      throw new Error(`[Form.rules] identity.trackBy for "${listPath}" must be a non-empty string`)
    }
    if (trackBy.includes('[') || trackBy.includes(']')) {
      throw new Error(`[Form.rules] identity.trackBy for "${listPath}" must not contain brackets (got "${trackBy}")`)
    }
    return
  }
  if (mode === 'store' || mode === 'index') return
  throw new Error(`[Form.rules] Invalid identity.mode for "${listPath}" (got "${String(mode)}")`)
}

const assertCanonicalValuePath = (label: string, path: string): void => {
  const p = String(path ?? '').trim()
  if (!p) throw new Error(`[Form.rules] ${label} must be a non-empty path`)
  if (p === '$root') return
  if (p.includes('[]') || p.includes('[') || p.includes(']')) {
    throw new Error(`[Form.rules] ${label} "${p}" must not use bracket syntax`)
  }
  const segments = p
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) throw new Error(`[Form.rules] ${label} "${p}" must be a non-empty path`)
  for (const seg of segments) {
    if (/^[0-9]+$/.test(seg)) {
      throw new Error(`[Form.rules] ${label} "${p}" must not contain numeric segments`)
    }
  }
}

const assertDeclListGuardrails = <TValues extends object>(decls: ReadonlyArray<Rule.RulesDecl<TValues>>): void => {
  const declared = new Map<string, string>()

  const reserve = (kind: string, path: string): void => {
    const existing = declared.get(path)
    if (existing) {
      throw new Error(`[Form.rules] Duplicate declaration for "${path}" (${existing} + ${kind})`)
    }
    declared.set(path, kind)
  }

  for (const decl of decls) {
    if (!decl || typeof decl !== 'object') continue

    if ((decl as any).kind === 'field') {
      const valuePath = String((decl as any).valuePath ?? '').trim()
      assertCanonicalValuePath('field path', valuePath)
      reserve('field', valuePath)
      continue
    }

    if ((decl as any).kind === 'root') {
      reserve('root', '$root')
      continue
    }

    if ((decl as any).kind === 'list') {
      const listPath = String((decl as any).listPath ?? '').trim()
      assertCanonicalValuePath('list path', listPath)
      const identity = (decl as any).identity as Rule.ListIdentityPolicy
      assertValidListIdentity(identity, listPath)
      reserve('list', listPath)
      continue
    }

    const kind = String((decl as any).kind ?? '')
    throw new Error(`[Form.rules] Unknown declaration kind "${kind}"`)
  }
}

const compileSchema = <TValues extends object>(
  node: RulesNode,
  prefix: string,
): ReadonlyArray<Rule.RulesDecl<TValues>> => {
  const visit = (n: RulesNode, at: string): ReadonlyArray<Rule.RulesDecl<TValues>> => {
    if (!n || typeof n !== 'object') return []

    if ((n as any)._tag === 'FormRulesNodeField') {
      const rule = (n as any).rule as Rule.RuleInput<any, any>
      assertCanonicalValuePath('field path', at)
      return [Rule.field(at, rule) as any]
    }

    if ((n as any)._tag === 'FormRulesNodeObject') {
      const shape = (n as any).shape as Readonly<Record<string, RulesNode>>
      const out: Array<Rule.RulesDecl<TValues>> = []
      for (const key of Object.keys(shape)) {
        out.push(...visit(shape[key]!, joinPath(at, key)))
      }

      const refineRule = (n as any).refineRule as Rule.RuleInput<any, any> | undefined
      const superRefineRule = (n as any).superRefineRule as Rule.RuleInput<any, any> | undefined
      const selfRule = superRefineRule ?? refineRule
      if (selfRule !== undefined) {
        if (at) {
          out.push(Rule.field(at, selfRule, { errorTarget: '$self' }) as any)
        } else {
          out.push(Rule.root(selfRule) as any)
        }
      }

      return out
    }

    if ((n as any)._tag === 'FormRulesNodeArray') {
      const identity = (n as any).identity as Rule.ListIdentityPolicy
      assertCanonicalValuePath('list path', at)
      assertValidListIdentity(identity, at)

      const item = (n as any).item as RulesNode
      if (!item || typeof item !== 'object' || (item as any)._tag !== 'FormRulesNodeObject') {
        throw new Error(`[Form.rules.schema] array(item) currently requires item to be an object node`)
      }

      const itemObj = item as any
      if (itemObj.refineRule !== undefined || itemObj.superRefineRule !== undefined) {
        throw new Error(`[Form.rules.schema] array(item).item.refine(...) is not supported yet`)
      }

      const shape = itemObj.shape as Readonly<Record<string, RulesNode>>
      const validate: Record<string, Rule.RuleEntry<any, any>> = {}

      for (const key of Object.keys(shape)) {
        const child = shape[key] as any
        if (!child || typeof child !== 'object') continue
        if (child._tag !== 'FormRulesNodeField') {
          throw new Error(
            `[Form.rules.schema] array(item) only supports flat field nodes (nested object/array is not supported yet)`,
          )
        }

        const ruleInput = child.rule as Rule.RuleInput<any, any>
        const leafRules = Rule.make(ruleInput as any)
        for (const name of Object.keys(leafRules).sort((a, b) => a.localeCompare(b))) {
          const leaf = (leafRules as any)[name]
          const ruleName = `${key}.${name}`
          const deps = Array.isArray((leaf as any)?.deps) ? (leaf as any).deps : []
          const depsWithKey = Array.from(new Set([key, ...deps])).sort((a, b) => a.localeCompare(b))
          validate[ruleName] = {
            ...leaf,
            deps: depsWithKey,
            validate: (row: any, ctx: any) => {
              const v = row?.[key]
              const out = (leaf as any).validate(v, ctx)
              if (out === Symbol.for('logix.state-trait.validate.skip')) return out
              return out === undefined ? undefined : { [key]: out }
            },
          }
        }
      }

      const itemRule: Rule.RuleInput<any, any> | undefined =
        Object.keys(validate).length > 0 ? ({ validate } as any) : undefined

      const listRule = (n as any).refineRule as Rule.RuleInput<any, any> | undefined
      const listSuper = (n as any).superRefineRule as Rule.RuleInput<any, any> | undefined
      const listRuleInput = listSuper ?? listRule

      return [
        Rule.list(at, {
          identity,
          ...(itemRule !== undefined ? { item: itemRule } : {}),
          ...(listRuleInput !== undefined ? { list: listRuleInput } : {}),
        }) as any,
      ]
    }

    return []
  }

  const rootPrefix = normalizePrefix(prefix)
  return visit(node, rootPrefix)
}

/**
 * Form.rules：
 * - `$.rules(...decls)`：decl list（`Form.Rule.field/list/root`）
 * - `$.rules.schema(node)`: zod-like rules authoring (Phase 3 will be filled in gradually)
 * - `$.rules.at(prefix)`: write relative paths under `prefix`
 */
export const rules = <TValues extends object, I>(_valuesSchema: Schema.Schema<TValues, I>): RulesDsl<TValues> => {
  const makeDsl = (prefix: string): RulesDsl<TValues> => {
    const build: any = (
      ...decls: ReadonlyArray<Rule.RulesDecl<TValues> | ReadonlyArray<Rule.RulesDecl<TValues>>>
    ): RulesSpec<TValues> => {
      const flat = flattenDecls(decls as any) as ReadonlyArray<Rule.RulesDecl<TValues>>
      const p = normalizePrefix(prefix)
      const normalized = withPrefix(p, flat)
      assertDeclListGuardrails(normalized)
      return {
        _tag: 'FormRulesSpec',
        decls: normalized,
      }
    }

    build.schema = (node: RulesNode) => {
      const p = normalizePrefix(prefix)
      const normalized = compileSchema<TValues>(node, p)
      assertDeclListGuardrails(normalized)
      return {
        _tag: 'FormRulesSpec',
        decls: normalized,
      }
    }

    build.at = (p2: string) => makeDsl(joinPath(normalizePrefix(prefix), normalizePrefix(p2)))

    function field<P extends CanonicalPath<TValues>, Ctx = unknown>(
      valuePath: P,
      ruleInput: Rule.RuleInput<CanonicalValue<TValues, P>, Ctx>,
      options?: { readonly errorTarget?: Rule.ErrorTarget },
    ): Rule.FieldDecl<CanonicalValue<TValues, P>, Ctx>
    function field(schema: Schema.Schema<any, any, never>): RulesFieldNode
    function field(rule: Rule.RuleInput<any, any>): RulesFieldNode
    function field(...args: ReadonlyArray<any>): any {
      if (args.length >= 2 && typeof args[0] === 'string') {
        return Rule.field(args[0], args[1], args[2])
      }
      const input = args[0]
      if (Schema.isSchema(input)) return makeFieldNode(fieldFromSchema(input as any))
      return makeFieldNode(input as any)
    }

    build.field = field
    build.object = (shape: Readonly<Record<string, RulesNode>>) => makeObjectNode({ shape })
    build.array = (item: RulesNode, options: { readonly identity: Rule.ListIdentityPolicy }) =>
      makeArrayNode({ item, identity: options.identity })
    build.root = (ruleInput: unknown) => Rule.root(ruleInput as any)
    build.list = (listPath: string, spec: unknown) => Rule.list(listPath, spec as any)

    return build as RulesDsl<TValues>
  }

  return makeDsl('') as any
}
