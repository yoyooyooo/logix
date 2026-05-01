import type { Schema } from 'effect'
import type { StateAtPath, StateFieldPath } from './field-path.js'
import type { DirtyAllReason } from '../field-path.js'
import * as Meta from './meta.js'
import type { ConvergeStaticIrRegistry } from './converge-ir.js'
import type { ConvergeExecIr } from './converge-exec-ir.js'

// Field-kernel core model.
// Keep the field semantics aligned with the current field-kernel data model.

/**
 * FieldSpec<S>：
 * - The standard shape for field declarations captured from a Module/Logic blueprint.
 * - Keys are constrained by StateFieldPath<S>; values are declarations for the corresponding scope (Entry / Node / List).
 */
export type FieldSpec<S> = S extends object
  ? {
      [Path in StateFieldPath<S> | '$root']?: FieldSpecValue<S, Path>
    }
  : never

export type FieldEntryKind = 'computed' | 'source' | 'link' | 'externalStore' | 'check'

export type FieldPriorityLane = 'urgent' | 'nonUrgent'

/**
 * FieldConvergeScheduling：
 * - Scheduling semantics for converge/dirty-check (043): decides whether a step must converge within each transaction window.
 * - Default `immediate` keeps the current synchronous behavior; `deferred` takes effect only with explicit declaration + time-slicing enabled.
 */
export type FieldConvergeScheduling = 'immediate' | 'deferred'

export interface ComputedMeta<S, P> {
  /**
   * Explicit dependency field paths (required):
   *
   * - deps is the single source of truth for dependencies: Graph/ReverseClosure/incremental scheduling/perf optimizations rely on deps only.
   * - In the DSL, `FieldKernel.computed({ deps, get })` uses deps-as-args; it does not expose `(state) => ...`.
   * - During build, `get(...depsValues)` is lowered into `derive(state)` for runtime execution, but the dependency read-set remains deps-based.
   * - In dev-mode, if actual reads in `derive(state)` disagree with deps, a `deps_mismatch` diagnostic warning is emitted.
   *
   * - For root scope: deps are StateFieldPath<State>.
   * - For list.item scope: deps are StateFieldPath<Item> (relative paths; build will prefix them).
   */
  readonly deps: ReadonlyArray<StateFieldPath<S>>
  readonly derive: (state: Readonly<S>) => StateAtPath<S, P>
  /**
   * Optional: equality predicate (used to skip no-op writebacks).
   */
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  /**
   * Converge scheduling (043): defaults to immediate.
   */
  readonly scheduling?: FieldConvergeScheduling
}

export interface SourceMeta<S, P> {
  readonly deps: ReadonlyArray<StateFieldPath<S>>
  /**
   * Logical resource identifier (e.g. "user/profile").
   *
   * - In the FieldKernel.source DSL, `resource` is stored here during build.
   * - data-model.md calls it resourceId; we keep the DSL naming here to avoid confusion.
   */
  readonly resource: string
  /**
   * Rule for computing the key required to access the resource.
   *
   * - deps is the single source of truth for dependencies: Graph/ReverseClosure/incremental scheduling/perf optimizations rely on deps only.
   * - In the DSL, `FieldKernel.source({ deps, key })` uses deps-as-args; it does not expose `(state) => ...`.
   * - During build, `key(...depsValues)` is lowered into `key(state)` for runtime execution, but the dependency read-set remains deps-based.
   *
   * - Returning undefined means the resource is inactive under the current state (should be recycled to idle).
   */
  readonly key: (state: Readonly<S>) => unknown
  readonly triggers?: ReadonlyArray<'onMount' | 'onKeyChange'>
  readonly debounceMs?: number
  readonly concurrency?: 'switch' | 'exhaust-trailing'
  readonly submitImpact?: 'block' | 'observe'
  /**
   * Serializable metadata for devtools/docs (whitelisted fields).
   */
  readonly meta?: Meta.FieldMeta
  /**
   * Reserved: build may populate the field path this trait is attached to, for easier debugging.
   */
  readonly _fieldPath?: P
}

