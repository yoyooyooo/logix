import type { Schema } from 'effect'
import * as SchemaAST from 'effect/SchemaAST'
import {
  type StateTraitProgram,
  type StateTraitSpec,
  type StateTraitEntry,
  type StateTraitGraph,
  type StateTraitGraphEdge,
  type StateTraitGraphNode,
  type StateTraitField,
  type StateTraitFieldTrait,
  type StateTraitKind,
  type StateTraitPlan,
  type StateTraitPlanStep,
  type StateTraitResource,
  type StateTraitSchemaPathRef,
  collectNodeMeta,
  normalizeSpec,
} from './model.js'
import * as Meta from './meta.js'
import {
  compareFieldPath,
  getFieldPathId,
  makeFieldPathIdRegistry,
  normalizeFieldPath,
  type FieldPath,
  type FieldPathId,
} from '../field-path.js'
import { fnv1a32, stableStringify } from '../digest.js'
import type { ConvergeStaticIrRegistry } from './converge-ir.js'

const nowPerf = (): number =>
  typeof globalThis.performance !== 'undefined' && typeof globalThis.performance.now === 'function'
    ? globalThis.performance.now()
    : Date.now()

type ConvergeWriter = Extract<StateTraitEntry<any, string>, { readonly kind: 'computed' | 'link' }>

const collectMultipleWritersError = (
  entries: ReadonlyArray<StateTraitEntry<any, string>>,
): ConvergeStaticIrRegistry['configError'] | undefined => {
  const kindsByFieldPath = new Map<string, Set<StateTraitKind>>()

  for (const entry of entries) {
    if (entry.kind !== 'computed' && entry.kind !== 'link' && entry.kind !== 'source' && entry.kind !== 'externalStore') {
      continue
    }
    const set = kindsByFieldPath.get(entry.fieldPath) ?? new Set<StateTraitKind>()
    set.add(entry.kind)
    kindsByFieldPath.set(entry.fieldPath, set)
  }

  const conflicts: Array<{ readonly fieldPath: string; readonly kinds: ReadonlyArray<StateTraitKind> }> = []
  for (const [fieldPath, kinds] of kindsByFieldPath.entries()) {
    if (kinds.size <= 1) continue
    conflicts.push({ fieldPath, kinds: Array.from(kinds).sort() })
  }

  if (conflicts.length === 0) return undefined

  conflicts.sort((a, b) => (a.fieldPath < b.fieldPath ? -1 : a.fieldPath > b.fieldPath ? 1 : 0))
  const fields = conflicts.map((c) => c.fieldPath)
  const primary = conflicts[0]!
  const kindSummary = primary.kinds.join(' + ')

  return {
    code: 'MULTIPLE_WRITERS',
    message:
      `[StateTrait.build] Multiple writers for field "${primary.fieldPath}" (${kindSummary}). ` +
      'Only one of computed/link/source/externalStore can write a fieldPath.',
    fields,
  }
}

const getConvergeWriterDeps = (entry: ConvergeWriter): ReadonlyArray<string> => {
  if (entry.kind === 'computed') {
    return ((entry.meta as any)?.deps ?? []) as ReadonlyArray<string>
  }
  return [entry.meta.from as string]
}

