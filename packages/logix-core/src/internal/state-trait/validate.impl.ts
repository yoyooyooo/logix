import { Effect, FiberRef } from 'effect'
import { create } from 'mutative'
import type { PatchReason, StateTxnOrigin } from '../runtime/core/StateTransaction.js'
import { normalizeFieldPath, type FieldPath, type FieldPathId } from '../field-path.js'
import * as Debug from '../runtime/core/DebugSink.js'
import { buildDependencyGraph } from './graph.js'
import type { StateTraitEntry, StateTraitProgram } from './model.js'
import { reverseClosure } from './reverse-closure.js'
import type * as RowId from './rowid.js'

export type ValidateMode = 'submit' | 'blur' | 'valueChange' | 'manual'

/**
 * RULE_SKIP：
 * - Used by rules to indicate "skip execution for this run" (e.g. validateOn gating).
 * - Distinct from `undefined` ("no error after execution"): skip must not clear existing errors.
 */
const RULE_SKIP = Symbol.for('logix.state-trait.validate.skip')

export type ValidateTarget =
  | { readonly kind: 'root' }
  | { readonly kind: 'field'; readonly path: string }
  | {
      readonly kind: 'list'
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
    }
  | {
      readonly kind: 'item'
      readonly path: string
      readonly listIndexPath?: ReadonlyArray<number>
      readonly index: number
      readonly field?: string
    }

export interface ScopedValidateRequest {
  readonly mode: ValidateMode
  readonly target: ValidateTarget
}

export interface ValidateContext<S> {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly txnSeq?: number
  readonly txnId?: string
  /**
   * External trigger at transaction start: stabilizes validate attribution to the txn origin,
   * preventing in-transaction derived writes from polluting attribution.
   */
  readonly origin?: StateTxnOrigin
  /**
   * RowIdStore: stable row identity for list scopes (later `$rowId` and rowIdMode depend on this).
   */
  readonly rowIdStore?: RowId.RowIdStore
  /**
   * List config hint from StateTraitSpec.list.identityHint (trackBy), used for rowIdMode explanation and degrade diagnostics.
   */
  readonly listConfigs?: ReadonlyArray<RowId.ListConfig>
  readonly getDraft: () => S
  readonly setDraft: (next: S) => void
  readonly recordPatch: (
    path: string | FieldPath | FieldPathId | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ) => void
}

type RuleContext = {
  readonly mode: ValidateMode
  readonly state: unknown
  readonly scope: {
    readonly fieldPath: string
    readonly listPath?: string
    readonly listIndexPath?: ReadonlyArray<number>
    readonly index?: number
  }
}

const parseSegments = (path: string): ReadonlyArray<string | number> => {
  if (!path) return []
  return path.split('.').map((seg) => (/^[0-9]+$/.test(seg) ? Number(seg) : seg))
}

const getAtPath = (state: any, path: string): any => {
  if (!path || state == null) return state
  const segments = parseSegments(path)
  let current: any = state
  for (const seg of segments) {
    if (current == null) return undefined
    current = current[seg as any]
  }
  return current
}

const setAtPathMutating = (draft: unknown, path: string, value: unknown): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const nextKey = segments[i + 1]!

    const next = current[key as any]
    if (next == null || typeof next !== 'object') {
      current[key as any] = typeof nextKey === 'number' ? [] : {}
    }
    current = current[key as any]
  }

  const last = segments[segments.length - 1]!
  current[last as any] = value
}

const unsetAtPathMutating = (draft: unknown, path: string): void => {
  if (!path) return
  const segments = parseSegments(path)
  if (segments.length === 0) return

  let current: any = draft
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!
    const next = current[key as any]
    if (next == null || typeof next !== 'object') {
      return
    }
    current = next
  }

  const last = segments[segments.length - 1]!
  if (Array.isArray(current) && typeof last === 'number') {
    current[last] = undefined
    return
  }
  if (current && typeof current === 'object') {
    delete current[last as any]
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeErrorValue = (value: unknown): unknown => (value === undefined || value === null ? undefined : value)

const mergeRuleErrors = (errors: ReadonlyArray<unknown>): unknown => {
  if (errors.length === 0) return undefined
  if (errors.length === 1) return errors[0]

  // ErrorValue constraint: arrays must not represent "multiple errors"; for duplicates on the same field, keep the first deterministically.
  if (errors.every(isPlainObject)) {
    const merged: Record<string, unknown> = {}
    for (const patch of errors as ReadonlyArray<Record<string, unknown>>) {
      for (const key of Object.keys(patch)) {
        const incoming = normalizeErrorValue(patch[key])
        if (incoming === undefined) continue
        if (!(key in merged)) merged[key] = incoming
      }
    }
    return Object.keys(merged).length > 0 ? merged : undefined
  }

  return errors[0]
}

type ErrorValueLeafObject = {
  readonly message: string
  readonly code?: string
  readonly details?: unknown
}

const isErrorValueLeafObject = (value: unknown): value is ErrorValueLeafObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const anyValue = value as Record<string, unknown>
  const msg = anyValue.message
  if (typeof msg !== 'string' || msg.length === 0) return false
  for (const key of Object.keys(anyValue)) {
    if (key !== 'message' && key !== 'code' && key !== 'details') return false
  }
  const code = anyValue.code
  if (code !== undefined && (typeof code !== 'string' || code.length === 0)) return false
  return true
}

const countErrorLeaves = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'string') return value.length > 0 ? 1 : 0
  if (Array.isArray(value)) return value.reduce((acc, v) => acc + countErrorLeaves(v), 0)
  if (typeof value === 'object') {
    if (isErrorValueLeafObject(value)) return 1
    let acc = 0
    for (const [k, v] of Object.entries(value as any)) {
      if (k === '$rowId') continue
      acc += countErrorLeaves(v)
    }
    return acc
  }
  return 1
}

