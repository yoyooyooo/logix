/**
 * @scenario Process · 实例级安装点隔离（AC-2）
 * @description
 *   演示“模块实例级（moduleInstance-scope）Process”的隔离语义：
 *   - 同一个 Source ModuleImpl 被构造两次（Scope A / Scope B）
 *   - 每个实例都安装同一份 InstanceProcess（在 SourceImpl.processes）
 *   - A 的动作只影响 A 的 Target，不会串到 B（反之亦然）
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/process-instance-scope.ts
 */

import { Context, Effect, Exit, Layer, Scope, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'

const Source = Logix.Module.make('ProcessInstanceScopeSource', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
})

const Target = Logix.Module.make('ProcessInstanceScopeTarget', {
  state: Schema.Struct({ logs: Schema.Array(Schema.String) }),
  actions: { log: Schema.String },
})

const SourceLogic = Source.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

const TargetLogic = Target.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('log').run((action) => $.state.update((s) => ({ ...s, logs: [...s.logs, action.payload] })))
  }),
)

type SourceAction = Logix.ActionOf<typeof Source.shape>

const InstanceProcess = Logix.Process.link({ modules: [Source, Target] as const }, ($) =>
  Effect.gen(function* () {
    const source = $[Source.id]
    const target = $[Target.id]

    yield* source.actions$.pipe(
      Stream.runForEach((action: SourceAction) => {
        if (action._tag === 'increment') {
          return target.actions.log('Source incremented')
        }
        return Effect.void
      }),
    )
  }),
)

const TargetImpl = Target.implement<never>({
  initial: { logs: [] },
  logics: [TargetLogic],
})

const SourceImpl = Source.implement<never>({
  initial: { count: 0 },
  logics: [SourceLogic],
  imports: [TargetImpl.impl],
  processes: [InstanceProcess],
})

const layer = SourceImpl.impl.layer

const main = Effect.gen(function* () {
  const scopeA = yield* Scope.make()
  const scopeB = yield* Scope.make()

  try {
    const envA = yield* Layer.buildWithScope(layer, scopeA)
    const envB = yield* Layer.buildWithScope(layer, scopeB)

    const sourceA: any = Context.get(envA, Source.tag)
    const targetA: any = Context.get(envA, Target.tag)
    const sourceB: any = Context.get(envB, Source.tag)
    const targetB: any = Context.get(envB, Target.tag)

    yield* Effect.yieldNow()
    yield* Effect.sleep('30 millis')
    yield* Effect.yieldNow()

    yield* sourceA.dispatch({ _tag: 'increment', payload: undefined } as any)
    yield* Effect.yieldNow()
    yield* Effect.sleep('80 millis')
    yield* Effect.yieldNow()

    // eslint-disable-next-line no-console
    console.log('[A] source.count =', (yield* sourceA.getState).count)
    // eslint-disable-next-line no-console
    console.log('[A] target.logs =', (yield* targetA.getState).logs)
    // eslint-disable-next-line no-console
    console.log('[B] source.count =', (yield* sourceB.getState).count)
    // eslint-disable-next-line no-console
    console.log('[B] target.logs =', (yield* targetB.getState).logs)

    yield* sourceB.dispatch({ _tag: 'increment', payload: undefined } as any)
    yield* Effect.yieldNow()
    yield* Effect.sleep('80 millis')
    yield* Effect.yieldNow()

    // eslint-disable-next-line no-console
    console.log('[A] source.count =', (yield* sourceA.getState).count)
    // eslint-disable-next-line no-console
    console.log('[A] target.logs =', (yield* targetA.getState).logs)
    // eslint-disable-next-line no-console
    console.log('[B] source.count =', (yield* sourceB.getState).count)
    // eslint-disable-next-line no-console
    console.log('[B] target.logs =', (yield* targetB.getState).logs)
  } finally {
    yield* Scope.close(scopeA, Exit.succeed(undefined))
    yield* Scope.close(scopeB, Exit.succeed(undefined))
  }
})

Effect.runPromise(main as any).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