const computeConvergeTopoOrder = (
  writers: ReadonlyArray<ConvergeWriter>,
): { readonly order: ReadonlyArray<string>; readonly configError?: ConvergeStaticIrRegistry['configError'] } => {
  const writerByPath = new Map<string, ConvergeWriter>()
  for (const entry of writers) {
    const existing = writerByPath.get(entry.fieldPath)
    if (existing) {
      return {
        order: [],
        configError: {
          code: 'MULTIPLE_WRITERS',
          message: `[StateTrait.converge] Multiple writers for field "${entry.fieldPath}" (${existing.kind} + ${entry.kind}).`,
          fields: [entry.fieldPath],
        },
      }
    }
    writerByPath.set(entry.fieldPath, entry)
  }

  const nodes = new Set<string>()
  for (const entry of writers) {
    nodes.add(entry.fieldPath)
  }

  const indegree = new Map<string, number>()
  const forward = new Map<string, Array<string>>()

  for (const node of nodes) {
    indegree.set(node, 0)
    forward.set(node, [])
  }

  for (const entry of writers) {
    const to = entry.fieldPath
    const deps = getConvergeWriterDeps(entry)
    for (const dep of deps) {
      if (!nodes.has(dep)) continue
      forward.get(dep)!.push(to)
      indegree.set(to, (indegree.get(to) ?? 0) + 1)
    }
  }

  const queue: Array<string> = []
  for (const [node, deg] of indegree.entries()) {
    if (deg === 0) queue.push(node)
  }

  const order: Array<string> = []
  while (queue.length) {
    const n = queue.shift()!
    order.push(n)
    const outs = forward.get(n)!
    for (const to of outs) {
      const next = (indegree.get(to) ?? 0) - 1
      indegree.set(to, next)
      if (next === 0) queue.push(to)
    }
  }

  if (order.length !== nodes.size) {
    const remaining = Array.from(nodes).filter((n) => !order.includes(n))
    return {
      order: [],
      configError: {
        code: 'CYCLE_DETECTED',
        message: `[StateTrait.converge] Cycle detected in computed/link graph: ${remaining.join(', ')}`,
        fields: remaining,
      },
    }
  }

  return { order }
}

const collectSchemaFieldPaths = (schema: Schema.Schema<any, any>): ReadonlyArray<FieldPath> => {
  const byKey = new Map<string, FieldPath>()

  const add = (path: FieldPath): void => {
    const normalized = normalizeFieldPath(path)
    if (!normalized) return
    byKey.set(JSON.stringify(normalized), normalized)
  }

  const visit = (ast: SchemaAST.AST, prefix: ReadonlyArray<string>, seen: Set<SchemaAST.AST>): void => {
    let current: SchemaAST.AST = ast

    // Unwrap Suspend/Refinement (recursive schema / branded schema).
    while (true) {
      if (SchemaAST.isSuspend(current)) {
        if (seen.has(current)) return
        seen.add(current)
        current = current.f()
        continue
      }
      if (SchemaAST.isRefinement(current)) {
        current = current.from
        continue
      }
      break
    }

    if (SchemaAST.isTransformation(current)) {
      visit(current.to, prefix, seen)
      visit(current.from, prefix, seen)
      return
    }

    if (SchemaAST.isUnion(current)) {
      for (const t of current.types) {
        visit(t, prefix, seen)
      }
      return
    }

    // Array / Tuple: indices do not enter the FieldPathId space; recurse into element types to support `items[0].name -> items.name`.
    if (SchemaAST.isTupleType(current)) {
      for (const e of current.elements) {
        visit(e.type, prefix, seen)
      }
      for (const r of current.rest) {
        visit(r.type, prefix, seen)
      }
      return
    }

    if (SchemaAST.isTypeLiteral(current)) {
      for (const ps of current.propertySignatures) {
        const seg = String(ps.name)
        if (!seg) continue
        const next = [...prefix, seg]
        add(next)
        visit(ps.type, next, seen)
      }
      // Index signature (Record<string, T>) can't be enumerated statically: avoid generating misaligned dynamic key paths.
      return
    }

    // Any / Unknown / Object / Declaration (open types): cannot enumerate nested paths; stop conservatively.
  }

  visit(schema.ast as unknown as SchemaAST.AST, [], new Set())
  return Array.from(byKey.values()).sort(compareFieldPath)
}

