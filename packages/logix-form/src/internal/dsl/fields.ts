import type { Schema } from 'effect'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import * as Logix from '@logixjs/core'
import type { RuleEntry } from '../../Rule.js'

type NonNull<T> = Exclude<T, null | undefined>
type ListItem<T> = NonNull<T> extends readonly (infer Item)[] ? Item : never

export type NodeSpec<Input = unknown, Ctx = unknown> = Omit<
  FieldContracts.FieldNode<Input, Ctx>,
  '_tag' | 'check'
> & {
  readonly check?: Readonly<Record<string, RuleEntry<Input, Ctx>>>
}

export type ListSpec<Item = unknown> = Omit<FieldContracts.FieldList<Item>, '_tag' | 'item' | 'list'> & {
  readonly item?: NodeSpec<Item, any> | FieldContracts.FieldNode<Item, any>
  readonly list?: NodeSpec<ReadonlyArray<Item>, any> | FieldContracts.FieldNode<ReadonlyArray<Item>, any>
}

type NodeInput<Input, Ctx = unknown> = NodeSpec<Input, Ctx> | FieldContracts.FieldNode<Input, Ctx>

type ListInput<Item> = ListSpec<Item> | FieldContracts.FieldList<Item>

type FieldValueForPath<TValues extends object, P extends FieldContracts.StateFieldPath<TValues>> =
  | FieldContracts.FieldEntry<TValues, P>
  | NodeInput<FieldContracts.StateAtPath<TValues, P>, any>
  | (FieldContracts.StateAtPath<TValues, P> extends readonly any[]
      ? ListInput<ListItem<FieldContracts.StateAtPath<TValues, P>>>
      : never)

export type FieldsSpec<TValues extends object> = {
  readonly [P in FieldContracts.StateFieldPath<TValues>]?: FieldValueForPath<TValues, P>
} & {
  readonly $root?: NodeInput<TValues, any>
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && value !== null && !Array.isArray(value)

const isFieldNode = (value: unknown): value is FieldContracts.FieldNode<any, any> =>
  Boolean(value) && typeof value === 'object' && (value as any)._tag === 'FieldNode'

const isFieldList = (value: unknown): value is FieldContracts.FieldList<any> =>
  Boolean(value) && typeof value === 'object' && (value as any)._tag === 'FieldList'

const isFieldEntry = (value: unknown): value is FieldContracts.FieldEntry<any, any> =>
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

const normalizeNode = (value: unknown): FieldContracts.FieldNode<any, any> => {
  const raw = isFieldNode(value) ? (value as any) : (value as any)
  const checkRaw = raw?.check
  const check =
    checkRaw && typeof checkRaw === 'object' && !Array.isArray(checkRaw)
      ? Object.fromEntries(Object.entries(checkRaw).map(([k, v]) => [k, normalizeRule(v)]))
      : checkRaw
  return isFieldNode(value)
    ? ({ ...raw, ...(checkRaw !== undefined ? { check } : {}) } as any)
    : FieldContracts.fieldNode({ ...raw, ...(checkRaw !== undefined ? { check } : {}) })
}

const normalizeList = (value: unknown): FieldContracts.FieldList<any> => {
  const raw = isFieldList(value) ? (value as any) : (value as any)
  const item = raw?.item ? normalizeNodeOrListOrEntry(raw.item) : undefined
  const list = raw?.list ? normalizeNodeOrListOrEntry(raw.list) : undefined
  const next = {
    ...raw,
    ...(raw?.item !== undefined ? { item } : {}),
    ...(raw?.list !== undefined ? { list } : {}),
  }
  return isFieldList(value) ? (next as any) : FieldContracts.fieldList(next)
}

const normalizeNodeOrListOrEntry = (value: unknown): unknown => {
  if (isFieldEntry(value)) return value
  if (isFieldNode(value)) return normalizeNode(value)
  if (isFieldList(value)) return normalizeList(value)
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
 * Form.fields：
 * - Minimal expert helper for "type narrowing + fragment organization" under `$.logic({ fields })`.
 * - Allows mixing in raw node/list fragments (auto-fills FieldKernel.node/list tags).
 * - Form defaults `check.deps=[]`; only declare deps when you need "cross-field linked validation triggers".
 * - Returns a FieldSpec fragment consumed by internal lowering and expert-only tooling.
 * - Not part of the default public authoring path.
 */
export const fields = <TValues extends object>(_valuesSchema: Schema.Schema<TValues>) => {
  function run(spec: FieldsSpec<TValues>): FieldContracts.FieldSpec<TValues>
  function run(spec: FieldContracts.FieldSpec<TValues>): FieldContracts.FieldSpec<TValues>
  function run(spec: any): any {
    return Object.fromEntries(Object.entries(spec as any).map(([k, v]) => [k, normalizeNodeOrListOrEntry(v)])) as any
  }

  return run
}