type ListScopeResult = {
  readonly listError?: unknown
  readonly rows?: ReadonlyArray<unknown>
  readonly traces?: ReadonlyArray<ListScopeRuleTrace>
  readonly touchedKeys: ReadonlySet<string>
  readonly touchedListError: boolean
}

type TraitCheckOp = 'set' | 'unset' | 'insert' | 'remove'

type ListScopeRuleTrace = {
  readonly ruleId: string
  readonly summary: {
    readonly scannedRows: number
    readonly affectedRows: number
    readonly changedRows: number
    readonly setCount?: number
    readonly clearedCount?: number
    readonly durationMs?: number
  }
}

type TraitCheckRowIdMode = 'trackBy' | 'store' | 'index'

type TraitCheckDegraded = {
  readonly kind: string
  readonly message?: string
}

const nowMs = (() => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === 'function') {
    return () => perf.now()
  }
  return () => Date.now()
})()

const isTraitCheckOp = (value: unknown): value is TraitCheckOp =>
  value === 'set' || value === 'unset' || value === 'insert' || value === 'remove'

const normalizeTraitCheckPath = (path: string): ReadonlyArray<string> => normalizeFieldPath(path) ?? ['$root']

const sameFieldPath = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

const toTraitCheckTrigger = (
  origin: StateTxnOrigin | undefined,
  fallbackPath: string,
): { readonly kind: string; readonly path: ReadonlyArray<string>; readonly op: TraitCheckOp } => {
  const details = origin?.details
  const detailsObj = isPlainObject(details) ? (details as Record<string, unknown>) : undefined
  const tag = detailsObj && typeof detailsObj._tag === 'string' ? detailsObj._tag : undefined

  const kindBase = origin?.kind && origin.kind.length > 0 ? origin.kind : 'unknown'
  const kind =
    tag && tag.length > 0
      ? `${kindBase}:${tag}`
      : origin?.name && origin.name.length > 0
        ? `${kindBase}:${origin.name}`
        : kindBase

  const opRaw = detailsObj?.op
  const op: TraitCheckOp = isTraitCheckOp(opRaw) ? opRaw : 'set'

  const pathRaw = detailsObj && typeof detailsObj.path === 'string' ? detailsObj.path : undefined
  const path = normalizeTraitCheckPath(pathRaw ?? fallbackPath)

  return { kind, path, op }
}

const toTraitCheckRowIdMode = (params: {
  readonly trackBy?: string
  readonly rowIdStore?: RowId.RowIdStore
}): TraitCheckRowIdMode => {
  if (params.trackBy) return 'trackBy'
  if (params.rowIdStore) return 'store'
  return 'index'
}

const toTraitCheckDegraded = (
  trigger: { readonly op: TraitCheckOp; readonly path: ReadonlyArray<string> },
  scopeFieldPath: ReadonlyArray<string>,
  rowIdMode: TraitCheckRowIdMode,
): TraitCheckDegraded | undefined => {
  if (rowIdMode === 'trackBy') return undefined
  if (trigger.op !== 'set') return undefined
  if (!sameFieldPath(trigger.path, scopeFieldPath)) return undefined
  return {
    kind: 'rowId:degraded:no_trackBy_root_replace',
    message: 'list root was replaced without trackBy; rowId stability is degraded',
  }
}

const mergeRowPatchPreferFirst = (
  base: Record<string, unknown> | undefined,
  incoming: unknown,
): Record<string, unknown> | undefined => {
  if (!isPlainObject(incoming)) return base
  const next: Record<string, unknown> = base ? { ...base } : {}
  for (const key of Object.keys(incoming)) {
    const v = normalizeErrorValue(incoming[key])
    if (v === undefined) continue
    if (!(key in next)) next[key] = v
  }
  return Object.keys(next).length > 0 ? next : undefined
}

const shallowEqualPlainObject = (a: Record<string, unknown>, b: Record<string, unknown>): boolean => {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!Object.is(a[key], b[key])) return false
  }
  return true
}

const collectRuleKeysFromDeps = (rule: unknown, listPath: string): ReadonlyArray<string> => {
  if (!rule || typeof rule !== 'object') return []
  const deps = (rule as any).deps
  if (!Array.isArray(deps)) return []

  const prefix = `${listPath}[].`
  const keys: Array<string> = []
  for (const dep of deps) {
    if (typeof dep !== 'string') continue
    if (dep.startsWith(prefix)) {
      const key = dep.slice(prefix.length)
      if (key) keys.push(key)
      continue
    }
    if (dep.length > 0 && !dep.includes('.') && !dep.includes('[') && !dep.includes(']')) {
      keys.push(dep)
    }
  }

  return Array.from(new Set(keys)).sort()
}

