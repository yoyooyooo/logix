import type * as Logix from '@logixjs/core'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect } from 'effect'
import * as Validators from './internal/validators/index.js'
import type { CanonicalPath } from './internal/form/types.js'

export type AutoValidateOn = 'onChange' | 'onBlur'

export type RuleValidateOn = ReadonlyArray<AutoValidateOn>

export type RuleFn<Input, Ctx = unknown> = (input: Input, ctx: Ctx) => unknown | undefined

type RuleDeps<Input> = Input extends object
  ? CanonicalPath<Input> extends never
    ? string
    : CanonicalPath<Input>
  : string

export type Rule<Input, Ctx = unknown> = FieldContracts.CheckRule<Input, Ctx> & {
  /**
   * validateOn：
   * - Only affects the auto-validation phase (onChange/onBlur); submit/manual always runs.
   * - If an empty array, auto-validation is disabled (only submit/manual runs).
   */
  readonly validateOn?: RuleValidateOn
}

export type RuleSet<Input, Ctx = unknown> = Readonly<Record<string, Rule<Input, Ctx>>>

const RULE_SKIP = Symbol.for('logix.field-kernel.validate.skip')
const EFFECTFUL_VALIDATE = Symbol.for('@logixjs/form/effectfulRuleValidate')

export const getEffectfulValidate = (validate: unknown): RuleFn<any, any> | undefined =>
  typeof validate === 'function' ? ((validate as any)[EFFECTFUL_VALIDATE] as RuleFn<any, any> | undefined) : undefined

const wrapEffectfulValidate = <Input, Ctx>(validate: RuleFn<Input, Ctx>): RuleFn<Input, Ctx> => {
  const wrapped = ((input: Input, ctx: Ctx) => {
    const out = validate(input, ctx)
    return Effect.isEffect(out) ? RULE_SKIP : out
  }) as RuleFn<Input, Ctx>

  Object.defineProperty(wrapped, EFFECTFUL_VALIDATE, {
    value: validate,
    enumerable: false,
    configurable: false,
  })

  return wrapped
}

export type RuleEntry<Input, Ctx = unknown> =
  | RuleFn<Input, Ctx>
  | (Omit<Rule<Input, Ctx>, 'deps'> & {
      readonly deps?: ReadonlyArray<RuleDeps<Input>>
    })

export type RuleGroup<Input, Ctx = unknown> = Readonly<{
  readonly deps?: ReadonlyArray<RuleDeps<Input>>
  readonly validateOn?: RuleValidateOn
  readonly validate: Readonly<Record<string, RuleEntry<Input, Ctx>>>
}>

export type RuleConfig<Input, Ctx = unknown> = Readonly<{
  readonly deps?: ReadonlyArray<RuleDeps<Input>>
  readonly validateOn?: RuleValidateOn

  // RHF-like builtins (expanded at build time into equivalent pure functions)
  readonly required?: Validators.RequiredDecl | string
  readonly email?: Validators.EmailDecl | string
  readonly minLength?: Validators.MinLengthDecl
  readonly maxLength?: Validators.MaxLengthDecl
  readonly min?: Validators.MinDecl
  readonly max?: Validators.MaxDecl
  readonly pattern?: Validators.PatternDecl

  // RHF-like validate: a function or a named map of functions (RuleEntry form is also allowed to override deps/validateOn)
  readonly validate?: RuleFn<Input, Ctx> | Readonly<Record<string, RuleEntry<Input, Ctx>>>
}>

export type RuleInput<Input, Ctx = unknown> = RuleFn<Input, Ctx> | RuleGroup<Input, Ctx> | RuleConfig<Input, Ctx>

const uniq = <T>(items: ReadonlyArray<T>): ReadonlyArray<T> => Array.from(new Set(items))

const normalizeValidateOn = (input: unknown): RuleValidateOn | undefined => {
  if (!Array.isArray(input)) return undefined
  const out: Array<AutoValidateOn> = []
  for (const x of input) {
    if (x === 'onChange' || x === 'onBlur') out.push(x)
  }
  return uniq(out)
}