const buildConvergeIr = (
  stateSchema: Schema.Schema<any, any>,
  entries: ReadonlyArray<StateTraitEntry<any, string>>,
): ConvergeStaticIrRegistry => {
  const startedAt = nowPerf()
  const generation = 0

  const multipleWritersError = collectMultipleWritersError(entries)

  const writers = entries.filter((e): e is ConvergeWriter => e.kind === 'computed' || e.kind === 'link')

  const writersKey = writers
    .map((entry) => `${entry.kind}:${entry.fieldPath}`)
    .sort()
    .join('|')

  const depsKey = writers
    .map((entry) => {
      const deps = getConvergeWriterDeps(entry).slice().sort().join(',')
      const scheduling = (entry.meta as any)?.scheduling === 'deferred' ? 'd' : 'i'
      return `${entry.kind}:${entry.fieldPath}@${scheduling}=>${deps}`
    })
    .sort()
    .join('|')

  const writerByPath = new Map<string, ConvergeWriter>()
  for (const entry of writers) {
    writerByPath.set(entry.fieldPath, entry)
  }

  const topo = multipleWritersError
    ? { order: [] as ReadonlyArray<string> }
    : writers.length > 0
      ? computeConvergeTopoOrder(writers)
      : { order: [] as ReadonlyArray<string> }
  const stepsById: Array<ConvergeWriter> = topo.configError ? [] : topo.order.map((path) => writerByPath.get(path)!)

  const fieldPathTable = new Map<string, FieldPath>()
  const addPath = (path: FieldPath): void => {
    for (let i = 1; i <= path.length; i++) {
      const prefix = path.slice(0, i)
      const key = JSON.stringify(prefix)
      if (!fieldPathTable.has(key)) fieldPathTable.set(key, prefix)
    }
  }

  // 065: FieldPathId semantics must cover all enumerable field paths of stateSchema; otherwise reducer patchPaths can't map and will fall back to dirtyAll.
  for (const schemaPath of collectSchemaFieldPaths(stateSchema)) {
    addPath(schemaPath)
  }

  for (const entry of writers) {
    const out = normalizeFieldPath(entry.fieldPath)
    if (out) addPath(out)
    for (const dep of getConvergeWriterDeps(entry)) {
      const depPath = normalizeFieldPath(dep)
      if (depPath) addPath(depPath)
    }
  }

  const fieldPaths = Array.from(fieldPathTable.values()).sort(compareFieldPath)
  const fieldPathIdRegistry = makeFieldPathIdRegistry(fieldPaths)
  const fieldPathsKey = fnv1a32(stableStringify(fieldPaths))

  const stepOutFieldPathIdByStepId: Array<FieldPathId> = []
  const stepDepsFieldPathIdsByStepId: Array<ReadonlyArray<FieldPathId>> = []
  const stepSchedulingByStepId: Array<'immediate' | 'deferred'> = []

  for (const entry of stepsById) {
    const out = normalizeFieldPath(entry.fieldPath)
    const outId = out != null ? getFieldPathId(fieldPathIdRegistry, out) : undefined
    if (outId == null) {
      throw new Error(`[StateTrait.build] Failed to map converge output fieldPath "${entry.fieldPath}" to FieldPathId.`)
    }

    const depIds: Array<FieldPathId> = []
    for (const dep of getConvergeWriterDeps(entry)) {
      const depPath = normalizeFieldPath(dep)
      if (!depPath) continue
      const depId = getFieldPathId(fieldPathIdRegistry, depPath)
      if (depId != null) depIds.push(depId)
    }

    stepOutFieldPathIdByStepId.push(outId)
    stepDepsFieldPathIdsByStepId.push(depIds)
    stepSchedulingByStepId.push((entry.meta as any)?.scheduling === 'deferred' ? 'deferred' : 'immediate')
  }

  const topoOrder = stepsById.map((_, i) => i)
  const buildDurationMs = Math.max(0, nowPerf() - startedAt)

  return {
    generation,
    writersKey,
    depsKey,
    fieldPathsKey,
    fieldPaths,
    fieldPathIdRegistry,
    ...(multipleWritersError ? { configError: multipleWritersError } : topo.configError ? { configError: topo.configError } : null),
    stepsById,
    stepOutFieldPathIdByStepId,
    stepDepsFieldPathIdsByStepId,
    stepSchedulingByStepId,
    topoOrder,
    buildDurationMs,
  }
}

/**
 * Builds a normalized FieldTrait from a StateTraitEntry.
 *
 * - Currently uses explicit deps for computed/source and link edges; deeper dependency analysis is intentionally not performed.
 * - If we evolve explicit dependency declarations further, extend here.
 */
