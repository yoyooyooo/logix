import type { JsonValue } from '../../observability/jsonValue.js'
import type { AnyModuleShape, ModuleTag } from '../../runtime/core/module.js'
import * as SchemaAST from 'effect/SchemaAST'
import { normalizeFieldPath } from '../../field-path.js'
import type { ModulePortSpec, PortSpecAction, PortSpecEvent, PortSpecExport, PortSpecOutput } from './exportPortSpec.js'
import { summarizeAst, summarizeSchema } from './schemaSummary.js'

export type TypeIrNode = {
  readonly id: string
  readonly kind: string
  readonly label?: string
  readonly digest?: string
  readonly notes?: JsonValue
}

export type TypeIrProjection = {
  readonly types: ReadonlyArray<TypeIrNode>
  readonly roots?: JsonValue
  readonly notes?: JsonValue
}

export type TypeIrProjectorContext = {
  readonly moduleId: string
  readonly module: unknown
  readonly portSpec: ModulePortSpec
  readonly tag?: ModuleTag<string, AnyModuleShape>
  readonly stateSchema?: unknown
  readonly actionMap?: Record<string, unknown>
}

export interface TypeIrProjector {
  readonly projectorId: string
  readonly project: (ctx: TypeIrProjectorContext) => TypeIrProjection | undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeText = (value: unknown): string | undefined => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > 0 ? raw : undefined
}

const resolveActionMap = (tag: ModuleTag<string, AnyModuleShape> | undefined): Record<string, unknown> | undefined => {
  const map = (tag as any)?.shape?.actionMap
  return isRecord(map) ? (map as Record<string, unknown>) : undefined
}

const resolveStateSchema = (tag: ModuleTag<string, AnyModuleShape> | undefined): unknown => (tag as any)?.stateSchema

