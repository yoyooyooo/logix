import type { AnyModuleShape, ModuleImpl, ModuleTag } from '../../runtime/core/module.js'
import type { ModuleManifest } from '../manifest.js'
import type { exportStaticIr } from '../staticIr.js'
import type { JsonValue } from '../../observability/jsonValue.js'
import type { TrialRunArtifactExporter } from '../../observability/artifacts/exporter.js'
import type { TypeIrBudget } from './typeIrBudget.js'
import { applyTypeIrBudget } from './typeIrBudget.js'
import { exportPortSpec } from './exportPortSpec.js'
import type { ModulePortSpec } from './exportPortSpec.js'
import {
  defaultTypeIrProjector,
  runTypeIrProjectors,
  type TypeIrNode,
  type TypeIrProjector,
} from './typeIrProjector.js'

export const TYPE_IR_PROTOCOL_VERSION = 'v1' as const
export const TYPE_IR_ARTIFACT_KEY = '@logixjs/module.typeIr@v1' as const

export type ModuleTypeIr = {
  readonly protocolVersion: typeof TYPE_IR_PROTOCOL_VERSION
  readonly moduleId: string
  readonly truncated?: boolean
  readonly budget?: {
    readonly maxNodes: number
    readonly maxDepth?: number
  }
  readonly types: ReadonlyArray<TypeIrNode>
  readonly roots?: JsonValue
  readonly notes?: JsonValue
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
    const id = normalizeText((input as any).id)
    if (id) return id
  }
  const tag = resolveModuleTag(input)
  const tagId = normalizeText(tag?.id)
  return tagId ?? 'unknown'
}

const resolveActionMap = (tag: ModuleTag<string, AnyModuleShape> | undefined): Record<string, unknown> | undefined => {
  const map = (tag as any)?.shape?.actionMap
  return isRecord(map) ? (map as Record<string, unknown>) : undefined
}

const resolveStateSchema = (tag: ModuleTag<string, AnyModuleShape> | undefined): unknown =>
  (tag as any)?.shape?.stateSchema ?? (tag as any)?.stateSchema

const mergeNotes = (notes: JsonValue | undefined, patch: Record<string, JsonValue>): JsonValue => {
  if (isRecord(notes)) {
    const base = notes as Record<string, JsonValue>
    const prevLogix = isRecord(base.__logix) ? (base.__logix as Record<string, JsonValue>) : {}
    const nextLogix = isRecord(patch.__logix) ? (patch.__logix as Record<string, JsonValue>) : {}
    return {
      ...base,
      ...patch,
      __logix: {
        ...prevLogix,
        ...nextLogix,
      },
    }
  }

  if (notes === undefined) return patch

  const logixPatch = isRecord(patch.__logix) ? (patch.__logix as Record<string, JsonValue>) : {}

  return {
    __logix: {
      ...logixPatch,
      previousNotes: notes,
    },
  } as unknown as JsonValue
}

const isProjectorArray = (
  projectors: TypeIrProjector | ReadonlyArray<TypeIrProjector>,
): projectors is ReadonlyArray<TypeIrProjector> => Array.isArray(projectors)

const normalizeProjectors = (
  projectors: TypeIrProjector | ReadonlyArray<TypeIrProjector> | undefined,
): ReadonlyArray<TypeIrProjector> => {
  if (!projectors) return [defaultTypeIrProjector]
  return isProjectorArray(projectors) ? projectors : [projectors]
}

export const exportTypeIr = (params: {
  readonly module: unknown
  readonly manifest?: ModuleManifest
  readonly staticIr?: ReturnType<typeof exportStaticIr>
  readonly budget?: TypeIrBudget
  readonly projectors?: TypeIrProjector | ReadonlyArray<TypeIrProjector>
  readonly portSpec?: ModulePortSpec
}): ModuleTypeIr | undefined => {
  const tag = resolveModuleTag(params.module)
  const moduleId = resolveModuleId(params.module, params.manifest)
  const actionMap = resolveActionMap(tag)
  const stateSchema = resolveStateSchema(tag)

  const portSpec =
    params.portSpec ??
    exportPortSpec({
      module: params.module,
      manifest: params.manifest,
      staticIr: params.staticIr,
    })

  const projectors = normalizeProjectors(params.projectors)
  const projection = runTypeIrProjectors(projectors, {
    moduleId,
    module: params.module,
    portSpec,
    tag,
    stateSchema,
    actionMap,
  })

  const budgeted = applyTypeIrBudget(projection.types, params.budget)
  const budget = budgeted.budget

  const projectorIds = Array.from(
    new Set(projectors.map((p) => normalizeText(p.projectorId)).filter((x): x is string => typeof x === 'string')),
  ).sort()

  let notes = projection.notes
  if (projectorIds.length > 0) {
    notes = mergeNotes(notes, { __logix: { projectorIds } })
  }
  if (budgeted.truncated) {
    notes = mergeNotes(notes, {
      __logix: {
        typeIrTruncation: {
          truncated: true,
          droppedTypeIds: budgeted.droppedTypeIds,
          budget,
        },
      },
    })
  }

  const out: ModuleTypeIr = {
    protocolVersion: TYPE_IR_PROTOCOL_VERSION,
    moduleId,
    types: budgeted.types,
    budget,
    ...(budgeted.truncated ? { truncated: true } : {}),
    ...(projection.roots !== undefined ? { roots: projection.roots } : {}),
    ...(notes !== undefined ? { notes } : {}),
  }

  return out
}

export const makeTypeIrArtifactExporter = (
  module: unknown,
  options?: {
    readonly budget?: TypeIrBudget
    readonly projectors?: TypeIrProjector | ReadonlyArray<TypeIrProjector>
  },
): TrialRunArtifactExporter => ({
  exporterId: 'logix.core.typeIr@v1',
  artifactKey: TYPE_IR_ARTIFACT_KEY,
  export: (ctx) =>
    exportTypeIr({
      module,
      manifest: ctx.manifest,
      staticIr: ctx.staticIr,
      budget: options?.budget,
      projectors: options?.projectors,
    }) as JsonValue,
})