const toFieldTrait = (entry: StateTraitEntry<any, string>): StateTraitFieldTrait => {
  const deps: Array<string> = []

  if (entry.kind === 'computed') {
    const meta = entry.meta as any
    const list = meta.deps as ReadonlyArray<string> | undefined
    if (list) deps.push(...list)
  } else if (entry.kind === 'source') {
    const meta = entry.meta as any
    const list = meta.deps as ReadonlyArray<string> | undefined
    if (list) deps.push(...list)
  } else if (entry.kind === 'link') {
    deps.push(entry.meta.from as string)
  } else if (entry.kind === 'check') {
    const meta = entry.meta as any
    const rules = (meta?.rules ?? {}) as Record<string, any>
    for (const name of Object.keys(rules)) {
      const rule = rules[name]
      if (rule && typeof rule === 'object') {
        const list = rule.deps as ReadonlyArray<string> | undefined
        if (list) deps.push(...list)
      }
    }
  }

  return {
    fieldId: entry.fieldPath,
    kind: entry.kind,
    // Keep meta identical to Entry.meta at runtime so install can reuse it directly.
    meta: entry.meta as any,
    deps,
  }
}

/**
 * Builds Field / Node / Edge / Resource sets from normalized entries.
 */
const buildGraph = (
  entries: ReadonlyArray<StateTraitEntry<any, string>>,
  nodeMetaByFieldPath: ReadonlyMap<string, Meta.TraitMeta>,
): {
  readonly graph: StateTraitGraph
  readonly plan: StateTraitPlan
} => {
  const fieldMap = new Map<string, StateTraitField>()
  const nodes: Array<StateTraitGraphNode> = []
  const edges: Array<StateTraitGraphEdge> = []
  const resourcesById = new Map<string, StateTraitResource>()
  const planSteps: Array<StateTraitPlanStep> = []

  const ensureField = (fieldPath: string): StateTraitField => {
    let field = fieldMap.get(fieldPath)
    if (!field) {
      field = {
        id: fieldPath,
        path: fieldPath,
        traits: [],
      }
      fieldMap.set(fieldPath, field)
    }
    return field
  }

  for (const entry of entries) {
    const fieldPath = entry.fieldPath
    const field = ensureField(fieldPath)
    const trait = toFieldTrait(entry)

    ;(field.traits as Array<StateTraitFieldTrait>).push(trait)

    // Build Graph edges and Plan steps by kind.
    if (entry.kind === 'computed') {
      const stepId = `computed:${fieldPath}`
      planSteps.push({
        id: stepId,
        kind: 'computed-update',
        targetFieldPath: fieldPath,
        // Note: the current version does not statically analyze computed dependencies; sourceFieldPaths remains empty.
      })
      // If deps is explicitly declared, add Graph edges (for diagnostics / reverse-closure computation).
      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps) {
        for (const dep of deps) {
          ensureField(dep)
          edges.push({
            id: `computed:${dep}->${fieldPath}`,
            from: dep,
            to: fieldPath,
            kind: 'computed',
          })
        }
      }
    } else if (entry.kind === 'link') {
      const from = entry.meta.from as string
      ensureField(from)

      const edgeId = `link:${from}->${fieldPath}`
      edges.push({
        id: edgeId,
        from,
        to: fieldPath,
        kind: 'link',
      })

      planSteps.push({
        id: `link:${fieldPath}`,
        kind: 'link-propagate',
        targetFieldPath: fieldPath,
        sourceFieldPaths: [from],
        debugInfo: {
          graphEdgeId: edgeId,
        },
      })
    } else if (entry.kind === 'source') {
      const resourceId = entry.meta.resource
      const resourceMeta = Meta.sanitize((entry.meta as any).meta)

      const existing = resourcesById.get(resourceId)
      if (existing) {
        const ownerFields = [...existing.ownerFields, fieldPath]
        let meta = existing.meta
        let metaOrigin = existing.metaOrigin
        let metaConflicts = existing.metaConflicts

        if (resourceMeta) {
          const merged = Meta.mergeCanonical(
            { meta, origin: metaOrigin, conflicts: metaConflicts },
            { origin: fieldPath, meta: resourceMeta },
          )
          meta = merged.meta
          metaOrigin = merged.origin
          metaConflicts = merged.conflicts
        }

        resourcesById.set(resourceId, {
          ...existing,
          ownerFields,
          meta,
          metaOrigin,
          metaConflicts,
        })
      } else {
        resourcesById.set(resourceId, {
          resourceId,
          // Use a simple identifier string for now; may evolve into a structured form based on key rules.
          keySelector: `StateTrait.source@${fieldPath}`,
          ownerFields: [fieldPath],
          meta: resourceMeta,
          metaOrigin: resourceMeta ? fieldPath : undefined,
        })
      }

      planSteps.push({
        id: `source:${fieldPath}`,
        kind: 'source-refresh',
        targetFieldPath: fieldPath,
        resourceId,
        keySelectorId: `StateTrait.source@${fieldPath}`,
      })

      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps) {
        for (const dep of deps) {
          ensureField(dep)
          edges.push({
            id: `source-dep:${dep}->${fieldPath}`,
            from: dep,
            to: fieldPath,
            kind: 'source-dep',
          })
        }
      }
    } else if (entry.kind === 'externalStore') {
      planSteps.push({
        id: `external-store:${fieldPath}`,
        kind: 'external-store-sync',
        targetFieldPath: fieldPath,
      })
    } else if (entry.kind === 'check') {
      planSteps.push({
        id: `check:${fieldPath}`,
        kind: 'check-validate',
        targetFieldPath: fieldPath,
      })

      // If the rule explicitly declares deps, add Graph edges (for ReverseClosure scoped validate).
      if (trait.deps.length > 0) {
        for (const dep of trait.deps) {
          ensureField(dep)
          edges.push({
            id: `check-dep:${dep}->${fieldPath}`,
            from: dep,
            to: fieldPath,
            kind: 'check-dep',
          })
        }
      }
    }
  }

  for (const field of fieldMap.values()) {
    nodes.push({
      id: field.id,
      field,
      traits: field.traits,
      meta: nodeMetaByFieldPath.get(field.id),
    })
  }

  const graph: StateTraitGraph = {
    _tag: 'StateTraitGraph',
    nodes,
    edges,
    resources: Array.from(resourcesById.values()),
  }

  const plan: StateTraitPlan = {
    _tag: 'StateTraitPlan',
    steps: planSteps,
  }

  return { graph, plan }
}

