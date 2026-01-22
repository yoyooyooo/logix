import type { JsonValue } from '../observability/jsonValue.js'

export type WorkflowAstVersion = 1

export type WorkflowLocalId = string

export type StepKey = string

export type WorkflowTriggerV1 =
  | { readonly kind: 'action'; readonly actionTag: string }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }

export type WorkflowPolicyV1 = {
  readonly concurrency?: 'latest' | 'exhaust' | 'parallel'
  readonly priority?: 'urgent' | 'nonUrgent'
}

export type InputExprV1 =
  | { readonly kind: 'payload' }
  | { readonly kind: 'payload.path'; readonly pointer: string }
  | { readonly kind: 'const'; readonly value: JsonValue }
  | { readonly kind: 'object'; readonly fields: { readonly [k: string]: InputExprV1 } }
  | { readonly kind: 'merge'; readonly items: ReadonlyArray<InputExprV1> }

export type WorkflowStepV1 =
  | { readonly kind: 'dispatch'; readonly key: StepKey; readonly actionTag: string; readonly payload?: InputExprV1 }
  | { readonly kind: 'delay'; readonly key: StepKey; readonly ms: number }
  | {
      readonly kind: 'call'
      readonly key: StepKey
      readonly serviceId: string
      readonly input?: InputExprV1
      readonly timeoutMs?: number
      readonly retry?: { readonly times: number }
      readonly onSuccess: ReadonlyArray<WorkflowStepV1>
      readonly onFailure: ReadonlyArray<WorkflowStepV1>
    }

export type WorkflowDefV1 = {
  readonly astVersion: WorkflowAstVersion
  readonly localId: WorkflowLocalId
  readonly trigger: WorkflowTriggerV1
  readonly policy?: WorkflowPolicyV1
  readonly steps: ReadonlyArray<WorkflowStepV1>
  readonly sources?: { readonly [stepKey: string]: { readonly fragmentId?: string } }
  readonly meta?: { readonly generator?: JsonValue }
}

export type WorkflowDef = WorkflowDefV1

// ---- Static IR (workflowSurface / Π slice) ----

export type WorkflowStaticIrVersion = 1

export type WorkflowStableId = string

export type WorkflowNodeId = string

export type WorkflowSource = { readonly fragmentId?: string; readonly stepKey?: string }

export type WorkflowEdgeKind = 'next' | 'success' | 'failure'

export type WorkflowEdge = { readonly from: WorkflowNodeId; readonly to: WorkflowNodeId; readonly kind?: WorkflowEdgeKind }

export type WorkflowStaticTrigger =
  | { readonly kind: 'action'; readonly actionTag: string }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }

export type WorkflowStaticStep =
  | { readonly kind: 'dispatch'; readonly actionTag: string; readonly payload?: InputExprV1 }
  | {
      readonly kind: 'call'
      readonly serviceId: string
      readonly input?: InputExprV1
      readonly policy?: {
        readonly timeoutMs?: number
        readonly retry?: { readonly times: number }
      }
    }
  | { readonly kind: 'delay'; readonly ms: number }

export type WorkflowStaticNode =
  | {
      readonly id: WorkflowNodeId
      readonly kind: 'trigger'
      readonly trigger: WorkflowStaticTrigger
    }
  | {
      readonly id: WorkflowNodeId
      readonly kind: 'step'
      readonly step: WorkflowStaticStep
      readonly source?: WorkflowSource
    }

export type WorkflowStaticIrV1 = {
  readonly version: WorkflowStaticIrVersion
  readonly programId: WorkflowStableId
  readonly digest: string
  readonly nodes: ReadonlyArray<WorkflowStaticNode>
  readonly edges: ReadonlyArray<WorkflowEdge>
  readonly policy?: WorkflowPolicyV1
  readonly meta?: Record<string, JsonValue>
}

export type WorkflowStaticIr = WorkflowStaticIrV1

// ---- Build-time composition helpers ----

export type WorkflowFragmentV1 = {
  readonly fragmentId: string
  readonly steps: ReadonlyArray<WorkflowStepV1>
  readonly sources?: WorkflowDefV1['sources']
  readonly policy?: WorkflowPolicyV1
}

export type WorkflowPartV1 = ReadonlyArray<WorkflowStepV1> | WorkflowFragmentV1 | WorkflowComposeResultV1

export type WorkflowComposeResultV1 = {
  readonly steps: ReadonlyArray<WorkflowStepV1>
  readonly sources?: WorkflowDefV1['sources']
  readonly policy?: WorkflowPolicyV1
}
