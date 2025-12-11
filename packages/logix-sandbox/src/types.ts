/**
 * Sandbox 公共类型定义
 */

// Trace Span
export interface TraceSpan {
  readonly spanId: string
  readonly parentSpanId?: string
  readonly name: string
  readonly startTime: number
  readonly endTime?: number
  readonly status: "running" | "success" | "error" | "cancelled"
  readonly attributes?: Record<string, unknown>
  readonly intentId?: string
  readonly stepId?: string
}

// Log Entry
export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  readonly level: LogLevel
  readonly args: ReadonlyArray<unknown>
  readonly timestamp: number
  readonly source?: "console" | "effect" | "logix"
}

// Sandbox Status
export type SandboxStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "running"
  | "completed"
  | "error"

// HTTP Mock Manifest（PoC 版）

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

// UI Intent（语义 UI Mock · PoC 版）

export interface UiIntentPacket {
  readonly id: string
  readonly component: string
  readonly intent: "mount" | "update" | "unmount" | "action"
  readonly props: Record<string, unknown>
  readonly callbacks: ReadonlyArray<string>
  readonly children?: ReadonlyArray<UiIntentPacket>
  readonly meta?: {
    readonly storyId?: string
    readonly stepId?: string
    readonly label?: string
    readonly severity?: "info" | "warn" | "error"
    readonly tags?: ReadonlyArray<string>
  }
}

// UI Callback（Host → Worker）：用于 Mock UI/Studio 将交互回传给沙箱中的代码
export interface UiCallbackPayload {
  readonly intentId: string
  readonly callback: string
  readonly data?: unknown
}

// Run Result
export interface RunResult {
  readonly runId: string
  readonly duration: number
  readonly stateSnapshot?: unknown
  readonly traces: ReadonlyArray<TraceSpan>
  readonly logs: ReadonlyArray<LogEntry>
  readonly uiIntents?: ReadonlyArray<UiIntentPacket>
}

// Error
export type SandboxErrorCode = "INIT_FAILED" | "RUNTIME_ERROR" | "TIMEOUT" | "WORKER_TERMINATED"

export interface SandboxErrorInfo {
  readonly code: SandboxErrorCode
  readonly message: string
  readonly stack?: string
}
