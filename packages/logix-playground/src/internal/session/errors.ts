export type PlaygroundFailureKind =
  | 'preview'
  | 'compile'
  | 'run'
  | 'trialStartup'
  | 'timeout'
  | 'serialization'
  | 'worker'
  | 'service-source'
  | 'unavailable'

export interface ClassifiedPlaygroundFailure {
  readonly kind: PlaygroundFailureKind
  readonly message: string
  readonly stack?: string
}

export const classifyError = (
  kind: PlaygroundFailureKind,
  error: unknown,
): ClassifiedPlaygroundFailure => ({
  kind,
  message: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
})
