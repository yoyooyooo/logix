import { describe, it, expect } from 'vitest'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import {Effect, Exit, Layer, Scope, Schema, ServiceMap } from 'effect'
import * as Logix from '../../../src/index.js'

describe('HierarchicalInjector ImportsScope lifecycle', () => {
  it('attaches a minimal imports-scope injector and clears it on Scope.close', async () => {
    const Child = Logix.Module.make('HierImportsScopeChild', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const Parent = Logix.Module.make('HierImportsScopeParent', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: { noop: Schema.Void },
    })

    const ChildProgram = Logix.Program.make(Child, {
      initial: { count: 0 },
    })

    const ParentProgram = Logix.Program.make(Parent, {
      initial: { ok: true },
      capabilities: {
        imports: [ChildProgram],
      },
    })

    await Effect.runPromise(
      Effect.gen(function* () {
        const scope = yield* Scope.make()
        let parentRuntime: any
        let importsScope: any
        try {
          const context = yield* Layer.buildWithScope(RuntimeContracts.getProgramRuntimeBlueprint(ParentProgram).layer, scope)

          parentRuntime = ServiceMap.get(context as ServiceMap.ServiceMap<any>, Parent.tag) as any
          const childRuntime = ServiceMap.get(context as ServiceMap.ServiceMap<any>, Child.tag) as any

          importsScope = RuntimeContracts.getImportsScope(parentRuntime)
          expect(importsScope).toBeTruthy()
          expect(typeof importsScope?.get).toBe('function')
          expect(importsScope.get(Child.tag)).toBe(childRuntime)
        } finally {
          yield* Scope.close(scope, Exit.succeed(undefined))
        }

        // After Scope.close, references must be released to allow React unmount / HMR scenarios to reclaim memory.
        expect(importsScope?.get(Child.tag)).toBeUndefined()
      }),
    )
  })
})
