import type { AnyModuleShape, ModuleImpl } from '../runtime/core/module.js'
import { getModuleTraitsProgram } from '../runtime/core/runtimeInternalsAccessor.js'
import type { StaticIr } from '../state-trait/ir.js'
import type { StateTraitProgram } from '../state-trait/model.js'
import { exportStaticIr as exportStateTraitStaticIr } from '../state-trait/ir.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isModuleImpl = (value: unknown): value is ModuleImpl<any, AnyModuleShape, any> =>
  isRecord(value) && value._tag === 'ModuleImpl' && isRecord(value.module)

const resolveModuleId = (input: unknown): string => {
  if (isModuleImpl(input)) {
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
  if (isModuleImpl(input)) return input.module
  if (isRecord(input) && (input as any).tag) return (input as any).tag
  return undefined
}

export const exportStaticIr = (module: unknown): StaticIr | undefined => {
  const tag = resolveModuleTag(module)
  if (!tag) return undefined

  const program = getModuleTraitsProgram(tag) as StateTraitProgram<any> | undefined
  if (!program) return undefined

  return exportStateTraitStaticIr({
    program,
    moduleId: resolveModuleId(module),
  })
}
