import type { AnyModuleShape, ModuleImpl, ModuleTag } from '../../runtime/core/module.js'
import type { ModuleManifest } from '../manifest.js'
import type { exportStaticIr } from '../staticIr.js'
import type { JsonValue } from '../../observability/jsonValue.js'
import type { TrialRunArtifactExporter } from '../../observability/artifacts/exporter.js'
import * as SchemaAST from 'effect/SchemaAST'
import { normalizeFieldPath, toPathString } from '../../field-path.js'
import { fnv1a32, stableStringify } from '../../digest.js'
import { summarizeSchema } from './schemaSummary.js'

export const PORT_SPEC_PROTOCOL_VERSION = 'v1' as const
export const PORT_SPEC_ARTIFACT_KEY = '@logixjs/module.portSpec@v1' as const

export type PortSpecAction = {
  readonly key: string
  readonly payloadType?: string
}

export type PortSpecEvent = {
  readonly key: string
  readonly payloadType?: string
}

export type PortSpecOutput = {
  readonly key: string
  readonly valueType?: string
}

export type PortSpecExport = {
  readonly path: string
  readonly valueType?: string
}

export type ModulePortSpec = {
  readonly protocolVersion: typeof PORT_SPEC_PROTOCOL_VERSION
  readonly moduleId: string
  readonly actions: ReadonlyArray<PortSpecAction>
  readonly events: ReadonlyArray<PortSpecEvent>
  readonly outputs: ReadonlyArray<PortSpecOutput>
  readonly exports: ReadonlyArray<PortSpecExport>
  readonly digest?: string
  readonly notes?: JsonValue
}

type PortSpecMetaEntry =
  | string
  | {
      readonly key?: unknown
      readonly payloadType?: unknown
      readonly valueType?: unknown
    }

type PortSpecExportMetaEntry =
  | string
  | {
      readonly path?: unknown
      readonly valueType?: unknown
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeText = (value: unknown): string | undefined => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > 0 ? raw : undefined
}

const resolveModuleTag = (input: unknown): ModuleTag<string, AnyModuleShape> | undefined => {
  if (!isRecord(input)) return undefined
  if ((input as any)._tag === 'ModuleImpl' && isRecord((input as any).module)) {
    return (input as any).module as ModuleTag<string, AnyModuleShape>
  }
  const tag = (input as any).tag
  if (tag && (typeof tag === 'object' || typeof tag === 'function')) {
    return tag as ModuleTag<string, AnyModuleShape>
  }
  return undefined
}

const resolveModuleId = (input: unknown, manifest?: ModuleManifest): string => {
  if (manifest?.moduleId) return manifest.moduleId
  if (isRecord(input)) {
    const id = (input as any).id
    if (typeof id === 'string' && id.length > 0) return id
  }
  const tag = resolveModuleTag(input)
  const tagId = tag?.id
  return typeof tagId === 'string' && tagId.length > 0 ? tagId : 'unknown'
}

const resolveActionMap = (tag: ModuleTag<string, AnyModuleShape> | undefined): Record<string, unknown> | undefined => {
  const map = (tag as any)?.shape?.actionMap
  return isRecord(map) ? (map as Record<string, unknown>) : undefined
}

const resolveStateSchema = (tag: ModuleTag<string, AnyModuleShape> | undefined): unknown => (tag as any)?.stateSchema

const resolveMetaPorts = (input: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(input)) return undefined
  const meta = (input as any).meta
  if (!isRecord(meta)) return undefined
  const ports = (meta as any).ports
  return isRecord(ports) ? (ports as Record<string, unknown>) : undefined
}

const buildPayloadType = (schema: unknown): string | undefined => {
  const summary = summarizeSchema(schema)
  return summary.label ?? summary.tag ?? summary.digest
}

const normalizeActionEntries = (actionMap: Record<string, unknown> | undefined): ReadonlyArray<PortSpecAction> => {
  if (!actionMap) return []
  const out: Array<PortSpecAction> = []
  for (const key of Object.keys(actionMap).sort()) {
    const payloadType = buildPayloadType(actionMap[key])
    out.push(payloadType ? { key, payloadType } : { key })
  }
  return out
}