export interface LinkMeta<S> {
  /**
   * Source field path (also constrained by StateFieldPath<S>).
   */
  readonly from: StateFieldPath<S>
  /**
   * Converge scheduling (043): defaults to immediate.
   */
  readonly scheduling?: FieldConvergeScheduling
}

export interface ExternalStoreLike<T> {
  readonly getSnapshot: () => T
  readonly getServerSnapshot?: () => T
  readonly subscribe: (listener: () => void) => () => void
}

export interface ExternalStoreMeta<S, P, T = unknown> {
  readonly store: ExternalStoreLike<T>
  readonly select?: (snapshot: T) => StateAtPath<S, P>
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  readonly coalesceWindowMs?: number
  readonly priority?: FieldPriorityLane
  readonly meta?: Meta.FieldMeta
  readonly _fieldPath?: P
}

export type CheckRule<Input = unknown, Ctx = unknown> = {
  readonly deps: ReadonlyArray<string>
  /**
   * validateOn：
   * - Affects only auto validation phases (onChange/onBlur); submit/manual always run.
   * - Empty array disables auto validation (only submit/manual run).
   */
  readonly validateOn?: ReadonlyArray<'onChange' | 'onBlur'>
  readonly validate: (input: Input, ctx: Ctx) => unknown
  readonly meta?: Meta.FieldMeta
}

export interface CheckMeta<Input = unknown, Ctx = unknown> {
  /**
   * Named rule set (used for deterministic merge and diagnostics display).
   */
  readonly rules: Readonly<Record<string, CheckRule<Input, Ctx>>>
  /**
   * Error-tree writeback (Phase 2: structure only; concrete writeback semantics land in later phases).
   */
  readonly writeback?: {
    readonly kind: 'errors'
    readonly path?: string
  }
}

/**
 * FieldEntry<S, P>：
 * - A single field declaration attached to a field path P.
 * - kind and meta always come together and are used to dispatch behavior during build/install.
 */
export type FieldEntry<S = unknown, P extends string = StateFieldPath<S>> =
  | {
      readonly fieldPath: P
      readonly kind: 'computed'
      readonly meta: ComputedMeta<S, P>
    }
  | {
      readonly fieldPath: P
      readonly kind: 'source'
      readonly meta: SourceMeta<S, P>
    }
  | {
      readonly fieldPath: P
      readonly kind: 'link'
      readonly meta: LinkMeta<S>
    }
  | {
      readonly fieldPath: P
      readonly kind: 'externalStore'
      readonly meta: ExternalStoreMeta<S, P>
    }
  | {
      readonly fieldPath: P
      readonly kind: 'check'
      readonly meta: CheckMeta<unknown, unknown>
    }

export interface FieldNode<Input = unknown, Ctx = unknown> {
  readonly _tag: 'FieldNode'
  readonly computed?: FieldEntry<Input, any> | Readonly<Record<string, FieldEntry<Input, any>>>
  readonly source?: FieldEntry<Input, any> | Readonly<Record<string, FieldEntry<Input, any>>>
  readonly link?: FieldEntry<Input, any> | Readonly<Record<string, FieldEntry<Input, any>>>
  readonly externalStore?: FieldEntry<Input, any> | Readonly<Record<string, FieldEntry<Input, any>>>
  readonly check?: Readonly<Record<string, CheckRule<Input, Ctx>>>
  readonly meta?: Meta.FieldMeta
}

export interface FieldList<Item = unknown> {
  readonly _tag: 'FieldList'
  readonly item?: FieldNode<Item, any>
  readonly list?: FieldNode<ReadonlyArray<Item>, any>
  readonly identityHint?: {
    readonly trackBy?: string
  }
}

export type FieldSpecValue<S, P extends string> =
  | FieldEntry<S, P>
  | FieldNode<any, any>
  | FieldList<any>

/**
 * FieldDescriptor：
 * - Represents a field node in State (whether or not field behaviors are attached).
 * - Normalized from FieldSpec during build.
 */
export interface FieldDescriptor {
  readonly id: string
  readonly path: string
  readonly displayName?: string
  readonly valueType?: string
  readonly behaviors: ReadonlyArray<FieldBehavior>
}

