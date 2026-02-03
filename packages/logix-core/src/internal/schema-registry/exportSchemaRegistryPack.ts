import { ModuleVersion, Option } from 'effect'
import * as SchemaAST from 'effect/SchemaAST'

import type { AnyModuleShape, ModuleTag } from '../runtime/core/module.js'
import type { ModuleManifest } from '../reflection/manifest.js'
import type { JsonValue } from '../observability/jsonValue.js'
import type { TrialRunArtifactExporter } from '../observability/artifacts/exporter.js'
import { fnv1a32, stableStringify } from '../digest.js'

export const SCHEMA_REGISTRY_PROTOCOL_VERSION = 'v1' as const
export const SCHEMA_REGISTRY_ARTIFACT_KEY = '@logixjs/schema.registry@v1' as const

type SchemaIdSource = 'annotation' | 'derived'

type SchemaRegistryPackEntry = {
  readonly schemaId: string
  readonly schemaIdSource: SchemaIdSource
  readonly ast: JsonValue
  readonly jsonSchema?: JsonValue
  readonly meta?: {
    readonly title?: string
    readonly description?: string
    readonly docsUrl?: string
    readonly tags?: ReadonlyArray<string>
  }
}

type SchemaRegistryPack = {
  readonly protocolVersion: typeof SCHEMA_REGISTRY_PROTOCOL_VERSION
  readonly effectVersion: string
  readonly schemas: ReadonlyArray<SchemaRegistryPackEntry>
  readonly notes?: JsonValue
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const safeJson = (value: unknown): JsonValue => {
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue
  } catch (cause) {
    return {
      _tag: 'schema_registry::export_failed',
      message: '[Logix] Failed to export SchemaAST as JSON',
      cause: String((cause as any)?.message ?? cause),
    } as const
  }
}

const schemaIdFromAnnotation = (value: SchemaAST.SchemaIdAnnotation): string | undefined => {
  if (typeof value === 'string') return asNonEmptyString(value)
  if (typeof value === 'symbol') {
    const key = Symbol.keyFor(value) ?? value.description
    return asNonEmptyString(key)
  }
  return undefined
}

const deriveSchemaId = (astJson: JsonValue): string => `schema:${fnv1a32(stableStringify(astJson))}`

const schemaIdOfAst = (ast: SchemaAST.AST, astJson: JsonValue): { readonly schemaId: string; readonly source: SchemaIdSource } => {
  const annotated = Option.getOrUndefined(SchemaAST.getSchemaIdAnnotation(ast))
  const id = annotated ? schemaIdFromAnnotation(annotated) : undefined
  if (id) return { schemaId: id, source: 'annotation' }
  return { schemaId: deriveSchemaId(astJson), source: 'derived' }
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

const resolveStateSchema = (tag: ModuleTag<string, AnyModuleShape> | undefined): unknown =>
  (tag as any)?.shape?.stateSchema ?? (tag as any)?.stateSchema

const resolveActionMap = (tag: ModuleTag<string, AnyModuleShape> | undefined): Record<string, unknown> | undefined => {
  const map = (tag as any)?.shape?.actionMap
  return isRecord(map) ? (map as Record<string, unknown>) : undefined
}

const resolveSchemaAst = (schema: unknown): SchemaAST.AST | undefined => {
  const ast = isRecord(schema) ? ((schema as any).ast as unknown) : undefined
  if (!ast || (typeof ast !== 'object' && typeof ast !== 'function')) return undefined
  return ast as SchemaAST.AST
}

const resolveActionPayloadSchema = (token: unknown): unknown => {
  if (!isRecord(token)) return undefined
  const schema = (token as any).schema
  return schema
}

const buildTags = (tags: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.from(new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0))).sort()

