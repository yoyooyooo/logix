export type LogicUnitIdKind = 'explicit' | 'derived'

export type LogicUnitSource = {
  readonly file: string
  readonly line: number
  readonly column: number
}

export type LogicUnitMeta = {
  /**
   * Default id (from module.logic(build, { id })):
   * - Used for id resolution during the mount phase (priority: mount explicit > default id > derived id).
   */
  readonly id?: string
  readonly kind?: string
  readonly name?: string
  readonly source?: LogicUnitSource
  readonly moduleId?: string
  /**
   * Named logic slot (083):
   * - Best-effort semantic role anchor for platform-grade tooling.
   * - Authority: LogicUnitOptions.slotName (written into meta by Module.logic/withLogic).
   */
  readonly slotName?: string

  /**
   * Resolved id (the final logicUnitId after mounting):
   * - Computed during the mount phase by Module.withLogic/withLogics.
   * - Serves as a stable provenance anchor (aligned with specs/022-module).
   */
  readonly resolvedId?: string
  readonly resolvedIdKind?: LogicUnitIdKind
  readonly resolvedKind?: string
  readonly resolvedName?: string
  readonly resolvedSource?: LogicUnitSource
  readonly resolvedSlotName?: string
}

export const LOGIC_UNIT_META = Symbol.for('logix.module.logic.meta')

export const getLogicUnitMeta = (logic: unknown): LogicUnitMeta | undefined => {
  if (!logic || (typeof logic !== 'object' && typeof logic !== 'function')) {
    return undefined
  }
  return (logic as any)[LOGIC_UNIT_META] as LogicUnitMeta | undefined
}

export const attachLogicUnitMeta = <L extends object>(logic: L, meta: LogicUnitMeta): L => {
  try {
    Object.defineProperty(logic, LOGIC_UNIT_META, {
      value: meta,
      enumerable: false,
      configurable: true,
    })
  } catch {
    // best-effort: if the underlying object is non-extensible, we still return it.
  }
  return logic
}

export const updateLogicUnitMeta = <L extends object>(logic: L, patch: Partial<LogicUnitMeta>): L => {
  const prev = getLogicUnitMeta(logic)
  return attachLogicUnitMeta(logic, { ...(prev ?? {}), ...patch })
}
