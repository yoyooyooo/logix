const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const getProcess = (): any => (globalThis as any).process

export const setExitCodeIfEnabled = (enabled: boolean, value: unknown): void => {
  if (!enabled) return

  const proc = getProcess()
  if (!isRecord(proc)) return

  const next = typeof value === 'number' && Number.isInteger(value) ? value : 0

  proc.exitCode = next
}

export const setFailureExitCodeIfEnabled = (enabled: boolean): void => {
  if (!enabled) return

  const proc = getProcess()
  if (!isRecord(proc)) return

  proc.exitCode = 1
}

export const reportErrorIfEnabled = (enabled: boolean, error: unknown): void => {
  if (!enabled) return

  // eslint-disable-next-line no-console
  console.error(error)
}