/**
 * Performs a simple cycle detection for link edges.
 *
 * - Only considers edges with kind = 'link'; computed/source do not participate in the first version.
 * - On cycle detection, throws an error with path context to avoid infinite updates at runtime.
 */
const assertNoLinkCycles = (edges: ReadonlyArray<StateTraitGraphEdge>): void => {
  const adjacency = new Map<string, string[]>()

  for (const edge of edges) {
    if (edge.kind !== 'link') continue
    const list = adjacency.get(edge.from) ?? []
    list.push(edge.to)
    adjacency.set(edge.from, list)
  }

  const visited = new Set<string>()
  const stack = new Set<string>()

  const dfs = (node: string): void => {
    if (stack.has(node)) {
      throw new Error(
        `[StateTrait.build] link cycle detected at field "${node}". ` +
          'Please check link traits for circular dependencies.',
      )
    }
    if (visited.has(node)) return
    visited.add(node)
    stack.add(node)

    const nexts = adjacency.get(node)
    if (nexts) {
      for (const to of nexts) {
        dfs(to)
      }
    }

    stack.delete(node)
  }

  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }
}

const collectSchemaPaths = (
  entries: ReadonlyArray<StateTraitEntry<any, string>>,
): ReadonlyArray<StateTraitSchemaPathRef> => {
  const byKey = new Map<string, StateTraitSchemaPathRef>()

  const add = (ref: StateTraitSchemaPathRef): void => {
    if (!ref.path) return
    const k = `${ref.kind}|${ref.entryKind}|${ref.entryFieldPath}|${ref.ruleName ?? ''}|${ref.path}`
    byKey.set(k, ref)
  }

  const getCheckWritebackPath = (entry: Extract<StateTraitEntry<any, string>, { readonly kind: 'check' }>): string => {
    const wb = (entry.meta as any)?.writeback
    const p = wb && typeof wb === 'object' ? (wb as any).path : undefined
    const writebackPath = typeof p === 'string' && p.startsWith('errors.') ? p : undefined

    if (writebackPath) return writebackPath

    const fieldPath = entry.fieldPath
    if (fieldPath.endsWith('[]')) {
      return `errors.${fieldPath.slice(0, -2)}`
    }
    return `errors.${fieldPath}`
  }

  for (const entry of entries) {
    add({
      kind: 'fieldPath',
      entryKind: entry.kind,
      entryFieldPath: entry.fieldPath,
      path: entry.fieldPath,
    })

    if (entry.kind === 'computed' || entry.kind === 'source') {
      const deps = ((entry.meta as any)?.deps ?? []) as ReadonlyArray<string>
      for (const dep of deps) {
        add({
          kind: 'dep',
          entryKind: entry.kind,
          entryFieldPath: entry.fieldPath,
          path: dep,
        })
      }
    }

    if (entry.kind === 'link') {
      add({
        kind: 'link_from',
        entryKind: 'link',
        entryFieldPath: entry.fieldPath,
        path: entry.meta.from as string,
      })
    }

    if (entry.kind === 'check') {
      add({
        kind: 'check_writeback',
        entryKind: 'check',
        entryFieldPath: entry.fieldPath,
        path: getCheckWritebackPath(entry),
      })

      const rules = ((entry.meta as any)?.rules ?? {}) as Record<string, any>
      for (const name of Object.keys(rules)) {
        const rule = rules[name]
        if (!rule || typeof rule !== 'object') continue
        const deps = (rule.deps ?? []) as ReadonlyArray<string>
        for (const dep of deps) {
          add({
            kind: 'dep',
            entryKind: 'check',
            entryFieldPath: entry.fieldPath,
            ruleName: name,
            path: dep,
          })
        }
      }
    }
  }

  return Array.from(byKey.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([, v]) => v)
}

