import { Context } from 'effect'
import type { JsonValue } from './internal/observability/jsonValue.js'
import { fromTag as serviceIdFromTag } from './internal/serviceId.js'
import { makeWorkflowError } from './internal/workflow/errors.js'
import type { ModuleLogic, ModuleTag } from './internal/module.js'
import type {
  InputExprV1,
  WorkflowComposeResultV1,
  WorkflowDefV1,
  WorkflowFragmentV1,
  WorkflowPartV1,
  WorkflowPolicyV1,
  WorkflowStaticIrV1,
  WorkflowStepV1,
  WorkflowTriggerV1,
} from './internal/workflow/model.js'
import { compileWorkflowStaticIrV1, normalizeWorkflowDefV1, validateWorkflowDefV1 } from './internal/workflow/compiler.js'
import * as WorkflowRuntime from './internal/runtime/core/WorkflowRuntime.js'

export type WorkflowDef = WorkflowDefV1
export type WorkflowTrigger = WorkflowTriggerV1
export type WorkflowPolicy = WorkflowPolicyV1
export type WorkflowStep = WorkflowStepV1
export type WorkflowStaticIr = WorkflowStaticIrV1
export type InputExpr = InputExprV1
export type WorkflowFragment = WorkflowFragmentV1
export type WorkflowComposeResult = WorkflowComposeResultV1

class KernelSourceRefreshPortTagImpl extends Context.Tag('logix/kernel/sourceRefresh')<
  KernelSourceRefreshPortTagImpl,
  any
>() {}

export const KernelPorts = {
  sourceRefresh: KernelSourceRefreshPortTagImpl,
} as const

export type WithPolicyPatch = {
  readonly concurrency?: WorkflowPolicyV1['concurrency']
  readonly priority?: WorkflowPolicyV1['priority']
  /** Default for call.timeoutMs (only fills when step.timeoutMs is missing). */
  readonly timeoutMs?: number
  /** Default for call.retry.times (only fills when step.retry is missing). */
  readonly retry?: { readonly times: number }
}

type StepsInput =
  | ReadonlyArray<WorkflowStepV1>
  | (WorkflowComposeResultV1 & {
      readonly steps: ReadonlyArray<WorkflowStepV1>
    })

export interface Workflow {
  readonly _tag: 'Workflow'
  readonly def: WorkflowDefV1
  readonly toJSON: () => WorkflowDefV1
  readonly validate: () => void
  readonly exportStaticIr: (moduleId: string) => WorkflowStaticIrV1
  readonly install: (moduleTag: ModuleTag<any, any>) => ModuleLogic<any, any, never>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const mergePolicy = (base: WorkflowPolicyV1 | undefined, patch: WorkflowPolicyV1 | undefined): WorkflowPolicyV1 | undefined => {
  if (!base && !patch) return undefined
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
  }
}

const applyCallDefaults = (steps: ReadonlyArray<WorkflowStepV1>, patch: WithPolicyPatch): ReadonlyArray<WorkflowStepV1> => {
  const timeoutMsDefault = patch.timeoutMs
  const retryDefault = patch.retry

  const visit = (step: WorkflowStepV1): WorkflowStepV1 => {
    if (step.kind !== 'call') return step

    let changed = false
    const timeoutMs = step.timeoutMs ?? timeoutMsDefault
    if (timeoutMs !== step.timeoutMs) changed = true

    const retry = step.retry ?? retryDefault
    if (retry !== step.retry) changed = true

    const onSuccess = step.onSuccess.map(visit)
    const onFailure = step.onFailure.map(visit)
    if (onSuccess !== step.onSuccess) changed = true
    if (onFailure !== step.onFailure) changed = true

    if (!changed) return step

    return {
      ...step,
      ...(timeoutMs !== undefined ? { timeoutMs } : null),
      ...(retry !== undefined ? { retry } : null),
      onSuccess,
      onFailure,
    }
  }

  return steps.map(visit)
}

const resolveStepsInput = (input: unknown): WorkflowComposeResultV1 => {
  if (Array.isArray(input)) {
    return { steps: input as ReadonlyArray<WorkflowStepV1> }
  }
  if (isRecord(input) && Array.isArray((input as any).steps)) {
    return input as WorkflowComposeResultV1
  }
  throw makeWorkflowError({
    code: 'WORKFLOW_INVALID_DEF',
    message: 'Workflow.make: "steps" must be an array or a { steps, sources?, policy? } object.',
    detail: { steps: input },
  })
}

const recordSourcesForFragment = (
  sources: Record<string, { readonly fragmentId?: string }>,
  fragmentId: string,
  step: WorkflowStepV1,
): void => {
  sources[step.key] = { fragmentId }
  if (step.kind !== 'call') return
  for (const inner of step.onSuccess) recordSourcesForFragment(sources, fragmentId, inner)
  for (const inner of step.onFailure) recordSourcesForFragment(sources, fragmentId, inner)
}