/**
 * FieldBehavior：
 * - A structured description of a field behavior (computed / source / link / externalStore / check).
 * - meta matches FieldEntry.meta; deps is the set of field paths this trait depends on.
 */
export interface FieldBehavior {
  readonly fieldId: string
  readonly kind: FieldEntryKind
  readonly meta:
    | ComputedMeta<unknown, string>
    | SourceMeta<unknown, string>
    | LinkMeta<unknown>
    | ExternalStoreMeta<unknown, string>
    | CheckMeta<unknown, unknown>
  readonly deps: ReadonlyArray<string>
}

/**
 * FieldResource：
 * - Describes the logical resource metadata that a source behavior depends on.
 * - Concrete ResourceSpec implementation lives in the Resource namespace; this keeps only field-kernel dependency info.
 */
export interface FieldResource {
  readonly resourceId: string
  readonly keySelector: string
  readonly keyExample?: unknown
  readonly ownerFields: ReadonlyArray<string>
  readonly meta?: Meta.FieldMeta
  readonly metaOrigin?: string
  readonly metaConflicts?: ReadonlyArray<Meta.FieldMetaConflict>
}

/**
 * Graph Node / Edge：
 * - Nodes typically correspond to fields.
 * - Edges represent dependencies between fields, or between fields and resources.
 */
export interface FieldGraphNode {
  readonly id: string
  readonly field: FieldDescriptor
  readonly behaviors: ReadonlyArray<FieldBehavior>
  readonly meta?: Meta.FieldMeta
}

export interface FieldGraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: 'computed' | 'link' | 'source-dep' | 'check-dep'
}

/**
 * FieldGraph：
 * - Structural view of the field-kernel engine: a graph of nodes and dependency edges.
 * - Used by Devtools / Studio / Runtime for structural analysis and visualization.
 */
export interface FieldGraph {
  readonly _tag: 'FieldGraph'
  readonly nodes: ReadonlyArray<FieldGraphNode>
  readonly edges: ReadonlyArray<FieldGraphEdge>
  readonly resources: ReadonlyArray<FieldResource>
  readonly meta?: {
    readonly moduleId?: string
    readonly version?: string
  }
}

/**
 * FieldPlanStep：
 * - The smallest instruction unit used by FieldKernel.install / Runtime execution.
 * - Derived from the graph; used at runtime to install watchers or trigger external calls.
 */
export interface FieldPlanStep {
  readonly id: string
  readonly kind: 'computed-update' | 'link-propagate' | 'source-refresh' | 'external-store-sync' | 'check-validate'
  readonly targetFieldPath?: string
  readonly sourceFieldPaths?: ReadonlyArray<string>
  readonly resourceId?: string
  readonly keySelectorId?: string
  readonly debugInfo?: {
    readonly graphNodeId?: string
    readonly graphEdgeId?: string
  }
}

/**
 * FieldPlan：
 * - Execution plan summarizing all field behaviors for a module.
 * - install mounts behaviors onto Bound API / EffectOp pipelines according to the plan.
 */
export interface FieldPlan {
  readonly _tag: 'FieldPlan'
  readonly moduleId?: string
  readonly steps: ReadonlyArray<FieldPlanStep>
  readonly meta?: Record<string, unknown>
}

export type FieldSchemaPathKind = 'fieldPath' | 'dep' | 'link_from' | 'check_writeback'

export interface FieldSchemaPathRef {
  readonly kind: FieldSchemaPathKind
  readonly entryKind: FieldEntryKind
  readonly entryFieldPath: string
  readonly path: string
  readonly ruleName?: string
}

/**
 * FieldProgram<S>：
 * - Program output of the field-kernel engine; the unified entrypoint for Runtime / Devtools.
 * - stateSchema and spec preserve original inputs; graph/plan are internal IR.
 */