/**
 * Builds a StateTraitProgram from the given stateSchema and trait spec.
 *
 * - Pure function: does not depend on external Env / global state.
 * - Current implementation focuses on:
 *   - Normalizing Spec into entries.
 *   - Building a lightweight Graph / Plan from entries.
 *   - Running basic cycle detection for link edges.
 *
 * If we later need finer-grained dependency analysis (e.g. static analysis for computed/key),
 * evolve it inside this module without changing the public API surface.
 */
export const build = <S extends object>(
  stateSchema: Schema.Schema<S, any>,
  spec: StateTraitSpec<S>,
): StateTraitProgram<S> => {
  const entries = normalizeSpec(spec) as ReadonlyArray<StateTraitEntry<S, string>>
  const nodeMetaByFieldPath = collectNodeMeta(spec)

  // Phase 4 (US2): require explicit deps (Graph/diagnostics/replay treat deps as the single dependency source of truth).
  for (const entry of entries) {
    if (entry.kind === 'computed') {
      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps === undefined) {
        throw new Error(
          `[StateTrait.build] Missing explicit deps for computed "${entry.fieldPath}". ` +
            'Please use StateTrait.computed({ deps: [...], get: ... }).',
        )
      }
    }
    if (entry.kind === 'source') {
      const deps = (entry.meta as any).deps as ReadonlyArray<string> | undefined
      if (deps === undefined) {
        throw new Error(
          `[StateTrait.build] Missing explicit deps for source "${entry.fieldPath}". ` +
            'Please provide meta.deps for StateTrait.source({ deps: [...], ... }).',
        )
      }
    }
    if (entry.kind === 'check') {
      const rules = ((entry.meta as any)?.rules ?? {}) as Record<string, any>
      for (const name of Object.keys(rules)) {
        const rule = rules[name]
        if (typeof rule === 'function' || !rule || typeof rule !== 'object') {
          throw new Error(
            `[StateTrait.build] Missing explicit deps for check "${entry.fieldPath}" rule "${name}". ` +
              'Please use { deps: [...], validate: ... } form.',
          )
        }
        if ((rule as any).deps === undefined) {
          throw new Error(
            `[StateTrait.build] Missing explicit deps for check "${entry.fieldPath}" rule "${name}". ` +
              'Please provide deps: [...].',
          )
        }
      }
    }
  }

  const { graph, plan } = buildGraph(entries, nodeMetaByFieldPath)

  // Run a cycle check for link edges to avoid obvious configuration errors.
  assertNoLinkCycles(graph.edges)

  return {
    stateSchema,
    spec,
    entries: entries as ReadonlyArray<StateTraitEntry<any, string>>,
    graph,
    plan,
    convergeIr: buildConvergeIr(stateSchema as any, entries as ReadonlyArray<StateTraitEntry<any, string>>),
    schemaPaths: collectSchemaPaths(entries as ReadonlyArray<StateTraitEntry<any, string>>),
  }
}
