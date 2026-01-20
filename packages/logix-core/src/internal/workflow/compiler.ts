import { fnv1a32, stableStringify } from '../digest.js'
import { isJsonValue, projectJsonValue, type JsonValue } from '../observability/jsonValue.js'
import { makeWorkflowError } from './errors.js'
import type {
  StepKey,
  WorkflowDefV1,
  WorkflowStepV1,
  WorkflowStaticIrV1,
  WorkflowStaticNode,
  WorkflowStaticStep,
  WorkflowTriggerV1,
  WorkflowProgramId,
  WorkflowNodeId,
  WorkflowEdge,
  WorkflowEdgeKind,
} from './model.js'
import { compileInputExpr, type CompiledInputExpr } from './inputExpr.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const asNonNegInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n >= 0 ? n : undefined
}

const asPosInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n > 0 ? n : undefined
}

export const normalizeWorkflowDefV1 = (input: WorkflowDefV1): WorkflowDefV1 => {
  // Fill trivial defaults (canonical shape):
  // - call.onSuccess/onFailure must be explicit arrays.
  const normalizeSteps = (steps: ReadonlyArray<WorkflowStepV1>): ReadonlyArray<WorkflowStepV1> =>
    steps.map((s) => {
      if (s.kind !== 'call') return s
      return {
        ...s,
        onSuccess: Array.isArray((s as any).onSuccess) ? s.onSuccess : [],
        onFailure: Array.isArray((s as any).onFailure) ? s.onFailure : [],
      }
    })

  return {
    ...input,
    steps: normalizeSteps(input.steps),
  }
}

export const validateWorkflowDefV1 = (def: WorkflowDefV1, options?: { readonly moduleId?: string }): void => {
  if (def.astVersion !== 1) {
    throw makeWorkflowError({
      code: 'WORKFLOW_UNSUPPORTED_VERSION',
      message: 'Unsupported workflow astVersion.',
      detail: { astVersion: (def as any).astVersion },
    })
  }

  if (!asNonEmptyString(def.localId)) {
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_DEF',
      message: 'WorkflowDef.localId must be a non-empty string.',
      detail: { localId: (def as any).localId },
    })
  }

  const trigger = def.trigger as WorkflowTriggerV1
  if (trigger?.kind === 'action') {
    if (!asNonEmptyString((trigger as any).actionTag)) {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_TRIGGER',
        message: 'Workflow trigger.actionTag must be a non-empty string.',
        detail: { trigger },
      })
    }
  } else if (trigger?.kind === 'lifecycle') {
    const phase = (trigger as any).phase
    if (phase !== 'onStart' && phase !== 'onInit') {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_TRIGGER',
        message: 'Workflow trigger.phase must be "onStart" or "onInit".',
        detail: { trigger },
      })
    }
  } else {
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_TRIGGER',
      message: 'Workflow trigger.kind must be "action" or "lifecycle".',
      detail: { trigger },
    })
  }

  const seenKeys = new Set<string>()
  const visit = (step: WorkflowStepV1, fragmentId?: string): void => {
    const key = asNonEmptyString((step as any).key)
    if (!key) {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_STEP',
        message: 'Workflow step.key must be a non-empty string.',
        detail: { stepKey: (step as any).key, kind: (step as any).kind },
        source: fragmentId ? { fragmentId } : undefined,
      })
    }

    if (seenKeys.has(key)) {
      throw makeWorkflowError({
        code: 'WORKFLOW_DUPLICATE_STEP_KEY',
        message: `Duplicate stepKey "${key}" detected.`,
        detail: { duplicateKey: key },
        source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
      })
    }
    seenKeys.add(key)

    if (step.kind === 'dispatch') {
      if (!asNonEmptyString((step as any).actionTag)) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_STEP',
          message: 'dispatch.actionTag must be a non-empty string.',
          source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
          detail: { actionTag: (step as any).actionTag },
        })
      }
      const payload = (step as any).payload
      if (payload !== undefined) {
        validateInputExpr(payload as any, { stepKey: key })
      }
      return
    }

    if (step.kind === 'delay') {
      const ms = asNonNegInt((step as any).ms)
      if (ms === undefined) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_STEP',
          message: 'delay.ms must be a non-negative integer.',
          source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
          detail: { ms: (step as any).ms },
        })
      }
      return
    }

    if (step.kind === 'call') {
      if (!asNonEmptyString((step as any).serviceId)) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_SERVICE_ID',
          message: 'call.serviceId must be a non-empty string.',
          source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
          detail: { serviceId: (step as any).serviceId },
        })
      }
      const inputExpr = (step as any).input
      if (inputExpr !== undefined) {
        validateInputExpr(inputExpr as any, { stepKey: key })
      }
      const timeoutMsRaw = (step as any).timeoutMs
      if (timeoutMsRaw !== undefined && asPosInt(timeoutMsRaw) === undefined) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_STEP',
          message: 'call.timeoutMs must be a positive integer (milliseconds).',
          source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
          detail: { timeoutMs: timeoutMsRaw },
        })
      }
      const retryRaw = (step as any).retry
      if (retryRaw !== undefined) {
        const times = asPosInt((retryRaw as any)?.times)
        if (times === undefined) {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_STEP',
            message: 'call.retry.times must be a positive integer.',
            source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
            detail: { retry: retryRaw },
          })
        }
      }

      const onSuccess = Array.isArray((step as any).onSuccess) ? ((step as any).onSuccess as WorkflowStepV1[]) : []
      const onFailure = Array.isArray((step as any).onFailure) ? ((step as any).onFailure as WorkflowStepV1[]) : []
      for (const inner of onSuccess) visit(inner, fragmentId)
      for (const inner of onFailure) visit(inner, fragmentId)
      return
    }

    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_STEP',
      message: 'Unknown step kind.',
      source: { stepKey: key, ...(fragmentId ? { fragmentId } : null) },
      detail: { kind: (step as any).kind },
    })
  }

  const sources = def.sources
  const fragmentByStepKey = new Map<string, string | undefined>()
  if (sources && typeof sources === 'object') {
    for (const [k, v] of Object.entries(sources)) {
      fragmentByStepKey.set(k, isRecord(v) ? asNonEmptyString((v as any).fragmentId) : undefined)
    }
  }

  for (const step of def.steps) {
    const key = asNonEmptyString((step as any).key)
    const fragmentId = key ? fragmentByStepKey.get(key) : undefined
    visit(step, fragmentId)
  }

  // meta.generator must stay JSON-only.
  const generator = (def as any)?.meta?.generator
  if (generator !== undefined && !isJsonValue(generator)) {
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_DEF',
      message: 'WorkflowDef.meta.generator must be JSON-serializable.',
      detail: { generator },
    })
  }

  // policy validation (minimal)
  const policy = def.policy as any
  if (policy) {
    const concurrency = policy.concurrency
    if (concurrency !== undefined && concurrency !== 'latest' && concurrency !== 'exhaust' && concurrency !== 'parallel') {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_DEF',
        message: 'policy.concurrency must be latest|exhaust|parallel.',
        detail: { concurrency },
      })
    }
    const priority = policy.priority
    if (priority !== undefined && priority !== 'urgent' && priority !== 'nonUrgent') {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_DEF',
        message: 'policy.priority must be urgent|nonUrgent.',
        detail: { priority },
      })
    }
  }

  // moduleId is only used to improve error context; no additional validation here.
  void options?.moduleId
}

