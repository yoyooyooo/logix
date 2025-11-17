import type { StateTraitEntry, StateTraitPlanStep, StateTraitProgram } from './model.js'
import * as CanonicalFieldPath from '../field-path.js'
import { fnv1a32, stableStringify } from '../digest.js'

export type FieldPath = CanonicalFieldPath.FieldPath

export interface StaticIrNode {
  readonly nodeId: string
  readonly kind: string
  readonly reads: ReadonlyArray<FieldPath>
  readonly writes: ReadonlyArray<FieldPath>
  readonly writesUnknown?: boolean
  readonly policy?: Record<string, unknown>
  readonly meta?: {
    readonly label?: string
    readonly description?: string
    readonly tags?: ReadonlyArray<string>
    readonly group?: string
    readonly docsUrl?: string
    readonly cacheGroup?: string
    readonly annotations?: Record<string, unknown>
  }
}

export interface StaticIrEdge {
  readonly edgeId: string
  readonly from: string
  readonly to: string
  readonly kind: string
}

export interface StaticIr {
  readonly version: string
  readonly moduleId: string
  /**
   * Stable digest (for drift detection / diffing): determined solely by the current export structure.
   */
  readonly digest: string
  readonly nodes: ReadonlyArray<StaticIrNode>
  readonly edges: ReadonlyArray<StaticIrEdge>
  readonly conflicts?: ReadonlyArray<unknown>
}

const normalizeFieldPaths = (paths: ReadonlyArray<string> | undefined): ReadonlyArray<FieldPath> => {
  if (!paths || paths.length === 0) return []
  const out: Array<FieldPath> = []
  for (const path of paths) {
    const normalized = CanonicalFieldPath.normalizeFieldPath(path)
    if (normalized) out.push(normalized)
  }
  return out
}

const normalizeFieldPath = (path: string | undefined): FieldPath | undefined =>
  path ? CanonicalFieldPath.normalizeFieldPath(path) : undefined

const toNodeKind = (step: StateTraitPlanStep): string => {
  switch (step.kind) {
    case 'computed-update':
      return 'computed'
    case 'link-propagate':
      return 'link'
    case 'source-refresh':
      return 'source'
    case 'check-validate':
      return 'check'
  }
}

const findEntryForStep = (
  program: StateTraitProgram<any>,
  step: StateTraitPlanStep,
): StateTraitEntry<any, string> | undefined => {
  const fieldPath = step.targetFieldPath
  if (!fieldPath) return undefined
  const kind = toNodeKind(step)
  return program.entries.find(
    (e) =>
      e.fieldPath === fieldPath &&
      (e.kind === kind ||
        (kind === 'check' && e.kind === 'check') ||
        (kind === 'source' && e.kind === 'source') ||
        (kind === 'link' && e.kind === 'link') ||
        (kind === 'computed' && e.kind === 'computed')),
  )
}

const getReadsForEntry = (entry: StateTraitEntry<any, string> | undefined): ReadonlyArray<string> | undefined => {
  if (!entry) return undefined
  if (entry.kind === 'computed') {
    return (entry.meta as any).deps as ReadonlyArray<string> | undefined
  }
  if (entry.kind === 'source') {
    return (entry.meta as any).deps as ReadonlyArray<string> | undefined
  }
  if (entry.kind === 'link') {
    const from = (entry.meta as any).from as string | undefined
    return from ? [from] : []
  }
  if (entry.kind === 'check') {
    const rules = ((entry.meta as any)?.rules ?? {}) as Record<string, any>
    const out: Array<string> = []
    for (const name of Object.keys(rules)) {
      const rule = rules[name]
      const deps = rule?.deps as ReadonlyArray<string> | undefined
      if (deps) out.push(...deps)
    }
    return out
  }
  return undefined
}

export const exportStaticIr = (params: {
  readonly program: StateTraitProgram<any>
  readonly moduleId: string
  readonly version?: string
}): StaticIr => {
  const moduleId = params.moduleId
  const version = params.version ?? '009'

  const metaByField = new Map<
    string,
    {
      readonly label?: string
      readonly description?: string
      readonly tags?: ReadonlyArray<string>
      readonly group?: string
      readonly docsUrl?: string
      readonly cacheGroup?: string
      readonly annotations?: Record<string, unknown>
    }
  >()
  for (const node of params.program.graph.nodes) {
    const meta = node.meta as any
    if (!meta || typeof meta !== 'object') continue
    const label = typeof meta.label === 'string' ? meta.label : undefined
    const description = typeof meta.description === 'string' ? meta.description : undefined
    const tags =
      Array.isArray(meta.tags) && meta.tags.every((t: unknown) => typeof t === 'string')
        ? (meta.tags as ReadonlyArray<string>)
        : undefined
    const group = typeof meta.group === 'string' ? meta.group : undefined
    const docsUrl = typeof meta.docsUrl === 'string' ? meta.docsUrl : undefined
    const cacheGroup = typeof meta.cacheGroup === 'string' ? meta.cacheGroup : undefined

    const annotationsRaw = meta.annotations
    const annotations =
      annotationsRaw && typeof annotationsRaw === 'object' && !Array.isArray(annotationsRaw)
        ? (annotationsRaw as Record<string, unknown>)
        : undefined

    if (label || description || tags || group || docsUrl || cacheGroup || annotations) {
      metaByField.set(node.id, {
        label,
        description,
        tags,
        group,
        docsUrl,
        cacheGroup,
        annotations,
      })
    }
  }

  const nodes: Array<StaticIrNode> = params.program.plan.steps.map((step) => {
    const kind = toNodeKind(step)
    const entry = findEntryForStep(params.program, step)
    const reads = normalizeFieldPaths(getReadsForEntry(entry))

    const target = step.targetFieldPath
    const write = normalizeFieldPath(target)
    const writes = write ? [write] : []

    const meta = target ? metaByField.get(target) : undefined

    const base: StaticIrNode = {
      nodeId: step.id,
      kind,
      reads,
      writes: kind === 'check' ? [] : writes,
      meta,
    }

    if (kind !== 'check' && target && !write) {
      return { ...base, writesUnknown: true }
    }
    return base
  })

  const edges: Array<StaticIrEdge> = params.program.graph.edges.map((edge) => ({
    edgeId: edge.id,
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
  }))

  const base = {
    version,
    moduleId,
    nodes,
    edges,
  } as const

  const digest = `stir:${version}:${fnv1a32(stableStringify(base))}`

  return {
    ...base,
    digest,
  }
}
