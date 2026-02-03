export type ModulePortSpecPayload = {
  readonly protocolVersion: 'v1'
  readonly moduleId: string
  readonly actions: ReadonlyArray<{ readonly key: string }>
  readonly events: ReadonlyArray<{ readonly key: string }>
  readonly outputs: ReadonlyArray<{ readonly key: string }>
  readonly exports: ReadonlyArray<{ readonly path: string }>
}

export type TypeIrNodePayload = {
  readonly id: string
  readonly kind: string
  readonly label?: string
  readonly digest?: string
  readonly notes?: unknown
}

export type TypeIrPayload = {
  readonly protocolVersion: 'v1'
  readonly moduleId: string
  readonly truncated?: boolean
  readonly budget?: {
    readonly maxNodes?: number
    readonly maxDepth?: number
  }
  readonly types: ReadonlyArray<TypeIrNodePayload>
  readonly roots?: unknown
  readonly notes?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const isKeyArray = (value: unknown, key: 'key' | 'path'): boolean => {
  if (!Array.isArray(value)) return false
  for (const item of value) {
    if (!isRecord(item)) return false
    if (!asNonEmptyString((item as any)[key])) return false
  }
  return true
}

export const isModulePortSpecPayload = (value: unknown): value is ModulePortSpecPayload => {
  if (!isRecord(value)) return false
  if ((value as any).protocolVersion !== 'v1') return false
  if (!asNonEmptyString((value as any).moduleId)) return false
  if (!isKeyArray((value as any).actions, 'key')) return false
  if (!isKeyArray((value as any).events, 'key')) return false
  if (!isKeyArray((value as any).outputs, 'key')) return false
  if (!isKeyArray((value as any).exports, 'path')) return false
  return true
}

export const isTypeIrPayload = (value: unknown): value is TypeIrPayload => {
  if (!isRecord(value)) return false
  if ((value as any).protocolVersion !== 'v1') return false
  if (!asNonEmptyString((value as any).moduleId)) return false
  if (!Array.isArray((value as any).types)) return false
  for (const item of (value as any).types as ReadonlyArray<unknown>) {
    if (!isRecord(item)) return false
    if (!asNonEmptyString((item as any).id)) return false
    if (!asNonEmptyString((item as any).kind)) return false
  }
  return true
}