const validateInputExpr = (expr: unknown, options?: { readonly stepKey?: string }): void => {
  const visit = (e: any): void => {
    if (!e || typeof e !== 'object') {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_INPUT_EXPR',
        message: 'InputExpr must be an object.',
        source: { stepKey: options?.stepKey },
        detail: { expr: e },
      })
    }
    const kind = e.kind
    switch (kind) {
      case 'payload':
        return
      case 'payload.path': {
        const pointer = e.pointer
        if (typeof pointer !== 'string') {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_INPUT_EXPR',
            message: 'InputExpr.payload.path.pointer must be a string.',
            source: { stepKey: options?.stepKey },
            detail: { pointer },
          })
        }
        return
      }
      case 'const': {
        const value = e.value
        if (!isJsonValue(value)) {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_INPUT_EXPR',
            message: 'InputExpr.const.value must be JSON-serializable.',
            source: { stepKey: options?.stepKey },
          })
        }
        return
      }
      case 'object': {
        const fields = e.fields
        if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_INPUT_EXPR',
            message: 'InputExpr.object.fields must be a record.',
            source: { stepKey: options?.stepKey },
          })
        }
        for (const v of Object.values(fields as Record<string, unknown>)) {
          visit(v)
        }
        return
      }
      case 'merge': {
        const items = e.items
        if (!Array.isArray(items)) {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_INPUT_EXPR',
            message: 'InputExpr.merge.items must be an array.',
            source: { stepKey: options?.stepKey },
          })
        }
        for (const item of items) {
          visit(item)
        }
        return
      }
      default:
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_INPUT_EXPR',
          message: 'Unknown InputExpr kind.',
          source: { stepKey: options?.stepKey },
          detail: { kind },
        })
    }
  }

  visit(expr as any)
}

// ---- Static IR compilation ----

const makeDigest = (prefix: string, value: unknown): string => `${prefix}:${fnv1a32(stableStringify(value))}`

