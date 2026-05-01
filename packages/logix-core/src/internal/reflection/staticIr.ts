import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../runtime/core/module.js'
import { getModuleFieldsProgram } from '../runtime/core/runtimeInternalsAccessor.js'
import type { StaticIr } from '../field-kernel/ir.js'
import type { FieldProgram } from '../field-kernel/model.js'
import { exportStaticIr as exportFieldStaticIr } from '../field-kernel/ir.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isProgramRuntimeBlueprint = (value: unknown): value is ProgramRuntimeBlueprint<any, AnyModuleShape, any> =>
  isRecord(value) && value._tag === 'ProgramRuntimeBlueprint' && isRecord(value.module)

const resolveModuleId = (input: unknown): string => {
  if (isProgramRuntimeBlueprint(input)) {
    const id = (input.module as any).id
    return typeof id === 'string' && id.length > 0 ? id : 'unknown'
  }

  if (isRecord(input)) {
    const id = input.id
    if (typeof id === 'string' && id.length > 0) return id
    const tag = (input as any).tag
    if (tag && (typeof tag === 'object' || typeof tag === 'function')) {
      const tagId = (tag as any).id
      if (typeof tagId === 'string' && tagId.length > 0) return tagId
    }
  }

  return 'unknown'
}

const resolveModuleTag = (input: unknown): unknown => {
  if (isProgramRuntimeBlueprint(input)) return input.module
  if (isRecord(input) && (input as any).tag) return (input as any).tag
  return undefined
}

export const exportStaticIr = (module: unknown): StaticIr | undefined => {
  const program =
    (getModuleFieldsProgram(module) as FieldProgram<any> | undefined) ??
    ((() => {
      const tag = resolveModuleTag(module)
      return tag ? (getModuleFieldsProgram(tag) as FieldProgram<any> | undefined) : undefined
    })())
  if (!program) return undefined

  return exportFieldStaticIr({
    program,
    moduleId: resolveModuleId(module),
  })
}
