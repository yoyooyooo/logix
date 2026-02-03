import type { CommandResult } from '../result.js'

export const DEVSERVER_PROTOCOL_V1 = 'intent-flow.devserver.v1' as const

export type DevServerAuthV1 = {
  readonly token: string
}

export type DevServerStartedV1 = {
  readonly schemaVersion: 1
  readonly kind: 'DevServerStarted'
  readonly protocol: typeof DEVSERVER_PROTOCOL_V1
  readonly host: string
  readonly port: number
  readonly url: string
  readonly pid: number
  readonly stateFile?: string
}

export type DevServerStartFailedV1 = {
  readonly schemaVersion: 1
  readonly kind: 'DevServerStartFailed'
  readonly protocol: typeof DEVSERVER_PROTOCOL_V1
  readonly error: { readonly code: string; readonly message: string }
}

export type DevServerRequest = {
  readonly protocol: typeof DEVSERVER_PROTOCOL_V1
  readonly type: 'request'
  readonly requestId: string
  readonly method: 'dev.info' | 'dev.workspace.snapshot' | 'dev.run' | 'dev.runChecks' | 'dev.cancel' | 'dev.stop'
  readonly params?: unknown
  readonly auth?: DevServerAuthV1
}

export type DevServerResponse =
  | {
      readonly protocol: typeof DEVSERVER_PROTOCOL_V1
      readonly type: 'response'
      readonly requestId: string
      readonly ok: true
      readonly result: unknown
    }
  | {
      readonly protocol: typeof DEVSERVER_PROTOCOL_V1
      readonly type: 'response'
      readonly requestId: string
      readonly ok: false
      readonly error: { readonly code: string; readonly message: string; readonly data?: unknown }
    }

export type DevServerEvent = {
  readonly protocol: typeof DEVSERVER_PROTOCOL_V1
  readonly type: 'event'
  readonly requestId: string
  readonly event: { readonly kind: string; readonly payload?: unknown }
}

export type DevWorkspaceSnapshotParamsV1 = {
  readonly maxBytes?: number
}

export type DevRunTraceOptionsV1 = {
  readonly enabled: boolean
  readonly maxBytes?: number
  readonly chunkBytes?: number
}

export type DevRunParamsV1 = {
  readonly argv: ReadonlyArray<string>
  readonly injectRunId?: boolean
  readonly trace?: DevRunTraceOptionsV1
}

export type DevRunOutcome =
  | { readonly kind: 'help'; readonly text: string; readonly exitCode: 0 }
  | { readonly kind: 'result'; readonly result: CommandResult; readonly exitCode: 0 | 1 | 2 }

export type DevServerStateV1 = {
  readonly schemaVersion: 1
  readonly kind: 'DevServerState'
  readonly protocol: typeof DEVSERVER_PROTOCOL_V1
  readonly url: string
  readonly pid: number
  readonly cwd: string
  readonly host: string
  readonly port: number
  readonly token?: string
}

export type DevServerStatusV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStatus'
      readonly protocol: typeof DEVSERVER_PROTOCOL_V1
      readonly ok: true
      readonly state: DevServerStateV1
      readonly info: { readonly protocol: typeof DEVSERVER_PROTOCOL_V1; readonly version: string; readonly cwd: string }
    }
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStatus'
      readonly protocol: typeof DEVSERVER_PROTOCOL_V1
      readonly ok: false
      readonly state?: DevServerStateV1
      readonly error: { readonly code: string; readonly message: string }
    }

export type DevServerStopResultV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStopResult'
      readonly protocol: typeof DEVSERVER_PROTOCOL_V1
      readonly ok: true
      readonly stopped: true
    }
  | {
      readonly schemaVersion: 1
      readonly kind: 'DevServerStopResult'
      readonly protocol: typeof DEVSERVER_PROTOCOL_V1
      readonly ok: false
      readonly error: { readonly code: string; readonly message: string }
    }