const makeTriggerNodeId = (programId: string): WorkflowNodeId => `wf_trigger_v1:${fnv1a32(programId)}`

const makeStepNodeId = (programId: string, stepKey: StepKey, kind: string): WorkflowNodeId =>
  `wf_node_v1:${fnv1a32(`${programId}\u0000${stepKey}\u0000${kind}`)}`

const budgetJsonValue = (value: JsonValue): JsonValue => projectJsonValue(value).value

const budgetInputExpr = (expr: unknown): unknown => {
  if (!expr || typeof expr !== 'object') return expr

  const kind = (expr as any).kind
  switch (kind) {
    case 'payload':
    case 'payload.path':
      return expr
    case 'const': {
      const value = (expr as any).value
      if (!isJsonValue(value)) return expr
      return { ...expr, value: budgetJsonValue(value) }
    }
    case 'object': {
      const fields = (expr as any).fields
      if (!isRecord(fields)) return expr
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(fields).sort((a, b) => a.localeCompare(b))) {
        out[k] = budgetInputExpr(fields[k])
      }
      return { ...expr, fields: out }
    }
    case 'merge': {
      const items = (expr as any).items
      if (!Array.isArray(items)) return expr
      return { ...expr, items: items.map(budgetInputExpr) }
    }
    default:
      return expr
  }
}

const toStaticStep = (step: WorkflowStepV1): WorkflowStaticStep => {
  switch (step.kind) {
    case 'dispatch':
      return {
        kind: 'dispatch',
        actionTag: step.actionTag,
        ...(step.payload ? { payload: budgetInputExpr(step.payload) as any } : null),
      }
    case 'delay':
      return { kind: 'delay', ms: step.ms }
    case 'call': {
      const policy =
        step.timeoutMs !== undefined || step.retry !== undefined
          ? {
              ...(step.timeoutMs !== undefined ? { timeoutMs: step.timeoutMs } : null),
              ...(step.retry !== undefined ? { retry: { times: step.retry.times } } : null),
            }
          : undefined
      return {
        kind: 'call',
        serviceId: step.serviceId,
        ...(step.input ? { input: budgetInputExpr(step.input) as any } : null),
        ...(policy ? { policy } : null),
      }
    }
  }
}

