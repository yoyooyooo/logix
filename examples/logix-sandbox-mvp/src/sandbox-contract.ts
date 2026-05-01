import { SandboxClientLayer } from '@logixjs/sandbox'

export type SandboxClientConfig = NonNullable<Parameters<typeof SandboxClientLayer>[0]>
export type KernelRegistry = NonNullable<SandboxClientConfig['kernelRegistry']>

export interface HttpMockRule {
  readonly url: string
  readonly method?: string
  readonly status?: number
  readonly delayMs?: number
  readonly json?: unknown
}

export interface MockManifest {
  readonly http?: ReadonlyArray<HttpMockRule>
}

export interface UiIntentPacket {
  readonly id: string
  readonly component: string
  readonly intent: 'mount' | 'update' | 'unmount' | 'action'
  readonly props: Record<string, unknown>
  readonly callbacks: ReadonlyArray<string>
  readonly children?: ReadonlyArray<UiIntentPacket>
  readonly meta?: {
    readonly storyId?: string
    readonly stepId?: string
    readonly label?: string
    readonly severity?: 'info' | 'warn' | 'error'
    readonly tags?: ReadonlyArray<string>
  }
}

export interface SandboxErrorInfo {
  readonly code: 'INIT_FAILED' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'WORKER_TERMINATED'
  readonly message: string
  readonly stack?: string
  readonly requestedKernelId?: string
  readonly availableKernelIds?: ReadonlyArray<string>
  readonly effectiveKernelId?: string
  readonly fallbackReason?: string
}

export interface SandboxRunResult {
  readonly runId: string
  readonly duration: number
  readonly requestedKernelId?: string
  readonly effectiveKernelId?: string
  readonly fallbackReason?: string
  readonly kernelImplementationRef?: unknown
  readonly stateSnapshot?: unknown
  readonly traces: ReadonlyArray<unknown>
  readonly logs: ReadonlyArray<unknown>
  readonly uiIntents?: ReadonlyArray<UiIntentPacket>
}