const resolveAstForPath = (
  ast: SchemaAST.AST,
  segments: ReadonlyArray<string>,
  seen: Set<SchemaAST.AST>,
): SchemaAST.AST | undefined => {
  if (segments.length === 0) return ast

  let current = ast
  while (true) {
    if (SchemaAST.isSuspend(current)) {
      if (seen.has(current)) return undefined
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
    const from = resolveAstForPath(current.from, segments, seen)
    if (from) return from
    return resolveAstForPath(current.to, segments, seen)
  }

  if (SchemaAST.isUnion(current)) {
    for (const node of current.types) {
      const resolved = resolveAstForPath(node, segments, seen)
      if (resolved) return resolved
    }
    return undefined
  }

  if (SchemaAST.isTupleType(current)) {
    return undefined
  }

  if (SchemaAST.isTypeLiteral(current)) {
    const [head, ...tail] = segments
    if (!head) return undefined
    for (const ps of current.propertySignatures) {
      if (String(ps.name) !== head) continue
      return resolveAstForPath(ps.type, tail, seen)
    }
    for (const sig of current.indexSignatures) {
      let param: SchemaAST.AST = sig.parameter as unknown as SchemaAST.AST
      while (SchemaAST.isRefinement(param)) {
        param = param.from
      }
      const tag = (param as any)?._tag
      if (tag === 'StringKeyword' || tag === 'TemplateLiteral') {
        return resolveAstForPath(sig.type, tail, seen)
      }
    }
  }

  return undefined
}

const summarizeExportPath = (schema: unknown, path: string): TypeIrNode | undefined => {
  const ast = isRecord(schema) ? ((schema as any).ast as SchemaAST.AST | undefined) : undefined
  if (!ast) return undefined
  if (path === '$root') {
    const summary = summarizeAst(ast)
    const label = summary.label ?? summary.tag
    const digest = summary.digest
    return label || digest ? { id: `port:export:${path}`, kind: 'export', label, digest } : undefined
  }
  const normalized = normalizeFieldPath(path)
  if (!normalized) return undefined
  const segs = normalized[0] === '$root' ? normalized.slice(1) : normalized
  if (segs.length === 0) return undefined
  const resolved = resolveAstForPath(ast, segs, new Set())
  if (!resolved) return undefined
  const summary = summarizeAst(resolved)
  const label = summary.label ?? summary.tag
  const digest = summary.digest
  return label || digest ? { id: `port:export:${path}`, kind: 'export', label, digest } : undefined
}

const mergeTypeNode = (base: TypeIrNode, next: TypeIrNode): TypeIrNode => ({
  id: base.id,
  kind: base.kind,
  label: base.label ?? next.label,
  digest: base.digest ?? next.digest,
  notes: base.notes ?? next.notes,
})

const addNode = (nodes: Map<string, TypeIrNode>, node: TypeIrNode): void => {
  const existing = nodes.get(node.id)
  if (!existing) {
    nodes.set(node.id, node)
    return
  }
  nodes.set(node.id, mergeTypeNode(existing, node))
}

const buildRoots = (
  entries: ReadonlyArray<{ readonly key: string; readonly typeId: string }>,
): Record<string, string> =>
  Object.fromEntries(
    entries
      .map((entry) => [entry.key, entry.typeId] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  )

const buildRootPaths = (
  entries: ReadonlyArray<{ readonly path: string; readonly typeId: string }>,
): Record<string, string> =>
  Object.fromEntries(
    entries
      .map((entry) => [entry.path, entry.typeId] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
  )

const actionNodeId = (key: string): string => `port:action:${key}`
const eventNodeId = (key: string): string => `port:event:${key}`
const outputNodeId = (key: string): string => `port:output:${key}`
const exportNodeId = (path: string): string => `port:export:${path}`

const buildNodeFromPort = (
  id: string,
  kind: string,
  hint: string | undefined,
  digest: string | undefined,
): TypeIrNode => ({
  id,
  kind,
  ...(hint ? { label: hint } : {}),
  ...(digest ? { digest } : {}),
})

const buildActionNode = (entry: PortSpecAction, schema: unknown): TypeIrNode => {
  const summary = summarizeSchema(schema)
  const hint = summary.label ?? summary.tag ?? normalizeText(entry.payloadType)
  return buildNodeFromPort(actionNodeId(entry.key), 'action', hint, summary.digest)
}

const buildEventNode = (entry: PortSpecEvent, schema: unknown): TypeIrNode => {
  const summary = summarizeSchema(schema)
  const hint = summary.label ?? summary.tag ?? normalizeText(entry.payloadType)
  return buildNodeFromPort(eventNodeId(entry.key), 'event', hint, summary.digest)
}

const buildOutputNode = (entry: PortSpecOutput): TypeIrNode => {
  const hint = normalizeText(entry.valueType)
  return buildNodeFromPort(outputNodeId(entry.key), 'output', hint, undefined)
}

const buildExportNode = (entry: PortSpecExport, schema: unknown): TypeIrNode => {
  const summarized = summarizeExportPath(schema, entry.path)
  if (summarized) return summarized
  const hint = normalizeText(entry.valueType)
  return buildNodeFromPort(exportNodeId(entry.path), 'export', hint, undefined)
}

export const defaultTypeIrProjector: TypeIrProjector = {
  projectorId: 'schema-ast@v1',
  project: (ctx) => {
    const tag = ctx.tag ?? (isRecord(ctx.module) ? (ctx.module as any).tag : undefined)
    const actionMap = ctx.actionMap ?? resolveActionMap(tag)
    const stateSchema = ctx.stateSchema ?? resolveStateSchema(tag)

    const nodes = new Map<string, TypeIrNode>()
    const actionRoots: Array<{ key: string; typeId: string }> = []
    const eventRoots: Array<{ key: string; typeId: string }> = []
    const outputRoots: Array<{ key: string; typeId: string }> = []
    const exportRoots: Array<{ path: string; typeId: string }> = []

    for (const entry of ctx.portSpec.actions) {
      const schema = actionMap?.[entry.key]
      const node = buildActionNode(entry, schema)
      addNode(nodes, node)
      actionRoots.push({ key: entry.key, typeId: node.id })
    }

    for (const entry of ctx.portSpec.events) {
      const schema = actionMap?.[entry.key]
      const node = buildEventNode(entry, schema)
      addNode(nodes, node)
      eventRoots.push({ key: entry.key, typeId: node.id })
    }

    for (const entry of ctx.portSpec.outputs) {
      const node = buildOutputNode(entry)
      addNode(nodes, node)
      outputRoots.push({ key: entry.key, typeId: node.id })
    }

    for (const entry of ctx.portSpec.exports) {
      const node = buildExportNode(entry, stateSchema)
      addNode(nodes, node)
      exportRoots.push({ path: entry.path, typeId: node.id })
    }

    const types = Array.from(nodes.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    const roots = {
      actions: buildRoots(actionRoots),
      events: buildRoots(eventRoots),
      outputs: buildRoots(outputRoots),
      exports: buildRootPaths(exportRoots),
    }

    return {
      types,
      roots,
    }
  },
}

export const runTypeIrProjectors = (
  projectors: ReadonlyArray<TypeIrProjector>,
  ctx: TypeIrProjectorContext,
): TypeIrProjection => {
  const types = new Map<string, TypeIrNode>()
  let roots: JsonValue | undefined
  let notes: JsonValue | undefined

  for (const projector of projectors) {
    const projection = projector.project(ctx)
    if (!projection) continue
    for (const node of projection.types ?? []) addNode(types, node)
    if (projection.roots !== undefined) roots = projection.roots
    if (projection.notes !== undefined) notes = projection.notes
  }

  return {
    types: Array.from(types.values()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    ...(roots !== undefined ? { roots } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }
}