export const compileWorkflowStaticIrV1 = (args: {
  readonly moduleId: string
  readonly def: WorkflowDefV1
}): WorkflowStaticIrV1 => {
  const normalized = normalizeWorkflowDefV1(args.def)
  validateWorkflowDefV1(normalized, { moduleId: args.moduleId })

  const programId: WorkflowProgramId = `${args.moduleId}.${normalized.localId}`
  const triggerNodeId = makeTriggerNodeId(programId)

  const fragmentByStepKey = new Map<string, string | undefined>()
  if (normalized.sources && typeof normalized.sources === 'object') {
    for (const [k, v] of Object.entries(normalized.sources)) {
      fragmentByStepKey.set(k, isRecord(v) ? asNonEmptyString((v as any).fragmentId) : undefined)
    }
  }

  const nodesByKey = new Map<string, WorkflowNodeId>()

  const collectNodes = (steps: ReadonlyArray<WorkflowStepV1>) => {
    for (const step of steps) {
      const id = makeStepNodeId(programId, step.key, step.kind)
      nodesByKey.set(step.key, id)
      if (step.kind === 'call') {
        collectNodes(step.onSuccess)
        collectNodes(step.onFailure)
      }
    }
  }
  collectNodes(normalized.steps)

  const nodes: WorkflowStaticNode[] = [
    {
      id: triggerNodeId,
      kind: 'trigger',
      trigger: normalized.trigger as any,
    },
  ]

  const addStepNodes = (steps: ReadonlyArray<WorkflowStepV1>) => {
    for (const step of steps) {
      const id = nodesByKey.get(step.key)
      if (!id) continue
      const fragmentId = fragmentByStepKey.get(step.key)
      nodes.push({
        id,
        kind: 'step',
        step: toStaticStep(step),
        source: {
          stepKey: step.key,
          ...(fragmentId ? { fragmentId } : null),
        },
      })
      if (step.kind === 'call') {
        addStepNodes(step.onSuccess)
        addStepNodes(step.onFailure)
      }
    }
  }
  addStepNodes(normalized.steps)

  const edges: WorkflowEdge[] = []

  const pushEdge = (from: WorkflowNodeId, to: WorkflowNodeId, kind: WorkflowEdgeKind): void => {
    edges.push({ from, to, kind })
  }

  const compileBlock = (args: {
    readonly steps: ReadonlyArray<WorkflowStepV1>
    readonly entryFrom: ReadonlyArray<WorkflowNodeId>
    readonly entryKind: WorkflowEdgeKind
    readonly continuation?: WorkflowNodeId
  }): void => {
    if (args.steps.length === 0) {
      if (args.continuation) {
        for (const from of args.entryFrom) {
          pushEdge(from, args.continuation, args.entryKind)
        }
      }
      return
    }

    const first = args.steps[0]!
    const firstId = nodesByKey.get(first.key)
    if (!firstId) {
      throw makeWorkflowError({
        code: 'WORKFLOW_INVALID_STEP',
        message: 'Internal error: missing node id for stepKey.',
        programId,
        source: { stepKey: first.key },
      })
    }

    for (const from of args.entryFrom) {
      pushEdge(from, firstId, args.entryKind)
    }

    const compileStepAndTail = (step: WorkflowStepV1, tail: ReadonlyArray<WorkflowStepV1>, continuation?: WorkflowNodeId) => {
      const stepId = nodesByKey.get(step.key)
      if (!stepId) return

      if (step.kind !== 'call') {
        compileBlock({ steps: tail, entryFrom: [stepId], entryKind: 'next', continuation })
        return
      }

      const cont = tail.length > 0 ? nodesByKey.get(tail[0]!.key) : continuation

      compileBlock({
        steps: step.onSuccess,
        entryFrom: [stepId],
        entryKind: 'success',
        continuation: cont,
      })
      compileBlock({
        steps: step.onFailure,
        entryFrom: [stepId],
        entryKind: 'failure',
        continuation: cont,
      })

      compileBlock({ steps: tail, entryFrom: [], entryKind: 'next', continuation })
    }

    compileStepAndTail(first, args.steps.slice(1), args.continuation)
  }

  compileBlock({ steps: normalized.steps, entryFrom: [triggerNodeId], entryKind: 'next', continuation: undefined })

  // Stable ordering (for diff/digest).
  nodes.sort((a, b) => a.id.localeCompare(b.id))
  edges.sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from)
    if (a.to !== b.to) return a.to.localeCompare(b.to)
    return String(a.kind ?? '').localeCompare(String(b.kind ?? ''))
  })

  const meta: Record<string, JsonValue> | undefined = (() => {
    const generator = normalized.meta?.generator
    if (generator === undefined) return undefined
    return { generator: budgetJsonValue(generator) }
  })()

  const irNoDigest = {
    version: 1,
    programId,
    nodes,
    edges,
    policy: normalized.policy,
    meta,
  } as const

  const digest = makeDigest('workflow_ir_v1', irNoDigest)

  return {
    ...irNoDigest,
    digest,
  }
}

// ---- Runtime compilation (InputExpr precompile + shape checks) ----

export type CompiledWorkflowStep =
  | { readonly kind: 'dispatch'; readonly key: StepKey; readonly actionTag: string; readonly payload?: CompiledInputExpr }
  | { readonly kind: 'delay'; readonly key: StepKey; readonly ms: number }
  | {
      readonly kind: 'call'
      readonly key: StepKey
      readonly serviceId: string
      readonly input?: CompiledInputExpr
      readonly timeoutMs?: number
      readonly retryTimes?: number
      readonly onSuccess: ReadonlyArray<CompiledWorkflowStep>
      readonly onFailure: ReadonlyArray<CompiledWorkflowStep>
    }

export const compileWorkflowRuntimeStepsV1 = (args: {
  readonly def: WorkflowDefV1
}): ReadonlyArray<CompiledWorkflowStep> => {
  const normalized = normalizeWorkflowDefV1(args.def)
  validateWorkflowDefV1(normalized)

  const compileStep = (step: WorkflowStepV1): CompiledWorkflowStep => {
    const stepKey = step.key
    switch (step.kind) {
      case 'dispatch':
        return {
          kind: 'dispatch',
          key: step.key,
          actionTag: step.actionTag,
          ...(step.payload ? { payload: compileInputExpr(step.payload, { stepKey }) } : null),
        }
      case 'delay':
        return { kind: 'delay', key: step.key, ms: step.ms }
      case 'call': {
        const retryTimes = step.retry?.times
        return {
          kind: 'call',
          key: step.key,
          serviceId: step.serviceId,
          ...(step.input ? { input: compileInputExpr(step.input, { stepKey }) } : null),
          ...(step.timeoutMs !== undefined ? { timeoutMs: step.timeoutMs } : null),
          ...(retryTimes !== undefined ? { retryTimes } : null),
          onSuccess: step.onSuccess.map(compileStep),
          onFailure: step.onFailure.map(compileStep),
        }
      }
    }
  }

  return normalized.steps.map(compileStep)
}