export interface FieldProgram<S> {
  readonly stateSchema: Schema.Schema<S>
  readonly spec: FieldSpec<S>
  /**
   * Program.entries：
   * - Minimal rule set normalized from spec (including node/list/$root) during build.
   * - Phase 2 focuses on a readable/diagnosable structure; later phases add execution and converge semantics.
   */
  readonly entries: ReadonlyArray<FieldEntry<any, string>>
  readonly graph: FieldGraph
  readonly plan: FieldPlan
  readonly convergeIr?: ConvergeStaticIrRegistry
  readonly convergeExecIr?: ConvergeExecIr
  /**
   * schemaPaths：
   * - Path references that must exist in stateSchema, collected from entries during build; dev-only diagnostics (e.g. schema_mismatch).
   * - When diagnostics=off, validation can be skipped entirely to keep near-zero cost.
   */
  readonly schemaPaths?: ReadonlyArray<FieldSchemaPathRef>
}

/**
 * Build a normalized entry list from FieldSpec.
 *
 * - Phase 2: supports structural expansion of node/list/$root and fills/prefixes fieldPath/deps when necessary.
 * - Later phases may extend validation here (e.g. detecting duplicates, override rules, etc.).
 */
export const normalizeSpec = <S>(spec: FieldSpec<S>): ReadonlyArray<FieldEntry<any, string>> => {
  const entries: Array<FieldEntry<any, string>> = []

  const isNode = (value: unknown): value is FieldNode<any, any> =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'FieldNode'

  const isList = (value: unknown): value is FieldList<any> =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'FieldList'

  const joinPath = (prefix: string, suffix: string): string => {
    if (!prefix) return suffix
    if (!suffix) return prefix
    return `${prefix}.${suffix}`
  }

  const prefixDeps = (deps: ReadonlyArray<string> | undefined, prefix: string): ReadonlyArray<string> => {
    if (!deps || deps.length === 0) return []
    return deps.map((d) => (prefix ? joinPath(prefix, d) : d))
  }

  const normalizeEntry = (
    entry: FieldEntry<any, string>,
    fieldPath: string,
    depPrefix: string,
  ): FieldEntry<any, string> => {
    if (entry.kind === 'computed') {
      const meta = entry.meta as any
      const rawDeps = meta.deps as ReadonlyArray<string> | undefined
      const deps = rawDeps !== undefined ? prefixDeps(rawDeps, depPrefix) : undefined
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, deps },
      }
    }
    if (entry.kind === 'source') {
      const meta = entry.meta as any
      const rawDeps = meta.deps as ReadonlyArray<string> | undefined
      const deps = rawDeps !== undefined ? ((meta._depsAbsolute as boolean | undefined) ? rawDeps : prefixDeps(rawDeps, depPrefix)) : undefined
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, deps, _fieldPath: fieldPath },
      }
    }
    if (entry.kind === 'externalStore') {
      const meta = entry.meta as any
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, _fieldPath: fieldPath },
      }
    }
    if (entry.kind === 'link') {
      const meta = entry.meta as any
      const from = prefixDeps([meta.from as string], depPrefix)[0] ?? meta.from
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, from },
      }
    }
    // check: Phase 2 adjusts fieldPath only; deps are still collected from meta.rules during build.
    return {
      ...(entry as any),
      fieldPath,
    }
  }

  const expandNode = (
    scopeId: string,
    joinPrefix: string,
    node: FieldNode<any, any>,
    options?: {
      /**
       * Prefix for check deps: default semantics for list-scope checks (deps are relative to a row item rather than the list root).
       *
       * - item scope: depsPrefix = `${listPath}[]` (matches joinPrefix).
       * - list scope: fieldPath = `${listPath}`, but depsPrefix should be `${listPath}[]`.
       */
      readonly checkDepsPrefix?: string
    },
  ): void => {
    const addEntry = (relativeTarget: string, raw: FieldEntry<any, string>): void => {
      const rel = (raw as any).fieldPath ?? relativeTarget
      const fieldPath = joinPrefix ? joinPath(joinPrefix, String(rel)) : String(rel)
      entries.push(normalizeEntry(raw, fieldPath, joinPrefix))
    }

    const expandMaybeRecord = (
      value: FieldEntry<any, any> | Readonly<Record<string, FieldEntry<any, any>>> | undefined,
    ): void => {
      if (!value) return
      if (typeof (value as any).kind === 'string') {
        addEntry('', value as any)
        return
      }
      const record = value as Readonly<Record<string, FieldEntry<any, any>>>
      for (const key in record) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) continue
        const entry = record[key]
        if (!entry) continue
        addEntry(key, entry as any)
      }
    }

    expandMaybeRecord(node.computed)
    expandMaybeRecord(node.source)
    expandMaybeRecord(node.link)
    expandMaybeRecord(node.externalStore)

    if (node.check) {
      const rules: Record<string, CheckRule<any, any>> = {}
      const checkDepsPrefix = options?.checkDepsPrefix ?? (joinPrefix.endsWith('[]') ? joinPrefix : '')

      const prefixCheckDeps = (deps: ReadonlyArray<string> | undefined): ReadonlyArray<string> => {
        if (!deps || deps.length === 0) return []
        return deps.map((d) => (d === '' ? scopeId : checkDepsPrefix ? joinPath(checkDepsPrefix, d) : d))
      }
      for (const name of Object.keys(node.check)) {
        const rule = (node.check as any)[name] as CheckRule<any, any>
        if (typeof rule === 'function') {
          rules[name] = rule
          continue
        }
        if (rule && typeof rule === 'object') {
          const meta = Meta.sanitize((rule as any).meta)
          rules[name] = {
            ...rule,
            deps: prefixCheckDeps(rule.deps),
            meta,
          }
          continue
        }
        // Invalid input: ignore (later phases may promote this into a build-time config error).
      }

      entries.push({
        fieldPath: scopeId,
        kind: 'check',
        meta: {
          rules,
          writeback: { kind: 'errors' },
        },
      } as FieldEntry<any, any>)
    }
  }

  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key as keyof typeof spec] as FieldSpecValue<S, any> | undefined
    if (!raw) continue

    if (isList(raw)) {
      const listPath = key
      if (raw.item) {
        expandNode(`${listPath}[]`, `${listPath}[]`, raw.item)
      }
      if (raw.list) {
        expandNode(listPath, listPath, raw.list, {
          checkDepsPrefix: `${listPath}[]`,
        })
      }
      continue
    }

    if (isNode(raw)) {
      if (key === '$root') {
        expandNode('$root', '', raw)
      } else {
        expandNode(key, key, raw)
      }
      continue
    }

    const entry = raw as any as FieldEntry<any, string>
    const fieldPath = (entry as any).fieldPath ?? key
    entries.push(normalizeEntry(entry, String(fieldPath), ''))
  }

  return entries
}

