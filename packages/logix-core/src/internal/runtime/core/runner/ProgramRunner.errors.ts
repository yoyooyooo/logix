export type ProgramRunnerErrorTag = 'BootError' | 'MainError' | 'DisposeError' | 'DisposeTimeout'

export interface ProgramIdentity {
  moduleId: string
  instanceId: string
}

const summarizeCause = (cause: unknown): { name?: string; message?: string } => {
  if (cause instanceof Error) {
    return { name: cause.name, message: cause.message }
  }
  return { message: typeof cause === 'string' ? cause : undefined }
}

abstract class ProgramRunnerErrorBase extends Error {
  abstract readonly _tag: ProgramRunnerErrorTag
  readonly moduleId: string
  readonly instanceId: string
  readonly entrypoint: 'boot' | 'main' | 'dispose'
  readonly hint?: string

  protected constructor(params: {
    readonly message: string
    readonly identity: ProgramIdentity
    readonly entrypoint: 'boot' | 'main' | 'dispose'
    readonly hint?: string
  }) {
    super(params.message)
    this.moduleId = params.identity.moduleId
    this.instanceId = params.identity.instanceId
    this.entrypoint = params.entrypoint
    this.hint = params.hint
  }

  toJSON(): Record<string, unknown> {
    return {
      _tag: this._tag,
      name: this.name,
      message: this.message,
      moduleId: this.moduleId,
      instanceId: this.instanceId,
      entrypoint: this.entrypoint,
      hint: this.hint,
    }
  }
}

export class BootError extends ProgramRunnerErrorBase {
  readonly _tag = 'BootError' as const
  readonly cause?: { name?: string; message?: string }

  constructor(identity: ProgramIdentity, cause: unknown) {
    super({
      message: '[Logix] Program boot failed',
      identity,
      entrypoint: 'boot',
      hint: 'Check that options.layer / imports / providers are complete, and that no dependencies are missing during assembly.',
    })
    this.name = 'BootError'
    this.cause = summarizeCause(cause)
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), cause: this.cause }
  }
}

export class MainError extends ProgramRunnerErrorBase {
  readonly _tag = 'MainError' as const
  readonly cause?: { name?: string; message?: string }

  constructor(identity: ProgramIdentity, cause: unknown) {
    super({
      message: '[Logix] Program main failed',
      identity,
      entrypoint: 'main',
      hint: 'Main failed: ensure main handles domain errors explicitly, and check for interruption or missing dependencies.',
    })
    this.name = 'MainError'
    this.cause = summarizeCause(cause)
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), cause: this.cause }
  }
}

export class DisposeError extends ProgramRunnerErrorBase {
  readonly _tag = 'DisposeError' as const
  readonly cause?: { name?: string; message?: string }

  constructor(identity: ProgramIdentity, cause: unknown) {
    super({
      message: '[Logix] Program dispose failed',
      identity,
      entrypoint: 'dispose',
      hint: 'Dispose failed: a finalizer may have thrown, or scope/resource handles may be invalid; check onError/logs.',
    })
    this.name = 'DisposeError'
    this.cause = summarizeCause(cause)
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), cause: this.cause }
  }
}

export class DisposeTimeoutError extends ProgramRunnerErrorBase {
  readonly _tag = 'DisposeTimeout' as const
  readonly timeoutMs: number
  readonly elapsedMs: number
  readonly suggestions: ReadonlyArray<string>

  constructor(identity: ProgramIdentity, params: { readonly timeoutMs: number; readonly elapsedMs: number }) {
    super({
      message: '[Logix] Program dispose timed out',
      identity,
      entrypoint: 'dispose',
      hint: 'Dispose timed out: if the program cannot exit naturally, resources may not be released or background fibers are still running.',
    })
    this.name = 'DisposeTimeoutError'
    this.timeoutMs = params.timeoutMs
    this.elapsedMs = params.elapsedMs
    this.suggestions = [
      'Check for event listeners that were not unregistered (e.g. process.on / emitter.on).',
      'Check for fibers that were not joined/interrupt (long-lived watchers / Stream.run*).',
      'Check for resource handles that were not closed (timer / socket / file handle).',
    ]
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
      elapsedMs: this.elapsedMs,
      suggestions: this.suggestions,
    }
  }
}
