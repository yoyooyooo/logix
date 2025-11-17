export interface ProgramRunnerOptions<Args = unknown> {
  readonly closeScopeTimeout: number
  readonly handleSignals: boolean
  readonly args: Args | undefined
  readonly exitCode: boolean
  readonly reportError: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const resolveProgramRunnerOptions = <Args = unknown>(options: unknown): ProgramRunnerOptions<Args> => {
  const record = isRecord(options) ? options : undefined

  const closeScopeTimeout = typeof record?.closeScopeTimeout === 'number' ? record.closeScopeTimeout : 1000

  const handleSignals = typeof record?.handleSignals === 'boolean' ? record.handleSignals : true

  const exitCode = typeof record?.exitCode === 'boolean' ? record.exitCode : false

  const reportError = typeof record?.reportError === 'boolean' ? record.reportError : true

  const args = (record?.args as Args | undefined) ?? undefined

  return {
    closeScopeTimeout,
    handleSignals,
    args,
    exitCode,
    reportError,
  }
}
