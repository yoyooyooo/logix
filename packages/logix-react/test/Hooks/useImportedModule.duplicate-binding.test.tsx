import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const Child = Logix.Module.make('DuplicateBindingChild', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {},
})

const ChildA = Logix.Program.make(Child, {
  initial: { value: 1 },
})

const ChildB = Logix.Program.make(Child, {
  initial: { value: 2 },
})

const Host = Logix.Module.make('DuplicateBindingHost', {
  state: Schema.Struct({ ok: Schema.Boolean }),
  actions: {},
})

describe('duplicate imported module bindings', () => {
  it('reports when one parent scope imports two child programs from the same module', async () => {
    const program = Logix.Program.make(Host, {
      initial: { ok: true },
      capabilities: {
        imports: [ChildA, ChildB],
      },
    })

    const report = await Effect.runPromise(
      Logix.Runtime.check(program, {
        runId: 'run:test:react-duplicate-imported-module-binding',
      }),
    )

    expect(report.verdict).toBe('FAIL')
    expect(report.errorCode).toBe('PROGRAM_IMPORT_DUPLICATE')
    expect(report.findings?.[0]).toMatchObject({
      kind: 'import',
      code: 'PROGRAM_IMPORT_DUPLICATE',
      ownerCoordinate: 'Program.capabilities.imports:DuplicateBindingChild',
    })
  })
})
