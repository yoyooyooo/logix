import { Layer } from 'effect'
import type { AnyModuleShape, ProgramRuntimeBlueprint } from '../module.js'
import { getProgramRuntimeBlueprint, isProgram, type AnyProgram, type ProgramAssemblyIssue } from '../program.js'

export type NormalizedProgramImport = Layer.Layer<any, any, any> | ProgramRuntimeBlueprint<any, AnyModuleShape, any>

export interface ProgramImportsNormalizationResult {
  readonly imports: ReadonlyArray<NormalizedProgramImport> | undefined
  readonly issues: ReadonlyArray<ProgramAssemblyIssue>
}

const isProgramRuntimeBlueprint = (value: unknown): value is ProgramRuntimeBlueprint<any, AnyModuleShape, any> =>
  Boolean(value && typeof value === 'object' && (value as any)._tag === 'ProgramRuntimeBlueprint')

export const normalizeProgramImports = (
  imports: ReadonlyArray<Layer.Layer<any, any, any> | AnyProgram> | undefined,
): ProgramImportsNormalizationResult => {
  if (!imports || imports.length === 0) return { imports: undefined, issues: [] }

  const issues: ProgramAssemblyIssue[] = []
  const normalized: NormalizedProgramImport[] = []

  for (let index = 0; index < imports.length; index++) {
    const entry = imports[index]
    if (isProgram(entry)) {
      normalized.push(getProgramRuntimeBlueprint(entry))
      continue
    }

    issues.push({
      code: 'PROGRAM_IMPORT_INVALID',
      entrypoint: 'Program.capabilities.imports',
      ownerCoordinate: `Program.capabilities.imports[${index}]`,
      index,
      message: 'Program.capabilities.imports only accepts Program entries.',
    })
  }

  const seenModuleIds = new Map<string, number>()
  for (const entry of normalized) {
    if (!isProgramRuntimeBlueprint(entry)) continue
    const moduleId =
      entry.module && (typeof entry.module === 'object' || typeof entry.module === 'function') && typeof entry.module.id === 'string'
        ? entry.module.id
        : undefined
    if (!moduleId) continue

    const nextCount = (seenModuleIds.get(moduleId) ?? 0) + 1
    seenModuleIds.set(moduleId, nextCount)

    if (nextCount > 1) {
      issues.push({
        code: 'PROGRAM_IMPORT_DUPLICATE',
        entrypoint: 'Program.capabilities.imports',
        ownerCoordinate: `Program.capabilities.imports:${moduleId}`,
        tokenId: moduleId,
        message: 'One parent scope cannot bind the same ModuleTag twice.',
      })
    }
  }

  return {
    imports: normalized.length > 0 ? normalized : undefined,
    issues,
  }
}
