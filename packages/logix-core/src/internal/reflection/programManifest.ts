import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../module.js'
import type { AnyProgram } from '../program.js'
import { getProgramBlueprintId, getProgramRuntimeBlueprint } from '../program.js'
import { fnv1a32, stableStringify } from '../digest.js'
import type { ModuleManifest } from './manifest.js'
import { extractManifest } from './manifest.js'
import { summarizePayloadSchema, type PayloadSchemaSummary } from './payloadSummary.js'

export interface MinimumProgramActionManifest {
  readonly manifestVersion: string
  readonly programId: string
  readonly moduleId: string
  readonly revision?: number
  readonly digest: string
  readonly actions: ReadonlyArray<{
    readonly actionTag: string
    readonly payload: {
      readonly kind: 'void' | 'nonVoid' | 'unknown'
      readonly summary?: string
    }
    readonly authority: 'runtime-reflection' | 'manifest'
  }>
}

export interface ExtractMinimumProgramActionManifestOptions {
  readonly programId?: string
  readonly revision?: number
  readonly authority?: 'runtime-reflection' | 'manifest'
}

export interface RuntimeReflectionSourceRef {
  readonly kind: 'source' | 'static-ir' | 'host'
  readonly path?: string
  readonly digest?: string
  readonly moduleId?: string
}

export interface ReflectedActionDescriptor {
  readonly actionTag: string
  readonly payload: {
    readonly kind: 'void' | 'nonVoid' | 'unknown'
    readonly summary?: string
    readonly schemaDigest?: string
    readonly validatorAvailable: boolean
  }
  readonly primaryReducer?: {
    readonly kind: 'declared' | 'registered'
  }
  readonly source?: ModuleManifest['source']
  readonly authority: 'runtime-reflection' | 'manifest'
}

export interface RuntimeReflectionBudget {
  readonly maxActions?: number
  readonly truncated: boolean
  readonly originalActionCount: number
  readonly truncatedArrays?: ReadonlyArray<string>
}

export interface RuntimeReflectionManifest {
  readonly manifestVersion: 'runtime-reflection-manifest@167B'
  readonly programId: string
  readonly rootModuleId: string
  readonly rootModule: ModuleManifest
  readonly modules: ReadonlyArray<ModuleManifest>
  readonly actions: ReadonlyArray<ReflectedActionDescriptor>
  readonly initialState?: PayloadSchemaSummary
  readonly logicUnits: NonNullable<ModuleManifest['logicUnits']>
  readonly effects: NonNullable<ModuleManifest['effects']>
  readonly processes: ReadonlyArray<{ readonly processKey: string }>
  readonly imports: ReadonlyArray<{ readonly moduleId: string; readonly digest?: string }>
  readonly services: ReadonlyArray<{ readonly serviceKey: string }>
  readonly capabilities: {
    readonly run: 'available'
    readonly check: 'available'
    readonly trial: 'available'
  }
  readonly sourceRefs: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly staticIrDigest?: string
  readonly budget: RuntimeReflectionBudget
  readonly digest: string
}

export interface ExtractRuntimeReflectionManifestOptions {
  readonly programId?: string
  readonly sourceRefs?: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly budgets?: {
    readonly maxActions?: number
  }
}

export interface RuntimeReflectionManifestDiffChange {
  readonly code: 'action.added' | 'action.removed' | 'payload.changed' | 'budget.degraded' | 'manifestVersion.changed'
  readonly actionTag?: string
  readonly before?: unknown
  readonly after?: unknown
}

export interface RuntimeReflectionManifestDiff {
  readonly beforeDigest: string
  readonly afterDigest: string
  readonly changes: ReadonlyArray<RuntimeReflectionManifestDiffChange>
  readonly summary: {
    readonly actionAdded: number
    readonly actionRemoved: number
    readonly payloadChanged: number
  }
}

export const projectMinimumProgramActionManifest = (
  manifest: ModuleManifest,
  options: ExtractMinimumProgramActionManifestOptions = {},
): MinimumProgramActionManifest => ({
  manifestVersion: 'program-action-manifest@167A',
  programId: options.programId ?? manifest.moduleId,
  moduleId: manifest.moduleId,
  ...(options.revision === undefined ? {} : { revision: options.revision }),
  digest: manifest.digest,
  actions: manifest.actions.map((action) => ({
    actionTag: action.actionTag,
    payload: {
      kind: action.payload.kind,
      ...(action.payload.summary ? { summary: action.payload.summary } : {}),
    },
    authority: options.authority ?? 'runtime-reflection',
  })),
})

