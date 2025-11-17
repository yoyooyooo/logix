/**
 * @scenario Process · 应用级安装点（AC-1）
 * @description
 *   演示“应用级 Process（app-scope）”的最小闭环：
 *   - 模块 A 触发事件（moduleAction: ping）
 *   - Process 响应触发并驱动模块 B 动作（dispatch: inc）
 *   - 可观察到 B 的状态变化（count + 1）
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/process-app-scope.ts
 */

import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

const Source = Logix.Module.make('ProcessAppScopeSource', {
  state: Schema.Void,
  actions: { ping: Schema.Void },
})

const Target = Logix.Module.make('ProcessAppScopeTarget', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const TargetLogic = Target.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

const base = Logix.Process.link({ modules: [Source, Target] as const }, ($) =>
  Effect.gen(function* () {
    const target = $[Target.id]
    yield* target.actions.inc()
  }),
)

const Proc = Logix.Process.attachMeta(base, {
  kind: 'process',
  definition: {
    processId: 'ProcessAppScope',
    requires: [Source.id, Target.id],
    triggers: [{ kind: 'moduleAction', moduleId: Source.id, actionId: 'ping' }],
    concurrency: { mode: 'serial', maxQueue: 16 },
    errorPolicy: { mode: 'failStop' },
    diagnosticsLevel: 'light',
  },
})

const Root = Logix.Module.make('ProcessAppScopeRoot', {
  state: Schema.Void,
  actions: {},
})

const RootImpl = Root.implement({
  initial: undefined,
  imports: [
    Source.implement({ initial: undefined }).impl,
    Target.implement({ initial: { count: 0 }, logics: [TargetLogic] }).impl,
  ],
  processes: [Proc],
})

const runtime = Logix.Runtime.make(RootImpl)

const main = Effect.gen(function* () {
  try {
    const result = yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const source: any = yield* Source.tag
          const target: any = yield* Target.tag

          yield* source.dispatch({ _tag: 'ping', payload: undefined } as any)
          yield* Effect.sleep('20 millis')
          return yield* target.getState
        }) as any,
      ),
    )

    // eslint-disable-next-line no-console
    console.log('[ProcessAppScope] target.count =', (result as any).count)
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