/**
 * collectNodeMeta：
 * - Extract FieldNode.meta (whitelisted fields) from FieldSpec for devtools structural display.
 * - meta is for diagnostics/display only and does not participate in runtime semantics.
 */
export const collectNodeMeta = <S>(spec: FieldSpec<S>): ReadonlyMap<string, Meta.FieldMeta> => {
  const out = new Map<string, Meta.FieldMeta>()

  const isNode = (value: unknown): value is FieldNode<any, any> =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'FieldNode'

  const isList = (value: unknown): value is FieldList<any> =>
    typeof value === 'object' && value !== null && (value as any)._tag === 'FieldList'

  const add = (scopeId: string, node: FieldNode<any, any>): void => {
    const meta = Meta.sanitize(node.meta)
    if (meta) out.set(scopeId, meta)
  }

  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key as keyof typeof spec] as FieldSpecValue<S, any> | undefined
    if (!raw) continue

    if (isList(raw)) {
      const listPath = key
      if (raw.item) add(`${listPath}[]`, raw.item)
      if (raw.list) add(listPath, raw.list)
      continue
    }

    if (isNode(raw)) {
      if (key === '$root') add('$root', raw)
      else add(key, raw)
      continue
    }
  }

  return out
}

// ---- Converge (013) evidence model ----

export type FieldConvergeRequestedMode = 'auto' | 'full' | 'dirty'
export type FieldConvergeExecutedMode = 'full' | 'dirty'
export type FieldConvergeOutcome = 'Converged' | 'Noop' | 'Degraded'

