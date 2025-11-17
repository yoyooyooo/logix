/**
 * Sandbox public type definitions.
 */

// Trace Span
export interface TraceSpan {
  readonly spanId: string
  readonly parentSpanId?: string
  readonly name: string
  readonly startTime: number
  readonly endTime?: number
  readonly status: 'running' | 'success' | 'error' | 'cancelled'
  readonly attributes?: Record<string, unknown>
  readonly intentId?: string
  readonly stepId?: string
}

// Log Entry
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  readonly level: LogLevel
  readonly args: ReadonlyArray<unknown>
  readonly timestamp: number
  readonly source?: 'console' | 'effect' | 'logix'
}

// Sandbox Status
export type SandboxStatus = 'idle' | 'initializing' | 'ready' | 'running' | 'completed' | 'error'

// Kernel (multi-kernel: 058)

export type DiagnosticsLevel = 'off' | 'light' | 'sampled' | 'full'

/**
 * Stable identifier for a kernel variant.
 *
 * - Recommended: `[a-z0-9-]+` (lower-kebab)
 * - Recommended reserved names: `core`, `core-ng`
 */
export type KernelId = string

export interface KernelVariant {
  readonly kernelId: KernelId
  /** Optional label for UI display. */
  readonly label?: string
  /**
   * URL of the kernel entry (logix-core.js).
   * Sibling `effect.js` and `logix-core.manifest.json` are derived by convention.
   */
  readonly kernelUrl: string
}

export interface KernelRegistry {
  /** Available kernel variants. Order should be stable (recommend: registration order). */
  readonly kernels: ReadonlyArray<KernelVariant>
  /**
   * Default kernelId when no kernelId is requested and the fallback target when allowed.
   * Required when multiple kernels exist.
   */
  readonly defaultKernelId?: KernelId
  /** Whether cross-origin kernel resources are allowed (default should be false). */
  readonly allowCrossOrigin?: boolean
}

export interface KernelSelection {
  /** Optional requested kernelId (when omitted, use default selection rules). */
  readonly requestedKernelId?: KernelId
  /** Effective kernelId used for this run. */
  readonly effectiveKernelId: KernelId
  /** strict by default; any mismatch/fallback must fail unless explicitly allowed. */
  readonly strict: boolean
  /** If fallback happened, must be recorded (no silent fallback). */
  readonly fallbackReason?: string
}

// HTTP Mock Manifest (PoC)

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

// UI Intent (Semantic UI Mock / PoC)

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

// UI Callback (Host → Worker): used by Mock UI/Studio to send interactions back into sandboxed code
export interface UiCallbackPayload {
  readonly intentId: string
  readonly callback: string
  readonly data?: unknown
}

// Run Result
export interface RunResult {
  readonly runId: string
  readonly duration: number
  /**
   * 058 multi-kernel summary fields.
   * These fields are optional for single-kernel usage.
   */
  readonly requestedKernelId?: KernelId
  readonly effectiveKernelId?: KernelId
  readonly fallbackReason?: string
  /** Extracted from TrialRunReport.environment.kernelImplementationRef (045). */
  readonly kernelImplementationRef?: unknown
  readonly stateSnapshot?: unknown
  readonly traces: ReadonlyArray<TraceSpan>
  readonly logs: ReadonlyArray<LogEntry>
  readonly uiIntents?: ReadonlyArray<UiIntentPacket>
}

// Error
export type SandboxErrorCode = 'INIT_FAILED' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'WORKER_TERMINATED'

export interface SandboxErrorInfo {
  readonly code: SandboxErrorCode
  readonly message: string
  readonly stack?: string
  readonly requestedKernelId?: KernelId
  readonly availableKernelIds?: ReadonlyArray<KernelId>
  readonly effectiveKernelId?: KernelId
  readonly fallbackReason?: string
}