const buildEntry = (args: {
  readonly ast: SchemaAST.AST
  readonly astJson: JsonValue
  readonly schemaId: string
  readonly schemaIdSource: SchemaIdSource
  readonly tags: ReadonlyArray<string>
}): SchemaRegistryPackEntry => {
  const title = Option.getOrUndefined(SchemaAST.getTitleAnnotation(args.ast))
  const description = Option.getOrUndefined(SchemaAST.getDescriptionAnnotation(args.ast))
  const docs = Option.getOrUndefined(SchemaAST.getDocumentationAnnotation(args.ast))

  const jsonSchemaAnn = Option.getOrUndefined(SchemaAST.getJSONSchemaAnnotation(args.ast))
  const jsonSchema = jsonSchemaAnn ? safeJson(jsonSchemaAnn) : undefined

  const meta = {
    ...(title ? { title } : null),
    ...(description ? { description } : null),
    ...(docs ? { docsUrl: docs } : null),
    ...(args.tags.length > 0 ? { tags: buildTags(args.tags) } : null),
  }

  return {
    schemaId: args.schemaId,
    schemaIdSource: args.schemaIdSource,
    ast: args.astJson,
    ...(jsonSchema !== undefined ? { jsonSchema } : null),
    ...(Object.keys(meta).length > 0 ? { meta } : null),
  }
}

export const exportSchemaRegistryPack = (params: {
  readonly module: unknown
  readonly manifest?: ModuleManifest
}): SchemaRegistryPack => {
  const tag = resolveModuleTag(params.module)
  const moduleId = resolveModuleId(params.module, params.manifest)

  const entriesById = new Map<string, SchemaRegistryPackEntry>()
  const usageActions: Record<string, string> = {}

  const addSchema = (schema: unknown, tags: ReadonlyArray<string>): string | undefined => {
    const ast = resolveSchemaAst(schema)
    if (!ast) return undefined
    const astJson = safeJson(ast)
    const resolved = schemaIdOfAst(ast, astJson)
    const schemaId = resolved.schemaId

    const existing = entriesById.get(schemaId)
    if (existing) {
      const prevTags = (existing.meta?.tags ?? []) as ReadonlyArray<string>
      const mergedTags = buildTags([...prevTags, ...tags])
      const meta = existing.meta ? { ...existing.meta, ...(mergedTags.length > 0 ? { tags: mergedTags } : null) } : undefined
      entriesById.set(schemaId, meta ? { ...existing, meta } : existing)
      return schemaId
    }

    entriesById.set(
      schemaId,
      buildEntry({
        ast,
        astJson,
        schemaId,
        schemaIdSource: resolved.source,
        tags,
      }),
    )

    return schemaId
  }

  const stateSchema = resolveStateSchema(tag)
  const stateSchemaId = addSchema(stateSchema, ['kind:state', `module:${moduleId}`])

  const actionMap = resolveActionMap(tag)
  if (actionMap) {
    for (const key of Object.keys(actionMap).sort()) {
      const token = actionMap[key]
      const payloadSchema = resolveActionPayloadSchema(token)
      const schemaId = addSchema(payloadSchema, ['kind:action_payload', `module:${moduleId}`, `action:${key}`])
      if (schemaId) {
        usageActions[key] = schemaId
      }
    }
  }

  const effectVersion = ModuleVersion.getCurrentVersion()

  const notes: JsonValue = {
    __logix: {
      moduleId,
      ...(stateSchemaId ? { state: { schemaId: stateSchemaId } } : null),
      ...(Object.keys(usageActions).length > 0
        ? { actions: Object.fromEntries(Object.keys(usageActions).sort().map((k) => [k, usageActions[k]!])) }
        : null),
    },
  }

  const schemas = Array.from(entriesById.values()).sort((a, b) => (a.schemaId < b.schemaId ? -1 : a.schemaId > b.schemaId ? 1 : 0))

  return {
    protocolVersion: SCHEMA_REGISTRY_PROTOCOL_VERSION,
    effectVersion,
    schemas,
    notes,
  }
}

export const makeSchemaRegistryPackArtifactExporter = (module: unknown): TrialRunArtifactExporter => ({
  exporterId: 'logix.core.schemaRegistry@v1',
  artifactKey: SCHEMA_REGISTRY_ARTIFACT_KEY,
  export: (ctx) =>
    exportSchemaRegistryPack({
      module,
      manifest: ctx.manifest,
    }) as JsonValue,
})
