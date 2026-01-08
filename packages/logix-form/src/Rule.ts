import type * as Logix from '@logixjs/core'
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

export type Rule<Input, Ctx = unknown> = Logix.StateTrait.CheckRule<Input, Ctx> & {
  /**
   * validateOn：
   * - Only affects the auto-validation phase (onChange/onBlur); submit/manual always runs.
   * - If an empty array, auto-validation is disabled (only submit/manual runs).
   */
  readonly validateOn?: RuleValidateOn
}

export type RuleSet<Input, Ctx = unknown> = Readonly<Record<string, Rule<Input, Ctx>>>

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
  readonly required?: Validators.RequiredDecl
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
 * - The result must be directly attachable to `StateTrait.node({ check })`.
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
        validate: raw as any,
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
      validate,
      ...(validateOn !== undefined ? { validateOn } : {}),
    })
  }

  // RHF-like builtins (if declared, it will be expanded into an equivalent pure function)
  const requiredDecl = (input as any).required as Validators.RequiredDecl | undefined
  if (requiredDecl !== undefined && requiredDecl !== false) {
    const validate = Validators.required(requiredDecl)
    addRule('required', (value: Input) => validate(value))
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

  // validate: supports both legacy RuleGroup `{ validate: Record<string, RuleEntry> }`
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
}>

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
  },
): ListDecl<Item, Ctx> => ({
  kind: 'list',
  listPath,
  identity: spec.identity,
  ...(spec.item !== undefined ? { item: spec.item } : {}),
  ...(spec.list !== undefined ? { list: spec.list } : {}),
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
  minLength,
  maxLength,
  min,
  max,
  pattern,
} from './internal/validators/index.js'