const evalListScopeCheck = (
  entry: Extract<StateTraitEntry<any, string>, { readonly kind: 'check' }>,
  input: unknown,
  ctx: RuleContext,
  options?: {
    readonly trace?: {
      readonly listPath: string
      readonly errorsBasePath: string
      readonly errorsRoot: unknown
    }
  },
): ListScopeResult | typeof RULE_SKIP => {
  const rules = entry.meta.rules as Record<string, any>
  const names = Object.keys(rules).sort()

  let listError: unknown | undefined = undefined
  let rows: Array<Record<string, unknown> | undefined> | undefined = undefined
  let traces: Array<ListScopeRuleTrace> | undefined = undefined
  let ran = false
  let touchedListError = false
  const touchedKeys = new Set<string>()
  const listPath = ctx.scope.listPath ?? ctx.scope.fieldPath

  const mergeRows = (incomingRows: ReadonlyArray<unknown>): void => {
    if (!rows) rows = []
    const limit = Math.max(rows.length, incomingRows.length)
    if (rows.length < limit) rows.length = limit

    for (let i = 0; i < incomingRows.length; i++) {
      const merged = mergeRowPatchPreferFirst(rows[i], incomingRows[i])
      rows[i] = merged
    }
  }

  const summarizeRuleRows = (
    errorsBasePath: string,
    keys: ReadonlyArray<string>,
    scannedRows: number,
    rowsPatch: ReadonlyArray<unknown> | undefined,
  ): {
    readonly affectedRows: number
    readonly changedRows: number
    readonly setCount: number
    readonly clearedCount: number
  } => {
    if (keys.length === 0 || scannedRows <= 0) {
      return { affectedRows: 0, changedRows: 0, setCount: 0, clearedCount: 0 }
    }

    let affectedRows = 0
    let changedRows = 0
    let setCount = 0
    let clearedCount = 0

    for (let index = 0; index < scannedRows; index++) {
      const prevRow = getAtPath(options?.trace?.errorsRoot as any, `${errorsBasePath}.rows.${index}`)
      const prevObj = isPlainObject(prevRow) ? (prevRow as Record<string, unknown>) : undefined
      const patch = rowsPatch?.[index]
      const patchObj = isPlainObject(patch) ? (patch as Record<string, unknown>) : undefined

      let hasPrev = false
      let hasNext = false
      let rowChanged = false

      for (const key of keys) {
        const prev = normalizeErrorValue(prevObj?.[key])
        const next = normalizeErrorValue(patchObj?.[key])
        if (prev !== undefined) hasPrev = true
        if (next !== undefined) hasNext = true
        if (Object.is(prev, next)) continue
        rowChanged = true
        if (next === undefined) {
          if (prev !== undefined) clearedCount += 1
        } else {
          setCount += 1
        }
      }

      if (hasPrev || hasNext) affectedRows += 1
      if (rowChanged) changedRows += 1
    }

    return { affectedRows, changedRows, setCount, clearedCount }
  }

  for (const name of names) {
    const rule = rules[name]
    const collectTrace = options?.trace?.listPath && options?.trace?.errorsRoot
    const startedAt = collectTrace ? nowMs() : 0
    try {
      const out =
        typeof rule === 'function'
          ? rule(input, ctx)
          : rule && typeof rule === 'object'
            ? rule.validate(input, ctx)
            : undefined

      if (out === RULE_SKIP) continue
      ran = true

      for (const key of collectRuleKeysFromDeps(rule, listPath)) {
        touchedKeys.add(key)
      }

      if (collectTrace) {
        const traceListPath = options!.trace!.listPath
        const traceErrorsBasePath = options!.trace!.errorsBasePath
        const keys = collectRuleKeysFromDeps(rule, traceListPath)
        const scannedRows = Array.isArray(input) ? input.length : 0

        const rowsPatch: ReadonlyArray<unknown> | undefined = Array.isArray(out)
          ? out
          : isPlainObject(out) && Array.isArray((out as any).rows)
            ? ((out as any).rows as ReadonlyArray<unknown>)
            : undefined

        const summary = summarizeRuleRows(traceErrorsBasePath, keys, scannedRows, rowsPatch)
        const durationMs = Math.max(0, nowMs() - startedAt)

        if (!traces) traces = []
        traces.push({
          ruleId: `${entry.fieldPath}#${name}`,
          summary: {
            scannedRows,
            affectedRows: summary.affectedRows,
            changedRows: summary.changedRows,
            setCount: summary.setCount,
            clearedCount: summary.clearedCount,
            durationMs,
          },
        })
      }

      if (out === undefined) continue

      if (Array.isArray(out)) {
        mergeRows(out)
        continue
      }

      if (isPlainObject(out)) {
        const maybeRows = (out as any).rows
        const hasListKey = Object.prototype.hasOwnProperty.call(out, '$list')
        if (hasListKey) touchedListError = true
        const maybeListError = normalizeErrorValue((out as any).$list)
        if (maybeListError !== undefined && listError === undefined) {
          listError = maybeListError
        }
        if (Array.isArray(maybeRows)) {
          mergeRows(maybeRows)
        } else if (!hasListKey && maybeListError === undefined) {
          // Allow list-scope rules to return a `$list` error value (string/object) directly without implying a rows structure.
          const v = normalizeErrorValue(out)
          if (v !== undefined && listError === undefined) listError = v
          touchedListError = true
        }
        continue
      }

      // Non object/array: treat as a `$list` error value.
      const v = normalizeErrorValue(out)
      if (v !== undefined && listError === undefined) listError = v
      touchedListError = true
    } catch {
      // Rule runtime error: keep it a no-op to avoid producing a partial error tree.
      // Diagnostics and degrade handling are handled by DebugSink/DevtoolsHub in later phases.
    }
  }

  if (!ran) return RULE_SKIP
  return {
    listError,
    rows,
    traces,
    touchedKeys,
    touchedListError,
  }
}

const toPatternPath = (path: string): string => {
  if (!path) return path
  const segments = path.split('.').filter(Boolean)
  const out: Array<string> = []

  for (const seg of segments) {
    if (/^[0-9]+$/.test(seg)) {
      if (out.length === 0) continue
      const last = out[out.length - 1]!
      if (!last.endsWith('[]')) out[out.length - 1] = `${last}[]`
      continue
    }
    out.push(seg)
  }

  return out.join('.')
}