export type FieldConvergeConfigScope = 'provider' | 'runtime_module' | 'runtime_default' | 'builtin'

export type FieldConvergeReason =
  | 'cold_start'
  | 'fast_full'
  | 'inline_dirty'
  | 'cache_hit'
  | 'cache_miss'
  | 'budget_cutoff'
  | 'near_full'
  | 'unknown_write'
  | 'dirty_all'
  | 'generation_bumped'
  | 'low_hit_rate_protection'
  | 'module_override'
  | 'time_slicing_immediate'
  | 'time_slicing_deferred'

export interface FieldConvergeStepStats {
  readonly totalSteps: number
  readonly executedSteps: number
  readonly skippedSteps: number
  readonly changedSteps: number
  readonly affectedSteps?: number
}

export interface FieldConvergeDirtySummary {
  readonly dirtyAll: boolean
  readonly reason?: DirtyAllReason
  readonly rootCount?: number
  readonly rootIds?: ReadonlyArray<number>
  readonly rootIdsTruncated?: boolean
}

export interface FieldConvergePlanCacheEvidence {
  readonly capacity: number
  readonly size: number
  readonly hits: number
  readonly misses: number
  readonly evicts: number
  readonly hit: boolean
  readonly keySize?: number
  readonly missReason?: 'cold_start' | 'generation_bumped' | 'not_cached' | 'unknown'
  readonly disabled?: boolean
  readonly disableReason?: 'low_hit_rate' | 'generation_thrash' | 'manual_override' | 'unknown'
}

export type FieldConvergeGenerationBumpReason =
  | 'writers_changed'
  | 'deps_changed'
  | 'logic_installed'
  | 'logic_uninstalled'
  | 'imports_changed'
  | 'unknown'

export interface FieldConvergeGenerationEvidence {
  readonly generation: number
  readonly generationBumpCount?: number
  readonly lastBumpReason?: FieldConvergeGenerationBumpReason
}

export interface FieldConvergeStaticIrEvidence {
  readonly fieldPathCount: number
  readonly stepCount: number
  readonly buildDurationMs?: number
}

export interface FieldConvergeHotspot {
  readonly kind?: string
  readonly stepId: number
  readonly outFieldPathId?: number
  readonly durationMs: number
  readonly changed: boolean
}

export interface FieldConvergeTimeSlicingSummary {
  readonly scope: 'all' | 'immediate' | 'deferred'
  readonly immediateStepCount: number
  readonly deferredStepCount: number
}

export interface FieldConvergeDiagnosticsSamplingSummary {
  /**
   * Deterministic sampling: use stable txnSeq as an anchor and sample every N transactions.
   * - sampled=true means this invocation captured per-step timings and produced hotspots.
   */
  readonly strategy: 'txnSeq_interval'
  readonly sampleEveryN: number
  readonly topK: number
  readonly sampled: boolean
}

export interface FieldConvergeDecisionSummary {
  readonly requestedMode: FieldConvergeRequestedMode
  readonly executedMode: FieldConvergeExecutedMode
  readonly outcome: FieldConvergeOutcome
  readonly configScope: FieldConvergeConfigScope
  readonly staticIrDigest: string
  readonly executionBudgetMs: number
  readonly executionDurationMs: number
  readonly decisionBudgetMs?: number
  readonly decisionDurationMs?: number
  readonly reasons: ReadonlyArray<FieldConvergeReason>
  readonly stepStats: FieldConvergeStepStats
  readonly dirty?: FieldConvergeDirtySummary
  readonly cache?: FieldConvergePlanCacheEvidence
  readonly generation?: FieldConvergeGenerationEvidence
  readonly staticIr?: FieldConvergeStaticIrEvidence
  readonly timeSlicing?: FieldConvergeTimeSlicingSummary
  readonly thresholds?: { readonly floorRatio?: number }
  readonly diagnosticsSampling?: FieldConvergeDiagnosticsSamplingSummary
  readonly top3?: ReadonlyArray<FieldConvergeHotspot>
}