export const onAction = (actionTag: string): WorkflowTriggerV1 => ({ kind: 'action', actionTag })

export const onStart = (): WorkflowTriggerV1 => ({ kind: 'lifecycle', phase: 'onStart' })

export const onInit = (): WorkflowTriggerV1 => ({ kind: 'lifecycle', phase: 'onInit' })

export const payload = (): InputExprV1 => ({ kind: 'payload' })

export const payloadPath = (pointer: string): InputExprV1 => ({ kind: 'payload.path', pointer })

export const constValue = (value: JsonValue): InputExprV1 => ({ kind: 'const', value })

export const object = (fields: Record<string, InputExprV1>): InputExprV1 => ({ kind: 'object', fields })

export const merge = (items: ReadonlyArray<InputExprV1>): InputExprV1 => ({ kind: 'merge', items })

export const dispatch = (args: {
  readonly key: string
  readonly actionTag: string
  readonly payload?: InputExprV1
}): WorkflowStepV1 => ({
  kind: 'dispatch',
  key: args.key,
  actionTag: args.actionTag,
  ...(args.payload ? { payload: args.payload } : null),
})

export const delay = (args: { readonly key: string; readonly ms: number }): WorkflowStepV1 => ({
  kind: 'delay',
  key: args.key,
  ms: args.ms,
})

export const callById = (args: {
  readonly key: string
  readonly serviceId: string
  readonly input?: InputExprV1
  readonly timeoutMs?: number
  readonly retry?: { readonly times: number }
  readonly onSuccess?: ReadonlyArray<WorkflowStepV1>
  readonly onFailure?: ReadonlyArray<WorkflowStepV1>
}): WorkflowStepV1 => ({
  kind: 'call',
  key: args.key,
  serviceId: args.serviceId,
  ...(args.input ? { input: args.input } : null),
  ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : null),
  ...(args.retry ? { retry: args.retry } : null),
  onSuccess: args.onSuccess ?? [],
  onFailure: args.onFailure ?? [],
})

export const call = (args: {
  readonly key: string
  readonly service: Context.Tag<any, any>
  readonly input?: InputExprV1
  readonly timeoutMs?: number
  readonly retry?: { readonly times: number }
  readonly onSuccess?: ReadonlyArray<WorkflowStepV1>
  readonly onFailure?: ReadonlyArray<WorkflowStepV1>
}): WorkflowStepV1 => {
  const serviceId = serviceIdFromTag(args.service)
  if (!serviceId) {
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_SERVICE_ID',
      message: 'call(service): serviceId derived from tag must be a non-empty string (see 078 ServiceId contract).',
      detail: { tag: String((args.service as any)?.toString?.() ?? 'tag') },
    })
  }

  return callById({
    ...args,
    serviceId,
  })
}

export const fragment = (fragmentId: string, steps: ReadonlyArray<WorkflowStepV1>): WorkflowFragmentV1 => ({
  fragmentId,
  steps,
})

export const withPolicy = (patch: WithPolicyPatch, part: WorkflowPartV1): WorkflowComposeResultV1 => {
  const normalized = (() => {
    if (Array.isArray(part)) return { steps: part } as WorkflowComposeResultV1
    if (isRecord(part) && Array.isArray((part as any).steps)) return part as WorkflowComposeResultV1
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_DEF',
      message: 'withPolicy: invalid workflow part (expected steps[] / fragment / composeResult).',
      detail: { part },
    })
  })()

  const steps = applyCallDefaults(normalized.steps, patch)
  const patchPolicy: WorkflowPolicyV1 | undefined = (() => {
    const concurrency = patch.concurrency
    const priority = patch.priority
    return concurrency !== undefined || priority !== undefined ? { concurrency, priority } : undefined
  })()

  // Outer withPolicy is weaker than inner (nested) policies: only fill missing program policy fields.
  const nextPolicy = mergePolicy(patchPolicy, normalized.policy)

  return {
    steps,
    ...(normalized.sources ? { sources: normalized.sources } : null),
    ...(nextPolicy ? { policy: nextPolicy } : null),
  }
}