const toGraphTargets = (target: ValidateTarget): ReadonlyArray<string> => {
  if (target.kind === 'root') {
    return []
  }
  if (target.kind === 'field') {
    return [toPatternPath(target.path)]
  }
  if (target.kind === 'list') {
    // A list target should hit both list-scope check (fieldPath=listPath) and item-scope check (fieldPath=listPath[]).
    return [target.path, `${target.path}[]`]
  }
  // item
  const base = `${target.path}[]`
  const field = target.field ? toPatternPath(target.field) : undefined
  return [field ? `${base}.${field}` : base]
}

const normalizeListIndexPath = (listIndexPath: ReadonlyArray<number> | undefined): ReadonlyArray<number> => {
  if (!Array.isArray(listIndexPath) || listIndexPath.length === 0) return []
  const out: Array<number> = []
  for (const n of listIndexPath) {
    if (!Number.isInteger(n) || n < 0) continue
    out.push(n)
  }
  return out
}

const toListInstanceKey = (listPath: string, listIndexPath: ReadonlyArray<number> | undefined): string => {
  const p = normalizeListIndexPath(listIndexPath)
  return p.length === 0 ? `${listPath}@@` : `${listPath}@@${p.join(',')}`
}

const extractIndexBindings = (requests: ReadonlyArray<ScopedValidateRequest>): Map<string, ReadonlySet<number>> => {
  const map = new Map<string, Set<number>>()
  for (const req of requests) {
    if (req.target.kind !== 'item') continue
    const key = toListInstanceKey(req.target.path, req.target.listIndexPath)
    const set = map.get(key) ?? new Set<number>()
    set.add(req.target.index)
    map.set(key, set)
  }
  return map
}

const extractListBindings = (
  requests: ReadonlyArray<ScopedValidateRequest>,
): {
  readonly all: ReadonlySet<string>
  readonly instances: ReadonlySet<string>
} => {
  const all = new Set<string>()
  const instances = new Set<string>()
  for (const req of requests) {
    if (req.target.kind !== 'list') continue
    if (!req.target.path) continue
    if (req.target.listIndexPath && req.target.listIndexPath.length > 0) {
      instances.add(toListInstanceKey(req.target.path, req.target.listIndexPath))
      continue
    }
    all.add(req.target.path)
  }
  return { all, instances }
}

const resolveMode = (requests: ReadonlyArray<ScopedValidateRequest>): ValidateMode => {
  const priorities: Record<ValidateMode, number> = {
    submit: 4,
    blur: 3,
    valueChange: 2,
    manual: 1,
  }
  let best: ValidateMode = 'manual'
  let bestP = priorities[best]
  for (const r of requests) {
    const p = priorities[r.mode]
    if (p > bestP) {
      bestP = p
      best = r.mode
    }
  }
  return best
}

const evalCheck = (
  entry: Extract<StateTraitEntry<any, string>, { readonly kind: 'check' }>,
  input: unknown,
  ctx: RuleContext,
): unknown => {
  const rules = entry.meta.rules as Record<string, any>
  const names = Object.keys(rules).sort()
  const results: Array<unknown> = []
  let ran = false

  for (const name of names) {
    const rule = rules[name]
    try {
      const out =
        typeof rule === 'function'
          ? rule(input, ctx)
          : rule && typeof rule === 'object'
            ? rule.validate(input, ctx)
            : undefined
      if (out === RULE_SKIP) continue
      ran = true
      const normalized = normalizeErrorValue(out)
      if (normalized !== undefined) results.push(normalized)
    } catch {
      // Rule runtime error: keep it a no-op to avoid producing a partial error tree.
      // Diagnostics and degrade handling are handled by DebugSink/DevtoolsHub in later phases.
    }
  }

  if (!ran) return RULE_SKIP
  return mergeRuleErrors(results)
}

type ErrorUpdate = {
  readonly errorPath: string
  readonly prev: unknown
  readonly next: unknown
  readonly stepId: string
}

/**
 * validateInTransaction：
 * - Execute a batch of scoped validate requests within an already-started StateTransaction.
 * - Compute the minimal check set via ReverseClosure, and write results back to `state.errors.*`.
 * - If no actual error changes occur, do not update the draft (preserve 0-commit semantics).
 */