const normalizeMetaPortEntries = (
  value: unknown,
  kind: 'event' | 'output',
): ReadonlyArray<PortSpecEvent | PortSpecOutput> => {
  if (!Array.isArray(value)) return []
  const out: Array<PortSpecEvent | PortSpecOutput> = []
  for (const entry of value as ReadonlyArray<PortSpecMetaEntry>) {
    if (typeof entry === 'string') {
      const key = normalizeText(entry)
      if (!key) continue
      out.push(kind === 'event' ? { key } : { key })
      continue
    }
    if (isRecord(entry)) {
      const key = normalizeText((entry as any).key)
      if (!key) continue
      const payloadType = normalizeText((entry as any).payloadType)
      const valueType = normalizeText((entry as any).valueType)
      if (kind === 'event') {
        out.push(payloadType ? { key, payloadType } : { key })
      } else {
        out.push(valueType ? { key, valueType } : { key })
      }
    }
  }
  const dedup = new Map<string, PortSpecEvent | PortSpecOutput>()
  for (const item of out) dedup.set(item.key, item)
  return Array.from(dedup.values()).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

const normalizeMetaExportEntries = (value: unknown): ReadonlyArray<PortSpecExport> => {
  if (!Array.isArray(value)) return []
  const out: Array<PortSpecExport> = []
  for (const entry of value as ReadonlyArray<PortSpecExportMetaEntry>) {
    if (typeof entry === 'string') {
      const path = normalizeText(entry)
      if (!path) continue
      out.push({ path })
      continue
    }
    if (isRecord(entry)) {
      const path = normalizeText((entry as any).path)
      if (!path) continue
      const valueType = normalizeText((entry as any).valueType)
      out.push(valueType ? { path, valueType } : { path })
    }
  }
  const dedup = new Map<string, PortSpecExport>()
  for (const item of out) dedup.set(item.path, item)
  return Array.from(dedup.values()).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

const normalizeExportPath = (path: string): string | undefined => {
  const normalized = normalizeFieldPath(path)
  return normalized ? toPathString(normalized) : undefined
}

const collectExportPathsFromAst = (
  ast: SchemaAST.AST,
  options: {
    readonly maxDepth: number
    readonly base: ReadonlyArray<string>
    readonly seen: Set<SchemaAST.AST>
    readonly out: Set<string>
  },
): void => {
  if (options.maxDepth <= 0) return

  let current = ast

  while (true) {
    if (SchemaAST.isSuspend(current)) {
      if (options.seen.has(current)) return
      options.seen.add(current)
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
    collectExportPathsFromAst(current.to, options)
    collectExportPathsFromAst(current.from, options)
    return
  }

  if (SchemaAST.isUnion(current)) {
    for (const node of current.types) {
      collectExportPathsFromAst(node, options)
    }
    return
  }

  if (SchemaAST.isTupleType(current)) {
    // Arrays/tuples are treated as leaf nodes for export paths.
    return
  }

  if (SchemaAST.isTypeLiteral(current)) {
    for (const ps of current.propertySignatures) {
      const name = normalizeText(ps.name)
      if (!name) continue
      const next = [...options.base, name]
      const path = normalizeExportPath(next.join('.'))
      if (!path) continue
      options.out.add(path)
      collectExportPathsFromAst(ps.type, {
        ...options,
        base: next,
        maxDepth: options.maxDepth - 1,
      })
    }
    return
  }

  return
}

const collectExportPathsFromSchema = (schema: unknown): ReadonlyArray<string> => {
  const ast = isRecord(schema) ? ((schema as any).ast as SchemaAST.AST | undefined) : undefined
  if (!ast) return []
  const out = new Set<string>()
  collectExportPathsFromAst(ast, {
    maxDepth: 4,
    base: [],
    seen: new Set(),
    out,
  })
  return Array.from(out).sort()
}

export const exportPortSpec = (params: {
  readonly module: unknown
  readonly manifest?: ModuleManifest
  readonly staticIr?: ReturnType<typeof exportStaticIr>
}): ModulePortSpec => {
  const tag = resolveModuleTag(params.module)
  const moduleId = resolveModuleId(params.module, params.manifest)
  const actionMap = resolveActionMap(tag)
  const stateSchema = resolveStateSchema(tag)

  const actions = normalizeActionEntries(actionMap)

  const metaPorts = resolveMetaPorts(params.module)
  const metaEvents = normalizeMetaPortEntries(metaPorts?.events, 'event') as ReadonlyArray<PortSpecEvent>
  const metaOutputs = normalizeMetaPortEntries(metaPorts?.outputs, 'output') as ReadonlyArray<PortSpecOutput>
  const metaExports = normalizeMetaExportEntries(metaPorts?.exports)

  const events = metaEvents.length > 0 ? metaEvents : actions.map((a) => ({ ...a }))
  const outputs = metaOutputs

  const derivedPaths = collectExportPathsFromSchema(stateSchema)
  const exportsMap = new Map<string, PortSpecExport>()
  for (const entry of metaExports) exportsMap.set(entry.path, entry)
  for (const path of derivedPaths) {
    if (!exportsMap.has(path)) exportsMap.set(path, { path })
  }
  if (exportsMap.size === 0) {
    exportsMap.set('$root', { path: '$root' })
  }

  const exports = Array.from(exportsMap.values()).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  const base = {
    protocolVersion: PORT_SPEC_PROTOCOL_VERSION,
    moduleId,
    actions,
    events,
    outputs,
    exports,
  } as const

  const digest = `portspec:v1:${fnv1a32(stableStringify(base))}`

  return {
    ...base,
    digest,
  }
}

export const makePortSpecArtifactExporter = (module: unknown): TrialRunArtifactExporter => ({
  exporterId: 'logix.core.portSpec@v1',
  artifactKey: PORT_SPEC_ARTIFACT_KEY,
  export: (ctx) =>
    exportPortSpec({
      module,
      manifest: ctx.manifest,
      staticIr: ctx.staticIr,
    }) as JsonValue,
})