const normalizeDeps = (input: unknown): ReadonlyArray<string> | undefined => {
  if (!Array.isArray(input)) return undefined
  const out: Array<string> = []
  for (const x of input) {
    if (typeof x !== 'string') continue
    const v = x.trim()
    if (!v) continue
    out.push(v)
  }
  return uniq(out)
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * make：
 * - The result must be directly attachable to `FieldKernel.node({ check })`.
 * - Does not introduce an extra wrapper (e.g. `{ rules: ... }`).
 */
export const make = <Input, Ctx = unknown>(input: RuleInput<Input, Ctx>): RuleSet<Input, Ctx> => {
  if (typeof input === 'function') {
    return {
      default: {
        deps: [],
        validate: input,
      },
    }
  }

  if (!isPlainObject(input)) {
    return {}
  }

  const baseDeps = normalizeDeps((input as any).deps) ?? []
  const baseValidateOn = normalizeValidateOn((input as any).validateOn)

  const byName = new Map<string, Rule<Input, Ctx>>()

  const addRule = (name: string, raw: unknown): void => {
    const ruleName = typeof name === 'string' ? name.trim() : ''
    if (!ruleName) return
    if (byName.has(ruleName)) {
      throw new Error(`[Form.Rule.make] Duplicate rule name "${ruleName}"`)
    }

    if (typeof raw === 'function') {
      byName.set(ruleName, {
        deps: baseDeps,
        validate: wrapEffectfulValidate(raw as any),
        ...(baseValidateOn !== undefined ? { validateOn: baseValidateOn } : {}),
      })
      return
    }

    if (!raw || typeof raw !== 'object') return
    const entry = raw as any
    const deps = normalizeDeps(entry.deps) ?? baseDeps
    const validateOn = normalizeValidateOn(entry.validateOn) ?? baseValidateOn
    const validate = entry.validate
    if (typeof validate !== 'function') return

    byName.set(ruleName, {
      ...entry,
      deps,
      validate: wrapEffectfulValidate(validate),
      ...(validateOn !== undefined ? { validateOn } : {}),
    })
  }

  // RHF-like builtins (if declared, it will be expanded into an equivalent pure function)
  const requiredDecl = (input as any).required as Validators.RequiredDecl | string | undefined
  if (requiredDecl !== undefined && requiredDecl !== false) {
    const validate = Validators.required(typeof requiredDecl === 'string' ? { message: requiredDecl } : requiredDecl)
    addRule('required', (value: Input) => validate(value))
  }

  const emailDecl = (input as any).email as Validators.EmailDecl | string | undefined
  if (emailDecl !== undefined && emailDecl !== false) {
    const validate = Validators.email(typeof emailDecl === 'string' ? { message: emailDecl } : emailDecl)
    addRule('email', (value: Input) => validate(value))
  }

  const minLengthDecl = (input as any).minLength as Validators.MinLengthDecl | undefined
  if (minLengthDecl !== undefined) {
    const validate = Validators.minLength(minLengthDecl)
    addRule('minLength', (value: Input) => validate(value))
  }

  const maxLengthDecl = (input as any).maxLength as Validators.MaxLengthDecl | undefined
  if (maxLengthDecl !== undefined) {
    const validate = Validators.maxLength(maxLengthDecl)
    addRule('maxLength', (value: Input) => validate(value))
  }

  const minDecl = (input as any).min as Validators.MinDecl | undefined
  if (minDecl !== undefined) {
    const validate = Validators.min(minDecl)
    addRule('min', (value: Input) => validate(value))
  }

  const maxDecl = (input as any).max as Validators.MaxDecl | undefined
  if (maxDecl !== undefined) {
    const validate = Validators.max(maxDecl)
    addRule('max', (value: Input) => validate(value))
  }

  const patternDecl = (input as any).pattern as Validators.PatternDecl | undefined
  if (patternDecl !== undefined) {
    const validate = Validators.pattern(patternDecl)
    addRule('pattern', (value: Input) => validate(value))
  }

  // validate: supports both grouped RuleGroup `{ validate: Record<string, RuleEntry> }`
  // and RHF-style `validate: fn | Record<string, fn>`.
  const validateBlock = (input as any).validate as unknown
  if (typeof validateBlock === 'function') {
    addRule('validate', validateBlock)
  } else if (isPlainObject(validateBlock)) {
    const names = Object.keys(validateBlock).sort((a, b) => a.localeCompare(b))
    for (const name of names) {
      addRule(name, (validateBlock as any)[name])
    }
  }

  const out: Record<string, Rule<Input, Ctx>> = {}
  const names = Array.from(byName.keys()).sort((a, b) => a.localeCompare(b))
  for (const name of names) {
    out[name] = byName.get(name)!
  }
  return out
}

export const merge = <Input, Ctx = unknown>(...rules: ReadonlyArray<RuleSet<Input, Ctx>>): RuleSet<Input, Ctx> => {
  const byName = new Map<string, Rule<Input, Ctx>>()
  const duplicates = new Set<string>()

  for (const ruleSet of rules) {
    for (const name of Object.keys(ruleSet)) {
      if (byName.has(name)) duplicates.add(name)
      else byName.set(name, ruleSet[name]!)
    }
  }

  if (duplicates.size > 0) {
    const list = Array.from(duplicates)
      .sort((a, b) => a.localeCompare(b))
      .join(', ')
    throw new Error(`[Form.Rule.merge] Duplicate rule name(s): ${list}`)
  }

  const merged: Record<string, Rule<Input, Ctx>> = {}
  const names = Array.from(byName.keys()).sort((a, b) => a.localeCompare(b))
  for (const name of names) {
    merged[name] = byName.get(name)!
  }

  return merged
}

export type ErrorTarget = '$value' | '$self'

export type ListIdentityPolicy =
  | Readonly<{ readonly mode: 'trackBy'; readonly trackBy: string }>
  | Readonly<{ readonly mode: 'store' }>
  | Readonly<{ readonly mode: 'index' }>

export type FieldDecl<Input, Ctx = unknown> = Readonly<{
  readonly kind: 'field'
  readonly valuePath: string
  readonly rule: RuleInput<Input, Ctx>
  readonly errorTarget?: ErrorTarget
}>

export type RootDecl<Input, Ctx = unknown> = Readonly<{
  readonly kind: 'root'
  readonly rule: RuleInput<Input, Ctx>
}>

export type ListDecl<Item, Ctx = unknown> = Readonly<{
  readonly kind: 'list'
  readonly listPath: string
  readonly identity: ListIdentityPolicy
  readonly item?: RuleInput<Item, Ctx>
  readonly list?: RuleInput<ReadonlyArray<Item>, Ctx>
  readonly minItems?: MinItemsDecl
  readonly maxItems?: MaxItemsDecl
}>

export type MinItemsDecl = Validators.MinLengthDecl
export type MaxItemsDecl = Validators.MaxLengthDecl

export type RulesDecl<TValues extends object = any> = FieldDecl<any> | RootDecl<TValues> | ListDecl<any>

export const field = <Input, Ctx = unknown>(
  valuePath: string,
  rule: RuleInput<Input, Ctx>,
  options?: { readonly errorTarget?: ErrorTarget },
): FieldDecl<Input, Ctx> => ({
  kind: 'field',
  valuePath,
  rule,
  ...(options?.errorTarget !== undefined ? { errorTarget: options.errorTarget } : {}),
})

export const root = <Input, Ctx = unknown>(rule: RuleInput<Input, Ctx>): RootDecl<Input, Ctx> => ({
  kind: 'root',
  rule,
})

export const list = <Item, Ctx = unknown>(
  listPath: string,
  spec: {
    readonly identity: ListIdentityPolicy
    readonly item?: RuleInput<Item, Ctx>
    readonly list?: RuleInput<ReadonlyArray<Item>, Ctx>
    readonly minItems?: MinItemsDecl
    readonly maxItems?: MaxItemsDecl
  },
): ListDecl<Item, Ctx> => ({
  kind: 'list',
  listPath,
  identity: spec.identity,
  ...(spec.item !== undefined ? { item: spec.item } : {}),
  ...(spec.list !== undefined ? { list: spec.list } : {}),
  ...(spec.minItems !== undefined ? { minItems: spec.minItems } : {}),
  ...(spec.maxItems !== undefined ? { maxItems: spec.maxItems } : {}),
})

export const fields = <Input, Ctx = unknown>(
  ...decls: ReadonlyArray<FieldDecl<Input, Ctx> | ReadonlyArray<FieldDecl<Input, Ctx>>>
): Readonly<Record<string, RuleInput<Input, Ctx>>> => {
  const out: Record<string, RuleInput<Input, Ctx>> = {}
  const list: Array<FieldDecl<Input, Ctx>> = []

  const isDeclArray = (value: unknown): value is ReadonlyArray<FieldDecl<Input, Ctx>> => Array.isArray(value)

  for (const item of decls) {
    if (isDeclArray(item)) {
      list.push(...item)
      continue
    }
    list.push(item)
  }

  for (const decl of list) {
    const path = typeof decl?.valuePath === 'string' ? decl.valuePath.trim() : ''
    if (!path) continue
    if (path in out) {
      throw new Error(`[Form.Rule.fields] Duplicate valuePath "${path}"`)
    }
    out[path] = decl.rule
  }

  return out
}

export {
  ERROR_VALUE_MAX_BYTES,
  assertErrorValueBudget,
  required,
  email,
  minLength,
  maxLength,
  min,
  max,
  pattern,
} from './internal/validators/index.js'