export const extractMinimumProgramActionManifest = (
  program: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram,
  options: ExtractMinimumProgramActionManifestOptions = {},
): MinimumProgramActionManifest => projectMinimumProgramActionManifest(extractManifest(program), options)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isProgramRuntimeBlueprint = (value: unknown): value is ProgramRuntimeBlueprint<any, AnyModuleShape, any> =>
  isRecord(value) && value._tag === 'ProgramRuntimeBlueprint'

const resolveBlueprint = (
  input: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram,
): ProgramRuntimeBlueprint<any, AnyModuleShape, any> =>
  isProgramRuntimeBlueprint(input) ? input : getProgramRuntimeBlueprint(input as AnyProgram)

const MODULE_INTERNAL = Symbol.for('logix.module.internal')

const internalOf = (input: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(input)) return undefined
  const internal = (input as Record<PropertyKey, unknown>)[MODULE_INTERNAL]
  return isRecord(internal) ? internal : undefined
}

const sortSourceRefs = (
  input: ReadonlyArray<RuntimeReflectionSourceRef> | undefined,
): ReadonlyArray<RuntimeReflectionSourceRef> =>
  Array.from(input ?? []).sort((a, b) => {
    const ak = `${a.kind}:${a.moduleId ?? ''}:${a.path ?? ''}:${a.digest ?? ''}`
    const bk = `${b.kind}:${b.moduleId ?? ''}:${b.path ?? ''}:${b.digest ?? ''}`
    return ak < bk ? -1 : ak > bk ? 1 : 0
  })

const actionDescriptorOf = (action: ModuleManifest['actions'][number]): ReflectedActionDescriptor => ({
  actionTag: action.actionTag,
  payload: {
    kind: action.payload.kind,
    ...(action.payload.summary ? { summary: action.payload.summary } : {}),
    ...(action.payload.schemaDigest ? { schemaDigest: action.payload.schemaDigest } : {}),
    validatorAvailable: action.payload.schemaDigest !== undefined,
  },
  ...(action.primaryReducer ? { primaryReducer: action.primaryReducer } : {}),
  ...(action.source ? { source: action.source } : {}),
  authority: 'runtime-reflection',
})

const serviceSummariesOf = (input: unknown): ReadonlyArray<{ readonly serviceKey: string }> => {
  if (!isRecord(input)) return []
  const services = isRecord(input.services) ? input.services : undefined
  if (!services) return []
  return Object.keys(services).sort().map((serviceKey) => ({ serviceKey }))
}

const importSummariesOf = (
  internal: Record<string, unknown> | undefined,
): ReadonlyArray<{ readonly moduleId: string; readonly digest?: string }> => {
  const imports = Array.isArray(internal?.imports) ? internal.imports : []
  const out: Array<{ readonly moduleId: string; readonly digest?: string }> = []
  for (const item of imports) {
    if (!isProgramRuntimeBlueprint(item)) continue
    const manifest = extractManifest(item)
    out.push({
      moduleId: manifest.moduleId,
      digest: manifest.digest,
    })
  }
  out.sort((a, b) => (a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0))
  return out
}

const processSummariesOf = (
  internal: Record<string, unknown> | undefined,
): ReadonlyArray<{ readonly processKey: string }> => {
  const processes = Array.isArray(internal?.processes) ? internal.processes : []
  return processes.map((_, index) => ({ processKey: `process:${index + 1}` }))
}

const applyActionBudget = (
  actions: ReadonlyArray<ReflectedActionDescriptor>,
  maxActions: number | undefined,
): {
  readonly actions: ReadonlyArray<ReflectedActionDescriptor>
  readonly budget: RuntimeReflectionBudget
} => {
  const validMax = typeof maxActions === 'number' && Number.isFinite(maxActions) && maxActions >= 0
    ? Math.floor(maxActions)
    : undefined
  if (validMax === undefined || actions.length <= validMax) {
    return {
      actions,
      budget: {
        ...(validMax !== undefined ? { maxActions: validMax } : {}),
        truncated: false,
        originalActionCount: actions.length,
      },
    }
  }

  return {
    actions: actions.slice(0, validMax),
    budget: {
      maxActions: validMax,
      truncated: true,
      originalActionCount: actions.length,
      truncatedArrays: ['actions'],
    },
  }
}

const digestRuntimeManifest = (manifest: Omit<RuntimeReflectionManifest, 'digest'>): string =>
  `runtime-manifest:${fnv1a32(stableStringify(manifest))}`

