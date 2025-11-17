import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as BoundApiRuntime from '../../../src/internal/runtime/BoundApiRuntime.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'

describe('StateTrait.install + EffectOp middleware', () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    source: Schema.Struct({
      name: Schema.String,
    }),
    target: Schema.String,
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  it('should emit EffectOp events for computed and link steps via middleware', async () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      sum: Logix.StateTrait.computed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
      // target 跟随 source.name
      target: Logix.StateTrait.link({
        from: 'source.name',
      }),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)

    const events: Array<EffectOp.EffectOp<any, any, any>> = []

    const middleware: EffectOp.Middleware = (op) =>
      Effect.gen(function* () {
        events.push(op)
        return yield* op.effect
      })

    const stack: EffectOp.MiddlewareStack = [middleware]

    const testEffect = Effect.gen(function* () {
      // 构造最小 ModuleRuntime（仅内存状态），不通过 Module 实现 Trait 自动接线。
      type Shape = Logix.Module.Shape<typeof StateSchema, { noop: typeof Schema.Void }>
      type Action = Logix.Module.ActionOf<Shape>

      const initial: State = {
        a: 1,
        b: 2,
        sum: 0,
        source: { name: 'Alice' },
        target: '',
      }

      const runtime = yield* ModuleRuntimeImpl.make<State, Action>(initial, {
        moduleId: 'StateTraitEffectOpIntegrationTest',
      })

      const bound = BoundApiRuntime.make<Shape, never>(
        {
          stateSchema: StateSchema,
          // ActionSchema 在本测试中不会被使用，这里用占位 Schema 以满足类型要求。
          actionSchema: Schema.Never as any,
          actionMap: { noop: Schema.Void } as any,
        } as any,
        runtime as any,
        {
          // 确保 onState 可在当前 Phase 内使用。
          getPhase: () => 'run',
          moduleId: 'StateTraitEffectOpIntegrationTest',
        },
      )

      // 安装 StateTrait Program 行为（会在当前 Scope 内 fork watcher）
      yield* Logix.StateTrait.install(bound as any, program)

      // 更新基础字段 a/b，应触发 sum 的重算（computed:update）
      let state = (yield* runtime.getState) as State
      state = {
        ...state,
        a: 10,
        b: 5,
      }
      yield* runtime.setState(state)

      // 修改 source.name，应触发 target 的联动（link:propagate）
      let after = (yield* runtime.getState) as State
      after = {
        ...after,
        source: { name: 'Bob' },
        target: '',
      }
      yield* runtime.setState(after)

      // 等待 watcher 消化这两次状态变更
      yield* Effect.sleep('10 millis')

      const finalState = (yield* runtime.getState) as State
      expect(finalState.sum).toBe(15)
      expect(finalState.target).toBe('Bob')
    })

    const programEffect = Effect.scoped(
      Effect.provideService(testEffect, EffectOpCore.EffectOpMiddlewareTag, { stack }),
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(programEffect)

    const computedOps = events.filter((e) => e.name === 'computed:update')
    const linkOps = events.filter((e) => e.name === 'link:propagate')

    expect(computedOps.length).toBeGreaterThanOrEqual(1)
    expect(linkOps.length).toBeGreaterThanOrEqual(1)

    const computedOp = computedOps[computedOps.length - 1]
    const linkOp = linkOps[linkOps.length - 1]

    expect(computedOp.kind).toBe('trait-computed')
    expect(computedOp.meta?.fieldPath).toBe('sum')
    expect(computedOp.meta?.moduleId).toBe('StateTraitEffectOpIntegrationTest')

    expect(linkOp.kind).toBe('trait-link')
    expect(linkOp.meta?.from).toBe('source.name')
    expect(linkOp.meta?.to).toBe('target')
    expect(linkOp.meta?.moduleId).toBe('StateTraitEffectOpIntegrationTest')
  })
})