export const compose = (...parts: ReadonlyArray<WorkflowPartV1>): WorkflowComposeResultV1 => {
  const steps: WorkflowStepV1[] = []
  const sources: Record<string, { readonly fragmentId?: string }> = {}
  let policy: WorkflowPolicyV1 | undefined = undefined

  const ownersByKey = new Map<string, Array<{ readonly stepKey: string; readonly fragmentId?: string }>>()

  const recordOwner = (stepKey: string, fragmentId: string | undefined) => {
    const list = ownersByKey.get(stepKey) ?? []
    list.push({ stepKey, ...(fragmentId ? { fragmentId } : null) })
    ownersByKey.set(stepKey, list)
  }

  const recordOwners = (
    step: WorkflowStepV1,
    resolveFragmentId: (stepKey: string) => string | undefined,
  ): void => {
    recordOwner(step.key, resolveFragmentId(step.key))
    if (step.kind !== 'call') return
    for (const inner of step.onSuccess) recordOwners(inner, resolveFragmentId)
    for (const inner of step.onFailure) recordOwners(inner, resolveFragmentId)
  }

  for (const part of parts) {
    if (Array.isArray(part)) {
      steps.push(...part)
      for (const step of part) recordOwners(step, () => undefined)
      continue
    }

    // fragment / composeResult
    const partSteps = (part as any).steps as ReadonlyArray<WorkflowStepV1> | undefined
    if (Array.isArray(partSteps)) {
      steps.push(...partSteps)
    }

    const partSources = (part as any).sources as WorkflowDefV1['sources'] | undefined
    if (partSources && typeof partSources === 'object') {
      for (const k of Object.keys(partSources).sort()) {
        sources[k] = { ...(partSources as any)[k] }
      }
    }

    const fragmentId = (part as any).fragmentId
    if (typeof fragmentId === 'string' && fragmentId.length > 0 && Array.isArray(partSteps)) {
      for (const step of partSteps) {
        recordSourcesForFragment(sources, fragmentId, step)
      }
    }

    if (Array.isArray(partSteps)) {
      const resolveFragmentIdForPart = (stepKey: string): string | undefined => {
        if (typeof fragmentId === 'string' && fragmentId.length > 0) return fragmentId
        const fromSources = partSources?.[stepKey]?.fragmentId
        return typeof fromSources === 'string' && fromSources.length > 0 ? fromSources : undefined
      }
      for (const step of partSteps) recordOwners(step, resolveFragmentIdForPart)
    }

    const partPolicy = (part as any).policy as WorkflowPolicyV1 | undefined
    policy = mergePolicy(policy, partPolicy)
  }

  const finalSources: WorkflowDefV1['sources'] | undefined = Object.keys(sources).length > 0 ? sources : undefined
  const duplicateKeys = Array.from(ownersByKey.entries())
    .filter(([, owners]) => owners.length > 1)
    .map(([k]) => k)
    .sort((a, b) => a.localeCompare(b))
  if (duplicateKeys.length > 0) {
    const k = duplicateKeys[0]!
    throw makeWorkflowError({
      code: 'WORKFLOW_DUPLICATE_STEP_KEY',
      message: `Duplicate stepKey "${k}" detected during composition.`,
      source: { stepKey: k },
      detail: { duplicateKey: k, owners: ownersByKey.get(k) ?? [] },
    })
  }

  return {
    steps,
    ...(finalSources ? { sources: finalSources } : null),
    ...(policy ? { policy } : null),
  }
}

export const make = (input: {
  readonly astVersion?: 1
  readonly localId: string
  readonly trigger: WorkflowTriggerV1
  readonly policy?: WorkflowPolicyV1
  readonly steps: StepsInput
  readonly meta?: { readonly generator?: JsonValue }
}): Workflow => {
  const localId = asNonEmptyString(input.localId)
  if (!localId) {
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_DEF',
      message: 'Workflow.make: localId must be a non-empty string.',
      detail: { localId: input.localId },
    })
  }

  const stepsInput = resolveStepsInput(input.steps)
  const merged = mergePolicy(input.policy, stepsInput.policy)

  const def: WorkflowDefV1 = normalizeWorkflowDefV1({
    astVersion: 1,
    localId,
    trigger: input.trigger,
    ...(merged ? { policy: merged } : null),
    steps: stepsInput.steps,
    ...(stepsInput.sources ? { sources: stepsInput.sources } : null),
    ...(input.meta ? { meta: input.meta } : null),
  })

  const staticIrCache = new Map<string, WorkflowStaticIrV1>()

  return {
    _tag: 'Workflow',
    def,
    toJSON: () => def,
    validate: () => validateWorkflowDefV1(def),
    exportStaticIr: (moduleId) => {
      const cached = staticIrCache.get(moduleId)
      if (cached) return cached
      const ir = compileWorkflowStaticIrV1({ moduleId, def })
      staticIrCache.set(moduleId, ir)
      return ir
    },
    install: (moduleTag) =>
      WorkflowRuntime.installOne({
        moduleTag: moduleTag as any,
        program: { _tag: 'Workflow', def },
      }) as any,
  } satisfies Workflow
}

export const fromJSON = (def: WorkflowDefV1): Workflow =>
  make({
    localId: def.localId,
    trigger: def.trigger,
    ...(def.policy ? { policy: def.policy } : null),
    steps: {
      steps: def.steps,
      ...(def.sources ? { sources: def.sources } : null),
    },
    ...(def.meta ? { meta: def.meta } : null),
  })