export const extractRuntimeReflectionManifest = (
  program: ProgramRuntimeBlueprint<any, AnyModuleShape, any> | AnyProgram,
  options: ExtractRuntimeReflectionManifestOptions = {},
): RuntimeReflectionManifest => {
  const blueprint = resolveBlueprint(program)
  const rootModule = extractManifest(program)
  const internal = internalOf(program)
  const allActions = rootModule.actions.map(actionDescriptorOf)
  const { actions, budget } = applyActionBudget(allActions, options.budgets?.maxActions)
  const initialState = blueprint.module?.stateSchema ? summarizePayloadSchema(blueprint.module.stateSchema) : undefined

  const base: Omit<RuntimeReflectionManifest, 'digest'> = {
    manifestVersion: 'runtime-reflection-manifest@167B',
    programId: options.programId ?? getProgramBlueprintId(program) ?? rootModule.moduleId,
    rootModuleId: rootModule.moduleId,
    rootModule,
    modules: [rootModule],
    actions,
    ...(initialState ? { initialState } : {}),
    logicUnits: rootModule.logicUnits ?? [],
    effects: rootModule.effects ?? [],
    processes: processSummariesOf(internal),
    imports: importSummariesOf(internal),
    services: serviceSummariesOf(program),
    capabilities: {
      run: 'available',
      check: 'available',
      trial: 'available',
    },
    sourceRefs: sortSourceRefs(options.sourceRefs),
    ...(rootModule.staticIr?.digest ? { staticIrDigest: rootModule.staticIr.digest } : {}),
    budget,
  }

  return {
    ...base,
    digest: digestRuntimeManifest(base),
  }
}

const indexActions = (
  actions: ReadonlyArray<ReflectedActionDescriptor>,
): ReadonlyMap<string, ReflectedActionDescriptor> => {
  const map = new Map<string, ReflectedActionDescriptor>()
  for (const action of actions) {
    map.set(action.actionTag, action)
  }
  return map
}

export const diffRuntimeReflectionManifest = (
  before: RuntimeReflectionManifest,
  after: RuntimeReflectionManifest,
): RuntimeReflectionManifestDiff => {
  const changes: RuntimeReflectionManifestDiffChange[] = []

  if (before.manifestVersion !== after.manifestVersion) {
    changes.push({
      code: 'manifestVersion.changed',
      before: before.manifestVersion,
      after: after.manifestVersion,
    })
  }

  const beforeActions = indexActions(before.actions)
  const afterActions = indexActions(after.actions)

  for (const actionTag of Array.from(beforeActions.keys()).sort()) {
    if (!afterActions.has(actionTag)) {
      changes.push({ code: 'action.removed', actionTag })
    }
  }

  for (const actionTag of Array.from(afterActions.keys()).sort()) {
    if (!beforeActions.has(actionTag)) {
      changes.push({ code: 'action.added', actionTag })
    }
  }

  for (const actionTag of Array.from(beforeActions.keys()).sort()) {
    const beforeAction = beforeActions.get(actionTag)
    const afterAction = afterActions.get(actionTag)
    if (!beforeAction || !afterAction) continue
    const beforePayload = {
      kind: beforeAction.payload.kind,
      summary: beforeAction.payload.summary ?? null,
      schemaDigest: beforeAction.payload.schemaDigest ?? null,
    }
    const afterPayload = {
      kind: afterAction.payload.kind,
      summary: afterAction.payload.summary ?? null,
      schemaDigest: afterAction.payload.schemaDigest ?? null,
    }
    if (stableStringify(beforePayload) !== stableStringify(afterPayload)) {
      changes.push({
        code: 'payload.changed',
        actionTag,
        before: beforePayload,
        after: afterPayload,
      })
    }
  }

  if (!before.budget.truncated && after.budget.truncated) {
    changes.push({
      code: 'budget.degraded',
      before: before.budget,
      after: after.budget,
    })
  }

  changes.sort((a, b) => {
    if (a.code !== b.code) return a.code < b.code ? -1 : 1
    const aa = a.actionTag ?? ''
    const bb = b.actionTag ?? ''
    return aa < bb ? -1 : aa > bb ? 1 : 0
  })

  return {
    beforeDigest: before.digest,
    afterDigest: after.digest,
    changes,
    summary: {
      actionAdded: changes.filter((change) => change.code === 'action.added').length,
      actionRemoved: changes.filter((change) => change.code === 'action.removed').length,
      payloadChanged: changes.filter((change) => change.code === 'payload.changed').length,
    },
  }
}
