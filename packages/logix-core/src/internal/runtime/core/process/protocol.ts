export type DiagnosticsLevel = 'off' | 'light' | 'full'

export type ProcessScope =
  | { readonly type: 'app'; readonly appId: string }
  | {
      readonly type: 'moduleInstance'
      readonly moduleId: string
      readonly instanceId: string
    }
  | { readonly type: 'uiSubtree'; readonly subtreeId: string }

export interface ProcessIdentity {
  readonly processId: string
  readonly scope: ProcessScope
}

export interface ProcessInstanceIdentity {
  readonly identity: ProcessIdentity
  readonly runSeq: number
}

export type ProcessTriggerSpec =
  | {
      readonly kind: 'moduleAction'
      readonly name?: string
      readonly moduleId: string
      readonly actionId: string
    }
  | {
      readonly kind: 'moduleStateChange'
      readonly name?: string
      readonly moduleId: string
      readonly path: string
    }
  | {
      readonly kind: 'platformEvent'
      readonly name?: string
      readonly platformEvent: string
    }
  | {
      readonly kind: 'timer'
      readonly name?: string
      readonly timerId: string
    }

export type ProcessTrigger =
  | {
      readonly kind: 'moduleAction'
      readonly name?: string
      readonly moduleId: string
      readonly instanceId: string
      readonly actionId: string
      readonly txnSeq: number
      readonly triggerSeq?: number
    }
  | {
      readonly kind: 'moduleStateChange'
      readonly name?: string
      readonly moduleId: string
      readonly instanceId: string
      readonly path: string
      readonly txnSeq: number
      readonly triggerSeq?: number
    }
  | {
      readonly kind: 'platformEvent'
      readonly name?: string
      readonly platformEvent: string
      readonly triggerSeq?: number
    }
  | {
      readonly kind: 'timer'
      readonly name?: string
      readonly timerId: string
      readonly triggerSeq?: number
    }

export interface ProcessConcurrencyPolicy {
  readonly mode: 'latest' | 'serial' | 'drop' | 'parallel'
  readonly maxParallel?: number
  readonly maxQueue?: number
}

export interface ProcessErrorPolicy {
  readonly mode: 'failStop' | 'supervise'
  readonly maxRestarts?: number
  readonly windowMs?: number
}

export interface ProcessDefinition {
  readonly processId: string
  readonly name?: string
  readonly description?: string
  readonly requires?: ReadonlyArray<string>
  readonly triggers: ReadonlyArray<ProcessTriggerSpec>
  readonly concurrency: ProcessConcurrencyPolicy
  readonly errorPolicy: ProcessErrorPolicy
  readonly diagnosticsLevel?: DiagnosticsLevel
}

export interface ProcessInstallation {
  readonly identity: ProcessIdentity
  readonly enabled: boolean
  readonly installedAt?: string
}

export interface SerializableErrorSummary {
  readonly name?: string
  readonly message: string
  readonly code?: string
  readonly hint?: string
}

export type ProcessInstanceStatus = {
  readonly identity: ProcessInstanceIdentity
  readonly status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed'
  readonly stoppedReason?: 'scopeDisposed' | 'manualStop' | 'failed' | 'unknown'
  readonly lastError?: SerializableErrorSummary
}

export type ProcessEvent = {
  readonly type:
    | 'process:start'
    | 'process:stop'
    | 'process:restart'
    | 'process:trigger'
    | 'process:dispatch'
    | 'process:error'
  readonly identity: ProcessInstanceIdentity
  readonly severity: 'info' | 'warning' | 'error'
  readonly eventSeq: number
  readonly timestampMs: number
  readonly trigger?: ProcessTrigger
  readonly dispatch?: {
    readonly moduleId: string
    readonly instanceId: string
    readonly actionId: string
  }
  readonly error?: SerializableErrorSummary
}

export interface ProcessControlRequest {
  readonly action: 'start' | 'stop' | 'restart'
  readonly reason?: string
}

export interface ProcessPlatformEvent {
  readonly eventName: string
  readonly payload?: Record<string, unknown>
}
