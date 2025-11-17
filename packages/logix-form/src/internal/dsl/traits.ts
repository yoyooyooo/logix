import type { Schema } from 'effect'
import * as Logix from '@logix/core'
import type { RuleEntry } from '../../Rule.js'

type NonNull<T> = Exclude<T, null | undefined>
type ListItem<T> = NonNull<T> extends readonly (infer Item)[] ? Item : never

export type NodeSpec<Input = unknown, Ctx = unknown> = Omit<
  Logix.StateTrait.StateTraitNode<Input, Ctx>,
  '_tag' | 'check'
> & {
  readonly check?: Readonly<Record<string, RuleEntry<Input, Ctx>>>
}

export type ListSpec<Item = unknown> = Omit<Logix.StateTrait.StateTraitList<Item>, '_tag' | 'item' | 'list'> & {
  readonly item?: NodeSpec<Item, any> | Logix.StateTrait.StateTraitNode<Item, any>
  readonly list?: NodeSpec<ReadonlyArray<Item>, any> | Logix.StateTrait.StateTraitNode<ReadonlyArray<Item>, any>
}

type NodeInput<Input, Ctx = unknown> = NodeSpec<Input, Ctx> | Logix.StateTrait.StateTraitNode<Input, Ctx>

type ListInput<Item> = ListSpec<Item> | Logix.StateTrait.StateTraitList<Item>

type TraitValueForPath<TValues extends object, P extends Logix.StateTrait.StateFieldPath<TValues>> =
  | Logix.StateTrait.StateTraitEntry<TValues, P>
  | NodeInput<Logix.StateTrait.StateAtPath<TValues, P>, any>
  | (Logix.StateTrait.StateAtPath<TValues, P> extends readonly any[]
      ? ListInput<ListItem<Logix.StateTrait.StateAtPath<TValues, P>>>
      : never)

export type TraitsSpec<TValues extends object> = {
  readonly [P in Logix.StateTrait.StateFieldPath<TValues>]?: TraitValueForPath<TValues, P>
} & {
  readonly $root?: NodeInput<TValues, any>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && value !== null && !Array.isArray(value)

const isStateTraitNode = (value: unknown): value is Logix.StateTrait.StateTraitNode<any, any> =>
  Boolean(value) && typeof value === 'object' && (value as any)._tag === 'StateTraitNode'

const isStateTraitList = (value: unknown): value is Logix.StateTrait.StateTraitList<any> =>
  Boolean(value) && typeof value === 'object' && (value as any)._tag === 'StateTraitList'

const isStateTraitEntry = (value: unknown): value is Logix.StateTrait.StateTraitEntry<any, any> =>
  Boolean(value) && typeof value === 'object' && typeof (value as any).kind === 'string'

const normalizeRule = (rule: unknown): unknown => {
  if (typeof rule === 'function') {
    return { deps: [], validate: rule }
  }
  if (!isPlainObject(rule)) return rule
  const validate = (rule as any).validate
  if (typeof validate !== 'function') return rule
  const depsRaw = (rule as any).deps
  const deps = Array.isArray(depsRaw) ? depsRaw : []
  return { ...rule, deps }
}

const normalizeNode = (value: unknown): Logix.StateTrait.StateTraitNode<any, any> => {
  const raw = isStateTraitNode(value) ? (value as any) : (value as any)
  const checkRaw = raw?.check
  const check =
    checkRaw && typeof checkRaw === 'object' && !Array.isArray(checkRaw)
      ? Object.fromEntries(Object.entries(checkRaw).map(([k, v]) => [k, normalizeRule(v)]))
      : checkRaw
  return isStateTraitNode(value)
    ? ({ ...raw, ...(checkRaw !== undefined ? { check } : {}) } as any)
    : Logix.StateTrait.node({ ...raw, ...(checkRaw !== undefined ? { check } : {}) })
}

const normalizeList = (value: unknown): Logix.StateTrait.StateTraitList<any> => {
  const raw = isStateTraitList(value) ? (value as any) : (value as any)
  const item = raw?.item ? normalizeNodeOrListOrEntry(raw.item) : undefined
  const list = raw?.list ? normalizeNodeOrListOrEntry(raw.list) : undefined
  const next = {
    ...raw,
    ...(raw?.item !== undefined ? { item } : {}),
    ...(raw?.list !== undefined ? { list } : {}),
  }
  return isStateTraitList(value) ? (next as any) : Logix.StateTrait.list(next)
}

const normalizeNodeOrListOrEntry = (value: unknown): unknown => {
  if (isStateTraitEntry(value)) return value
  if (isStateTraitNode(value)) return normalizeNode(value)
  if (isStateTraitList(value)) return normalizeList(value)
  if (isPlainObject(value)) {
    if ('item' in value || 'list' in value || 'identityHint' in value) {
      return normalizeList(value)
    }
    if ('check' in value || 'computed' in value || 'source' in value || 'link' in value || 'meta' in value) {
      return normalizeNode(value)
    }
  }
  return value
}

/**
 * Form.traits：
 * - Phase 3: a minimal entry point for "type narrowing + fragment organization".
 * - Allows mixing in raw node/list fragments (auto-fills StateTrait.node/list tags).
 * - Form defaults `check.deps=[]`; only declare deps when you need "cross-field linked validation triggers".
 * - Returns a StateTraitSpec fragment that can be spread directly (assembled by Form.make).
 */
export const traits = <TValues extends object, I>(_valuesSchema: Schema.Schema<TValues, I>) => {
  function run(spec: TraitsSpec<TValues>): Logix.StateTrait.StateTraitSpec<TValues>
  function run(spec: Logix.StateTrait.StateTraitSpec<TValues>): Logix.StateTrait.StateTraitSpec<TValues>
  function run(spec: any): any {
    return Object.fromEntries(Object.entries(spec as any).map(([k, v]) => [k, normalizeNodeOrListOrEntry(v)])) as any
  }

  return run
}
