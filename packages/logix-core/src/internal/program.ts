import type { ServiceMap } from 'effect'
import type { AnyModuleShape, AnySchema, ProgramRuntimeBlueprint, ModuleTag } from './module.js'
import type { JsonValue } from './protocol/jsonValue.js'

export const PROGRAM_RUNTIME_BLUEPRINT = Symbol.for('@logixjs/core/programRuntimeBlueprint')
export const PROGRAM_BLUEPRINT_ID = Symbol.for('@logixjs/core/programBlueprintId')
export const PROGRAM_ASSEMBLY_ISSUES = Symbol.for('@logixjs/core/programAssemblyIssues')

export interface ProgramDevSource {
  readonly file: string
  readonly line: number
  readonly column: number
}

export interface ProgramDev {
  readonly source?: ProgramDevSource
}

export interface ProgramAssemblyIssue {
  readonly code: 'PROGRAM_IMPORT_INVALID' | 'PROGRAM_IMPORT_DUPLICATE'
  readonly entrypoint: 'Program.capabilities.imports'
  readonly ownerCoordinate: string
  readonly message: string
  readonly index?: number
  readonly tokenId?: string
}

export type AnyProgram = {
  readonly _kind: 'Program'
  readonly id: string
  readonly tag: ModuleTag<string, AnyModuleShape>
  readonly actions: Record<string, AnySchema>
  readonly reducers?: Record<string, unknown>
  readonly schemas?: Record<string, unknown>
  readonly meta?: Record<string, JsonValue>
  readonly services?: Record<string, ServiceMap.Key<any, any>>
  readonly dev?: ProgramDev
}

export const isProgram = (value: unknown): value is AnyProgram =>
  Boolean(value && typeof value === 'object' && (value as any)._kind === 'Program')

export const attachProgramRuntimeBlueprint = <P extends AnyProgram>(
  program: P,
  blueprint: ProgramRuntimeBlueprint<any, AnyModuleShape, any>,
): P => {
  Object.defineProperty(program, PROGRAM_RUNTIME_BLUEPRINT, {
    value: blueprint,
    enumerable: false,
    configurable: true,
  })
  return program
}

export const hasProgramRuntimeBlueprint = (value: unknown): value is AnyProgram =>
  isProgram(value) &&
  (value as Record<PropertyKey, unknown>)[PROGRAM_RUNTIME_BLUEPRINT] !== undefined &&
  ((value as Record<PropertyKey, unknown>)[PROGRAM_RUNTIME_BLUEPRINT] as { readonly _tag?: unknown })._tag ===
    'ProgramRuntimeBlueprint'

export const getProgramRuntimeBlueprint = <Sh extends AnyModuleShape>(
  program: AnyProgram,
): ProgramRuntimeBlueprint<any, Sh, any> => {
  const blueprint = (program as Record<PropertyKey, unknown>)[PROGRAM_RUNTIME_BLUEPRINT]
  if (
    blueprint &&
    typeof blueprint === 'object' &&
    (blueprint as { readonly _tag?: unknown })._tag === 'ProgramRuntimeBlueprint'
  ) {
    return blueprint as ProgramRuntimeBlueprint<any, Sh, any>
  }

  throw new Error('[Logix] Program is missing its internal runtime blueprint.')
}

export const getProgramBlueprintId = (programOrBlueprint: unknown): string | undefined => {
  if (!programOrBlueprint || typeof programOrBlueprint !== 'object') return undefined
  const value = (programOrBlueprint as Record<PropertyKey, unknown>)[PROGRAM_BLUEPRINT_ID]
  return typeof value === 'string' ? value : undefined
}

export const attachProgramAssemblyIssues = <P extends AnyProgram>(
  program: P,
  issues: ReadonlyArray<ProgramAssemblyIssue>,
): P => {
  Object.defineProperty(program, PROGRAM_ASSEMBLY_ISSUES, {
    value: issues,
    enumerable: false,
    configurable: true,
  })
  return program
}

export const getProgramAssemblyIssues = (programOrBlueprint: unknown): ReadonlyArray<ProgramAssemblyIssue> => {
  if (!programOrBlueprint || typeof programOrBlueprint !== 'object') return []
  const value = (programOrBlueprint as Record<PropertyKey, unknown>)[PROGRAM_ASSEMBLY_ISSUES]
  if (!Array.isArray(value)) return []
  return value.filter((issue): issue is ProgramAssemblyIssue => {
    if (!issue || typeof issue !== 'object') return false
    const candidate = issue as ProgramAssemblyIssue
    return (
      (candidate.code === 'PROGRAM_IMPORT_INVALID' || candidate.code === 'PROGRAM_IMPORT_DUPLICATE') &&
      candidate.entrypoint === 'Program.capabilities.imports' &&
      typeof candidate.ownerCoordinate === 'string' &&
      typeof candidate.message === 'string'
    )
  })
}
