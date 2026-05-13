import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ModuleRuntime decomposition guard', () => {
  it('keeps make options, post-commit phases, and field install wiring outside the coordinator', () => {
    const coordinator = readFileSync(
      new URL('../../../../src/internal/runtime/core/ModuleRuntime.impl.ts', import.meta.url),
      'utf8',
    )
    const transaction = readFileSync(
      new URL('../../../../src/internal/runtime/core/ModuleRuntime.transaction.ts', import.meta.url),
      'utf8',
    )
    const makeOptions = readFileSync(
      new URL('../../../../src/internal/runtime/core/ModuleRuntime.makeOptions.ts', import.meta.url),
      'utf8',
    )
    const postCommit = readFileSync(
      new URL('../../../../src/internal/runtime/core/ModuleRuntime.postCommit.ts', import.meta.url),
      'utf8',
    )
    const fieldInstall = readFileSync(
      new URL('../../../../src/internal/runtime/core/ModuleRuntime.fieldKernelInstall.ts', import.meta.url),
      'utf8',
    )

    expect(coordinator).toContain("from './ModuleRuntime.makeOptions.js'")
    expect(coordinator).toContain("from './ModuleRuntime.fieldKernelInstall.js'")
    expect(coordinator).toContain('resolveModuleRuntimeMakeOptions')
    expect(coordinator).toContain('installSchemaBackedFieldProgram')
    expect(transaction).toContain("from './ModuleRuntime.postCommit.js'")
    expect(transaction).toContain('runPostCommitPhases')
    expect(transaction).toContain('readClockMs')

    expect(coordinator).not.toContain('let nextInstanceSeq = 0')
    expect(coordinator).not.toContain('const readClockMs =')
    expect(coordinator).not.toContain('export const runPostCommitPhases')
    expect(coordinator).not.toContain('export const makeFieldRuntimeState')
    expect(coordinator).not.toContain('export const collectExternalOwnedFieldPaths')

    expect(makeOptions).toContain('makeDefaultInstanceId')
    expect(makeOptions).toContain('resolveModuleRuntimeMakeOptions')
    expect(postCommit).toContain('runPostCommitPhases')
    expect(postCommit).toContain('readClockMs')
    expect(fieldInstall).toContain('makeFieldRuntimeState')
    expect(fieldInstall).toContain('installSchemaBackedFieldProgram')
  })
})