export const validateInTransaction = <S extends object>(
  program: StateTraitProgram<S>,
  ctx: ValidateContext<S>,
  requests: ReadonlyArray<ScopedValidateRequest>,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    const enableTrace = diagnosticsLevel !== 'off'
    const traceEvents: Array<Debug.Event> | undefined = enableTrace ? [] : undefined

    yield* Effect.sync(() => {
      if (requests.length === 0) return

      const checks = program.entries.filter(
        (e): e is Extract<StateTraitEntry<any, string>, { readonly kind: 'check' }> => (e as any).kind === 'check',
      )
      if (checks.length === 0) return

      const hasRoot = requests.some((r) => r.target.kind === 'root')
      const draft = ctx.getDraft() as any

      // Compute check scopes to execute (set of field paths).
      const scopesToValidate = (() => {
        if (hasRoot) {
          return new Set<string>(checks.map((c) => c.fieldPath))
        }
        const graph = buildDependencyGraph(program)
        const set = new Set<string>()
        for (const req of requests) {
          for (const t of toGraphTargets(req.target)) {
            for (const node of reverseClosure(graph, t)) {
              set.add(node)
            }
          }
        }
        return set
      })()

      const selectedChecks = checks.filter((c) => scopesToValidate.has(c.fieldPath))
      if (selectedChecks.length === 0) return

      const mode = resolveMode(requests)

      if (enableTrace && traceEvents) {
        traceEvents.push({
          type: 'trace:trait:validate',
          moduleId: ctx.moduleId,
          instanceId: ctx.instanceId,
          txnSeq: ctx.txnSeq,
          txnId: ctx.txnId,
          data: {
            mode,
            requestCount: requests.length,
            selectedCheckCount: selectedChecks.length,
            hasRoot,
          },
        })
      }

      // Item-scope bindings: used only for non-root validate (root validate runs full length by current arrays).
      const indexBindings = extractIndexBindings(requests)
      const listBindings = extractListBindings(requests)
      const listBindingsAll = listBindings.all
      const listBindingsInstances = listBindings.instances

      const instanceIndexPathByKey = (() => {
        const map = new Map<string, ReadonlyArray<number>>()
        for (const req of requests) {
          if (req.target.kind !== 'item' && req.target.kind !== 'list') continue
          const key = toListInstanceKey(req.target.path, req.target.listIndexPath)
          map.set(key, normalizeListIndexPath(req.target.listIndexPath))
        }
        return map
      })()

      const updates: Array<ErrorUpdate> = []

      const listConfigByPath = (() => {
        const map = new Map<string, RowId.ListConfig>()
        const configs = ctx.listConfigs ?? []
        for (const cfg of configs) {
          if (!cfg || typeof (cfg as any).path !== 'string') continue
          map.set((cfg as any).path, cfg as any)
        }
        return map
      })()

      const readTrackBy = (item: unknown, trackBy: string): unknown => {
        if (!item || typeof item !== 'object') return undefined
        const segments = trackBy.split('.')
        let current: any = item
        for (const seg of segments) {
          if (current == null) return undefined
          current = current[seg as any]
        }
        return current
      }

      const makeStepId = (fieldPath: string, index?: number): string =>
        index === undefined ? `check:${fieldPath}` : `check:${fieldPath}@${index}`

      type ListRuntime = {
        readonly listPath: string
        readonly listIndexPath: ReadonlyArray<number>
        readonly valuePath: string
        readonly errorBasePath: string
        readonly parentRowId?: RowId.RowId
        readonly items: ReadonlyArray<unknown>
        readonly trackBy?: string
        readonly rowIds?: ReadonlyArray<string>
      }

      const listPaths = Array.from(listConfigByPath.keys())
      const listPathSet = new Set(listPaths)

      const parentOf = (path: string): string | undefined => {
        const segments = path.split('.').filter(Boolean)
        let best: string | undefined
        for (let i = 1; i < segments.length; i++) {
          const prefix = segments.slice(0, i).join('.')
          if (listPathSet.has(prefix)) best = prefix
        }
        return best
      }

      const parentByPath = new Map<string, string | undefined>()
      const suffixByPath = new Map<string, string>()
      for (const path of listPaths) {
        const parent = parentOf(path)
        parentByPath.set(path, parent)
        const suffix = parent ? path.slice(parent.length + 1) : path
        suffixByPath.set(path, suffix)
      }

      const normalizeInstanceIndexPath = (
        listPath: string,
        listIndexPath: ReadonlyArray<number> | undefined,
      ): ReadonlyArray<number> | undefined => {
        const normalized = normalizeListIndexPath(listIndexPath)
        let expected = 0
        let p = parentByPath.get(listPath)
        while (p) {
          expected += 1
          p = parentByPath.get(p)
        }
        if (expected === 0) return []
        if (normalized.length !== expected) return undefined
        return normalized
      }

      const listRuntimeByKey = new Map<string, ListRuntime>()

      const getListRuntime = (listPath: string, listIndexPath: ReadonlyArray<number>): ListRuntime | undefined => {
        const parent = parentByPath.get(listPath)
        const cacheKey = parent ? `${listPath}@@#${listIndexPath.join(',')}` : `${listPath}@@root`

        const cached = listRuntimeByKey.get(cacheKey)
        if (cached) return cached

        const listCfg = listConfigByPath.get(listPath)
        const trackBy =
          listCfg && typeof (listCfg as any).trackBy === 'string' ? ((listCfg as any).trackBy as string) : undefined

        if (!parent) {
          const listValue = getAtPath(draft, listPath)
          const items: ReadonlyArray<unknown> = Array.isArray(listValue) ? listValue : []
          const rowIds: ReadonlyArray<string> | undefined = ctx.rowIdStore
            ? ctx.rowIdStore.ensureList(listPath, items, trackBy)
            : undefined

          const out: ListRuntime = {
            listPath,
            listIndexPath: [],
            valuePath: listPath,
            errorBasePath: `errors.${listPath}`,
            items,
            trackBy,
            rowIds,
          }
          listRuntimeByKey.set(cacheKey, out)
          return out
        }

        if (listIndexPath.length === 0) return undefined
        const parentIndexPath = listIndexPath.slice(0, -1)
        const parentIndex = listIndexPath[listIndexPath.length - 1]!
        const parentRuntime = getListRuntime(parent, parentIndexPath)
        if (!parentRuntime) return undefined
        if (parentIndex < 0 || parentIndex >= parentRuntime.items.length) return undefined

        const suffix = suffixByPath.get(listPath) ?? ''
        if (!suffix) return undefined

        const valuePath = `${parentRuntime.valuePath}.${parentIndex}.${suffix}`
        const errorBasePath = `${parentRuntime.errorBasePath}.rows.${parentIndex}.${suffix}`

        const listValue = getAtPath(draft, valuePath)
        const items: ReadonlyArray<unknown> = Array.isArray(listValue) ? listValue : []

        const parentRowId =
          (parentRuntime.rowIds?.[parentIndex] as any) ??
          (ctx.rowIdStore ? ctx.rowIdStore.getRowId(parent, parentIndex, parentRuntime.parentRowId) : undefined)

        const rowIds: ReadonlyArray<string> | undefined = ctx.rowIdStore
          ? ctx.rowIdStore.ensureList(listPath, items, trackBy, parentRowId)
          : undefined

        const out: ListRuntime = {
          listPath,
          listIndexPath,
          valuePath,
          errorBasePath,
          parentRowId,
          items,
          trackBy,
          rowIds,
        }
        listRuntimeByKey.set(cacheKey, out)
        return out
      }

      const enumerateAllListInstances = (listPath: string): ReadonlyArray<ListRuntime> => {
        const parent = parentByPath.get(listPath)
        if (!parent) {
          const rt = getListRuntime(listPath, [])
          return rt ? [rt] : []
        }

        const parentInstances = enumerateAllListInstances(parent)
        const out: Array<ListRuntime> = []
        for (const p of parentInstances) {
          for (let i = 0; i < p.items.length; i++) {
            const childIndexPath = [...p.listIndexPath, i]
            const rt = getListRuntime(listPath, childIndexPath)
            if (rt) out.push(rt)
          }
        }
        return out
      }

      type RowDraft = {
        readonly listPath: string
        readonly listIndexPath: ReadonlyArray<number>
        readonly parentRowId?: RowId.RowId
        readonly index: number
        readonly errorBasePath: string
        readonly errorPath: string
        readonly prev: unknown
        readonly next: Record<string, unknown>
        readonly stepId: string
        removed?: boolean
      }

      const rowDrafts = new Map<string, RowDraft>()

      const getOrCreateRowDraft = (list: ListRuntime, index: number, stepId: string): RowDraft => {
        const errorPath = `${list.errorBasePath}.rows.${index}`
        const existing = rowDrafts.get(errorPath)
        if (existing) return existing

        const prev = getAtPath(draft, errorPath)
        const next: Record<string, unknown> = isPlainObject(prev) ? { ...(prev as any) } : {}

        const out: RowDraft = {
          listPath: list.listPath,
          listIndexPath: list.listIndexPath,
          parentRowId: list.parentRowId,
          index,
          errorBasePath: list.errorBasePath,
          errorPath,
          prev,
          next,
          stepId,
          removed: false,
        }
        rowDrafts.set(errorPath, out)
        return out
      }

      const applyScopedRowPatch = (
        row: RowDraft,
        keysFromDeps: ReadonlySet<string>,
        patchObj: Record<string, unknown> | undefined,
      ): void => {
        if (keysFromDeps.size === 0) return

        const patchKeys = patchObj ? Object.keys(patchObj) : []
        const existingKeys = Object.keys(row.next).filter((k) => k !== '$rowId')

        const keysToApply = new Set<string>()
        for (const key of existingKeys) {
          if (keysFromDeps.has(key)) keysToApply.add(key)
        }
        for (const key of patchKeys) {
          if (keysFromDeps.has(key)) keysToApply.add(key)
        }

        if (keysToApply.size === 0) return

        for (const key of keysToApply) {
          const v = normalizeErrorValue(patchObj?.[key])
          if (v === undefined) {
            delete row.next[key]
          } else {
            row.next[key] = v
          }
        }
      }

      for (const check of selectedChecks) {
        const scopeFieldPath = check.fieldPath

        // list-scope check: write back into `$list/rows[]` (errors.<listPath>.$list / errors.<listPath>.rows[i].*).
        const listCfg = listConfigByPath.get(scopeFieldPath)
        if (listCfg) {
          const listPath = scopeFieldPath
          const listInstances = (() => {
            if (hasRoot) return enumerateAllListInstances(listPath)
            if (listBindingsAll.has(listPath)) return enumerateAllListInstances(listPath)

            const keys = new Set<string>()
            for (const k of listBindingsInstances) {
              if (k.startsWith(`${listPath}@@`)) keys.add(k)
            }
            for (const k of indexBindings.keys()) {
              if (k.startsWith(`${listPath}@@`)) keys.add(k)
            }

            if (keys.size === 0) return enumerateAllListInstances(listPath)

            const out: Array<ListRuntime> = []
            for (const k of keys) {
              const indexPath = instanceIndexPathByKey.get(k)
              const normalized = normalizeInstanceIndexPath(listPath, indexPath)
              if (!normalized) continue
              const rt = getListRuntime(listPath, normalized)
              if (rt) out.push(rt)
            }
            return out
          })()

          for (const listRuntime of listInstances) {
            const items = listRuntime.items

            const trigger = enableTrace ? toTraitCheckTrigger(ctx.origin, listPath) : undefined

            const scopeFieldPathSegments = enableTrace ? normalizeTraitCheckPath(listPath) : undefined

            const rowIdMode = enableTrace
              ? toTraitCheckRowIdMode({
                  trackBy: listRuntime.trackBy,
                  rowIdStore: ctx.rowIdStore,
                })
              : undefined

            const degraded =
              enableTrace && trigger && scopeFieldPathSegments && rowIdMode
                ? toTraitCheckDegraded(trigger, scopeFieldPathSegments, rowIdMode)
                : undefined

            const next = evalListScopeCheck(
              check,
              items,
              {
                mode,
                state: draft,
                scope: { fieldPath: scopeFieldPath, listPath, listIndexPath: listRuntime.listIndexPath },
              },
              enableTrace
                ? {
                    trace: { listPath, errorsBasePath: listRuntime.errorBasePath, errorsRoot: draft },
                  }
                : undefined,
            )
            if (next === RULE_SKIP) continue
            const keysFromDeps = next.touchedKeys

            if (
              enableTrace &&
              traceEvents &&
              trigger &&
              scopeFieldPathSegments &&
              rowIdMode &&
              next.traces &&
              next.traces.length > 0
            ) {
              for (const t of next.traces) {
                const data: any = {
                  ruleId: t.ruleId,
                  scopeFieldPath: scopeFieldPathSegments,
                  mode,
                  trigger,
                  summary: t.summary,
                  rowIdMode,
                }
                if (degraded) {
                  data.degraded = degraded
                }
                traceEvents.push({
                  type: 'trace:trait:check',
                  moduleId: ctx.moduleId,
                  instanceId: ctx.instanceId,
                  txnSeq: ctx.txnSeq,
                  txnId: ctx.txnId,
                  data,
                })
              }
            }

            const listErrorPath = `${listRuntime.errorBasePath}.$list`
            const prevListError = getAtPath(draft, listErrorPath)
            const nextListError = normalizeErrorValue(next.listError)

            if (next.touchedListError && !Object.is(prevListError, nextListError)) {
              updates.push({
                errorPath: listErrorPath,
                prev: prevListError,
                next: nextListError,
                stepId: makeStepId(scopeFieldPath),
              })
            }

            const rows = next.rows ?? []
            const prevRows = getAtPath(draft, `${listRuntime.errorBasePath}.rows`)
            const prevLen = Array.isArray(prevRows) ? prevRows.length : 0
            const limit = Math.max(items.length, rows.length, prevLen)

            for (let index = 0; index < limit; index++) {
              const rowErrorPath = `${listRuntime.errorBasePath}.rows.${index}`
              const existing = rowDrafts.get(rowErrorPath)

              if (index >= items.length) {
                const prevRow = existing?.prev ?? getAtPath(draft, rowErrorPath)
                if (prevRow === undefined && !existing) continue
                const row = existing ?? getOrCreateRowDraft(listRuntime, index, makeStepId(scopeFieldPath, index))
                row.removed = true
                for (const key of Object.keys(row.next)) {
                  delete row.next[key]
                }
                continue
              }

              const patch = rows[index]
              const patchObj = isPlainObject(patch) ? patch : undefined

              if (existing) {
                applyScopedRowPatch(existing, keysFromDeps, patchObj)
                continue
              }

              const patchHasRelevant = patchObj && Object.keys(patchObj).some((k) => keysFromDeps.has(k))

              if (patchHasRelevant) {
                const row = getOrCreateRowDraft(listRuntime, index, makeStepId(scopeFieldPath, index))
                applyScopedRowPatch(row, keysFromDeps, patchObj)
                continue
              }

              const prevRow = getAtPath(draft, rowErrorPath)
              const prevHasRelevant =
                isPlainObject(prevRow) && Object.keys(prevRow).some((k) => k !== '$rowId' && keysFromDeps.has(k))
              const prevOnlyRowId =
                isPlainObject(prevRow) && Object.keys(prevRow).length === 1 && Object.keys(prevRow)[0] === '$rowId'

              if (prevHasRelevant || prevOnlyRowId) {
                const row = getOrCreateRowDraft(listRuntime, index, makeStepId(scopeFieldPath, index))
                applyScopedRowPatch(row, keysFromDeps, undefined)
              }
            }

            continue
          }

          continue
        }

        // Phase 2: supports list.item scope ("items[]" / "orders.items[]"), and uses listIndexPath for nested writebacks.
        if (scopeFieldPath.endsWith('[]')) {
          const listPath = scopeFieldPath.slice(0, -2)

          const listInstances = (() => {
            if (hasRoot) return enumerateAllListInstances(listPath)
            if (listBindingsAll.has(listPath)) return enumerateAllListInstances(listPath)

            const keys = new Set<string>()
            for (const k of listBindingsInstances) {
              if (k.startsWith(`${listPath}@@`)) keys.add(k)
            }
            for (const k of indexBindings.keys()) {
              if (k.startsWith(`${listPath}@@`)) keys.add(k)
            }

            if (keys.size === 0) return enumerateAllListInstances(listPath)

            const out: Array<ListRuntime> = []
            for (const k of keys) {
              const indexPath = instanceIndexPathByKey.get(k)
              const normalized = normalizeInstanceIndexPath(listPath, indexPath)
              if (!normalized) continue
              const rt = getListRuntime(listPath, normalized)
              if (rt) out.push(rt)
            }
            return out
          })()

          const rules = check.meta.rules as Record<string, any>
          const names = Object.keys(rules).sort()

          for (const listRuntime of listInstances) {
            const instanceKey = toListInstanceKey(listPath, listRuntime.listIndexPath)
            const indices: ReadonlyArray<number> =
              hasRoot || listBindingsAll.has(listPath) || listBindingsInstances.has(instanceKey)
                ? listRuntime.items.map((_, i) => i)
                : Array.from(indexBindings.get(instanceKey) ?? [])

            if (indices.length === 0) continue

            for (const index of indices) {
              if (index < 0 || index >= listRuntime.items.length) continue

              const boundValuePath = `${listRuntime.valuePath}.${index}`
              const input = getAtPath(draft, boundValuePath)

              const rowErrorPath = `${listRuntime.errorBasePath}.rows.${index}`
              const prevRow = getAtPath(draft, rowErrorPath)
              const prevObj = isPlainObject(prevRow) ? (prevRow as Record<string, unknown>) : undefined
              const prevOnlyRowId =
                isPlainObject(prevRow) && Object.keys(prevRow).length === 1 && Object.keys(prevRow)[0] === '$rowId'

              let rowDraft: RowDraft | undefined = undefined
              let lockedKeys: Set<string> | undefined = undefined

              const ctxForRule: RuleContext = {
                mode,
                state: draft,
                scope: { fieldPath: scopeFieldPath, listPath, listIndexPath: listRuntime.listIndexPath, index },
              }

              const ensureRowDraft = (): RowDraft => {
                if (rowDraft) return rowDraft
                rowDraft = getOrCreateRowDraft(listRuntime, index, makeStepId(scopeFieldPath, index))
                return rowDraft
              }

              for (const name of names) {
                const rule = rules[name]
                try {
                  const out =
                    typeof rule === 'function'
                      ? rule(input, ctxForRule)
                      : rule && typeof rule === 'object'
                        ? rule.validate(input, ctxForRule)
                        : undefined

                  if (out === RULE_SKIP) continue

                  const keys = collectRuleKeysFromDeps(rule, listPath)
                  if (keys.length === 0) continue

                  const patchObj = isPlainObject(out) ? (out as Record<string, unknown>) : undefined
                  const patchHasRelevant =
                    patchObj && Object.keys(patchObj).some((k) => k !== '$rowId' && keys.includes(k))
                  const prevHasRelevant =
                    prevObj && Object.keys(prevObj).some((k) => k !== '$rowId' && keys.includes(k))

                  if (!rowDraft && !patchHasRelevant && !prevHasRelevant && !prevOnlyRowId) {
                    continue
                  }

                  const row = ensureRowDraft()
                  for (const key of keys) {
                    if (key === '$rowId') continue
                    if (lockedKeys?.has(key)) continue
                    const v = normalizeErrorValue(patchObj?.[key])
                    if (v === undefined) {
                      delete row.next[key]
                    } else {
                      row.next[key] = v
                      if (!lockedKeys) lockedKeys = new Set<string>()
                      lockedKeys.add(key)
                    }
                  }
                } catch {
                  // Rule runtime error: keep it a no-op to avoid producing a partial error tree.
                  // Diagnostics and degrade handling are handled by DebugSink/DevtoolsHub in later phases.
                }
              }
            }
          }

          continue
        }

        const input = scopeFieldPath === '$root' ? draft : getAtPath(draft, scopeFieldPath)

        const nextError = evalCheck(check, input, {
          mode,
          state: draft,
          scope: { fieldPath: scopeFieldPath },
        })
        if (nextError === RULE_SKIP) continue

        const writebackPath = (() => {
          const wb = (check as any)?.meta?.writeback
          const p = wb && typeof wb === 'object' ? (wb as any).path : undefined
          return typeof p === 'string' && p.startsWith('errors.') ? p : undefined
        })()

        const errorPath = writebackPath ?? `errors.${scopeFieldPath}`
        const prev = getAtPath(draft, errorPath)

        if (!Object.is(prev, nextError)) {
          updates.push({
            errorPath,
            prev,
            next: nextError,
            stepId: makeStepId(scopeFieldPath),
          })
        }
      }

      for (const row of rowDrafts.values()) {
        const prevRow = row.prev

        const nextRow = (() => {
          if (row.removed) return undefined

          delete row.next.$rowId
          const errorKeys = Object.keys(row.next).filter((k) => k !== '$rowId')
          if (errorKeys.length === 0) return undefined

          const listRuntime = getListRuntime(row.listPath, row.listIndexPath)
          const item = listRuntime?.items[row.index]
          const rowId = (() => {
            if (listRuntime?.trackBy) {
              const k = readTrackBy(item, listRuntime.trackBy)
              if (k !== undefined) return String(k)
            }
            const fromStore =
              listRuntime?.rowIds?.[row.index] ?? ctx.rowIdStore?.getRowId(row.listPath, row.index, row.parentRowId)
            if (typeof fromStore === 'string' && fromStore.length > 0) return fromStore
            return String(row.index)
          })()

          const nextRowRaw: Record<string, unknown> = { $rowId: rowId, ...row.next }
          return isPlainObject(prevRow) && shallowEqualPlainObject(prevRow, nextRowRaw) ? prevRow : nextRowRaw
        })()

        if (!Object.is(prevRow, nextRow)) {
          updates.push({
            errorPath: row.errorPath,
            prev: prevRow,
            next: nextRow,
            stepId: row.stepId,
          })
        }
      }

      if (updates.length === 0) {
        return
      }

      const reason: PatchReason = 'unknown'

      const prevFormErrorCount =
        draft &&
        typeof draft === 'object' &&
        (draft as any).$form &&
        typeof (draft as any).$form === 'object' &&
        !Array.isArray((draft as any).$form) &&
        typeof (draft as any).$form.errorCount === 'number'
          ? ((draft as any).$form.errorCount as number)
          : undefined

      const errorCountDelta =
        prevFormErrorCount === undefined
          ? 0
          : updates.reduce((acc, u) => acc + (countErrorLeaves(u.next) - countErrorLeaves(u.prev)), 0)

      const nextState = create(draft, (nextDraft) => {
        for (const u of updates) {
          if (u.next === undefined) {
            unsetAtPathMutating(nextDraft, u.errorPath)
          } else {
            setAtPathMutating(nextDraft, u.errorPath, u.next)
          }
        }

        if (prevFormErrorCount !== undefined && errorCountDelta !== 0) {
          const meta = nextDraft.$form
          if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
            meta.errorCount = Math.max(0, prevFormErrorCount + errorCountDelta)
          }
        }
      }) as unknown as S

      ctx.setDraft(nextState)

      for (const u of updates) {
        const normalized = normalizeFieldPath(u.errorPath) ?? []
        ctx.recordPatch(normalized, reason, u.prev, u.next)
      }
    })

    if (traceEvents && traceEvents.length > 0) {
      yield* Effect.forEach(traceEvents, (event) => Debug.record(event), {
        discard: true,
      })
    }
  })
