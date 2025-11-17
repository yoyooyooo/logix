export type FormView = {
  readonly canSubmit: boolean
  readonly isSubmitting: boolean
  readonly isValid: boolean
  readonly isDirty: boolean
  readonly isPristine: boolean
  readonly submitCount: number
}

type Snapshot = {
  readonly submitCount: number
  readonly isSubmitting: boolean
  readonly isDirty: boolean
  readonly errorCount: number
}

const readSnapshot = (state: unknown): Snapshot => {
  const meta = state && typeof state === 'object' && !Array.isArray(state) ? (state as any).$form : undefined
  const safe = meta && typeof meta === 'object' && !Array.isArray(meta) ? (meta as any) : undefined

  const submitCount = typeof safe?.submitCount === 'number' && Number.isFinite(safe.submitCount) ? safe.submitCount : 0
  const isSubmitting = safe?.isSubmitting === true
  const isDirty = safe?.isDirty === true
  const errorCount = typeof safe?.errorCount === 'number' && Number.isFinite(safe.errorCount) ? safe.errorCount : 0

  return {
    submitCount,
    isSubmitting,
    isDirty,
    errorCount,
  }
}

export const getFormView = (state: unknown, prev?: FormView): FormView => {
  const snap = readSnapshot(state)
  const isValid = snap.errorCount === 0
  const isPristine = !snap.isDirty
  const canSubmit = !snap.isSubmitting && isValid

  if (
    prev &&
    prev.submitCount === snap.submitCount &&
    prev.isSubmitting === snap.isSubmitting &&
    prev.isDirty === snap.isDirty &&
    prev.isValid === isValid
  ) {
    return prev
  }

  return {
    canSubmit,
    isSubmitting: snap.isSubmitting,
    isValid,
    isDirty: snap.isDirty,
    isPristine,
    submitCount: snap.submitCount,
  }
}
