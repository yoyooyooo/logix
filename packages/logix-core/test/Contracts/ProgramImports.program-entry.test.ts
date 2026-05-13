import { describe, expect, it } from 'vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Program imports contract', () => {
  it('accepts Program entries in capabilities.imports and exposes the imported runtime', async () => {
    const Child = Logix.Module.make('ProgramImports.Child', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })
    const Parent = Logix.Module.make('ProgramImports.Parent', {
      state: Schema.Struct({ seen: Schema.Number }),
      actions: {},
    })

    const ChildProgram = Logix.Program.make(Child, {
      initial: { value: 1 },
      logics: [],
    })
    const ParentProgram = Logix.Program.make(Parent, {
      initial: { seen: 0 },
      capabilities: {
        imports: [ChildProgram],
      },
      logics: [],
    })

    const runtime = Logix.Runtime.make(ParentProgram)
    const importedState = await runtime.runPromise(
      Effect.gen(function* () {
        const child = yield* Effect.service(Child.tag)
        return yield* child.getState
      }) as any,
    )

    expect(importedState).toEqual({ value: 1 })
  })

  it('reports invalid and duplicate imports in runtime.check as static assembly findings', async () => {
    const Child = Logix.Module.make('ProgramImports.Static.Child', {
      state: Schema.Void,
      actions: {},
    })
    const Parent = Logix.Module.make('ProgramImports.Static.Parent', {
      state: Schema.Void,
      actions: {},
    })

    const ChildProgram = Logix.Program.make(Child, {
      initial: undefined,
      logics: [],
    })
    const ParentProgram = Logix.Program.make(Parent, {
      initial: undefined,
      capabilities: {
        imports: [ChildProgram, ChildProgram, Parent as any],
      },
      logics: [],
    })

    const report = await Effect.runPromise(
      Logix.Runtime.check(ParentProgram, {
        runId: 'run:test:program-import-static-findings',
      }),
    )

    expect(report.verdict).toBe('FAIL')
    expect(report.errorCode).toBe('PROGRAM_IMPORT_INVALID')
    expect(report.nextRecommendedStage).toBe('check')
    expect(report.findings?.map((finding) => finding.code).sort()).toEqual([
      'PROGRAM_IMPORT_DUPLICATE',
      'PROGRAM_IMPORT_INVALID',
    ])
    expect(report.repairHints.map((hint) => hint.focusRef)).toEqual([
      { declSliceId: 'Program.capabilities.imports[2]' },
      { declSliceId: 'Program.capabilities.imports:ProgramImports.Static.Child' },
    ])
  })

  it('reports missing child import from startup trial as typed dependency cause', async () => {
    const Child = Logix.Module.make('ProgramImports.Dependency.Child', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: {},
    })
    const Parent = Logix.Module.make('ProgramImports.Dependency.Parent', {
      state: Schema.Void,
      actions: {},
    })

    const ParentProgram = Logix.Program.make(Parent, {
      initial: undefined,
      logics: [
        Parent.logic('read-child', ($) => {
          $.readyAfter(Effect.service(Child.tag).pipe(Effect.orDie) as any, { id: 'read-child' })
          return Effect.void
        }),
      ],
    })

    const report = await Effect.runPromise(
      Logix.Runtime.trial(ParentProgram, {
        runId: 'run:test:program-import-missing-child',
        buildEnv: { hostKind: 'node', config: {} },
        diagnosticsLevel: 'off',
      }),
    )

    expect(report.verdict).toBe('FAIL')
    expect(report.errorCode).toBe('MissingDependency')
    expect(report.dependencyCauses).toContainEqual({
      kind: 'program-import',
      phase: 'startup-boot',
      ownerCoordinate: 'Program.capabilities.imports:ProgramImports.Dependency.Child',
      providerSource: 'program-capabilities',
      childIdentity: 'ProgramImports.Dependency.Child',
      focusRef: {
        declSliceId: 'Program.capabilities.imports:ProgramImports.Dependency.Child',
      },
      errorCode: 'MissingDependency',
    })
  })
})
