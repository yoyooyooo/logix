/**
 * @scenario Process 协作边界对照（declarative vs blackbox）
 * @description
 *   用最小示例对比两类跨模块协作语义：
 *   - declarative：同 tick 可收敛（确定性优先）
 *   - blackbox：best-effort（常见于 async/external bridge）
 *
 * 运行（任选其一）：
 *   npm exec tsx src/scenarios/process-link-boundary-compare.ts
 *   pnpm exec tsx src/scenarios/process-link-boundary-compare.ts
 *   yarn dlx tsx src/scenarios/process-link-boundary-compare.ts
 *   bun x tsx src/scenarios/process-link-boundary-compare.ts
 */

import { Effect, Layer, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'

const SourceDef = Logix.Module.make('ProcessBoundarySource', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: { set: Schema.Number },
  immerReducers: {
    set: (draft, value) => {
      draft.value = value
    },
  },
})

const TargetDef = Logix.Module.make('ProcessBoundaryTarget', {
  state: Schema.Struct({ mirror: Schema.Number }),
  actions: { syncMirror: Schema.Number },
  immerReducers: {
    syncMirror: (draft, mirror) => {
      draft.mirror = mirror
    },
  },
})

const SourceValueRead = Logix.ReadQuery.make({
  selectorId: 'process-boundary:source-value',
  debugKey: 'ProcessBoundarySource.value',
  reads: ['value'],
  select: (state: { readonly value: number }) => state.value,
  equalsKind: 'objectIs',
})

const DeclarativeProcess = Logix.Process.linkDeclarative(
  {
    id: 'ProcessBoundaryDeclarative',
    modules: [SourceDef, TargetDef] as const,
  },
  ($) => [
    {
      from: $[SourceDef.id].read(SourceValueRead),
      to: $[TargetDef.id].dispatch('syncMirror'),
    },
  ],
)

const BlackboxProcess = Logix.Process.link(
  {
    id: 'ProcessBoundaryBlackbox',
    modules: [SourceDef, TargetDef] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const source = $[SourceDef.id]
      const target = $[TargetDef.id]

      yield* source.actions$.pipe(
        Stream.runForEach((action) =>
          action._tag !== 'set'
            ? Effect.void
            : Effect.gen(function* () {
                // 模拟外部桥接：跨异步边界后再派发到目标模块。
                yield* Effect.sleep('1 millis')
                yield* target.actions.syncMirror(action.payload)
              }),
        ),
      )
    }),
)

const makeRootImpl = (rootId: string, process: Logix.Process.ProcessEffect<any, any>) => {
  const RootDef = Logix.Module.make(rootId, {
    state: Schema.Void,
    actions: {},
  })

  return RootDef.implement({
    initial: undefined,
    imports: [
      SourceDef.implement({ initial: { value: 0 } }).impl,
      TargetDef.implement({ initial: { mirror: 0 } }).impl,
    ],
    processes: [process],
  })
}

const runCase = (
  caseId: string,
  process: Logix.Process.ProcessEffect<any, any>,
  waitAfterDispatch: string,
) =>
  Effect.gen(function* () {
    const runtime = Logix.Runtime.make(makeRootImpl(`ProcessBoundaryRoot/${caseId}`, process).impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    try {
      return yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const source = yield* SourceDef.tag
            const target = yield* TargetDef.tag

            yield* source.dispatch(SourceDef.actions.set(1))
            if (waitAfterDispatch !== '0 millis') {
              yield* Effect.sleep(waitAfterDispatch)
            }

            const sourceState = yield* source.getState
            const targetState = yield* target.getState

            return {
              caseId,
              sourceValue: sourceState.value,
              targetMirror: targetState.mirror,
            }
          }),
        ),
      )
    } finally {
      yield* Effect.promise(() => runtime.dispose())
    }
  })

const main = Effect.gen(function* () {
  const samples = yield* Effect.all([
    runCase('declarative.same_tick', DeclarativeProcess, '0 millis'),
    runCase('blackbox.same_tick', BlackboxProcess, '0 millis'),
    runCase('blackbox.after_bridge', BlackboxProcess, '3 millis'),
  ])

  for (const sample of samples) {
    // eslint-disable-next-line no-console
    console.log(`[${sample.caseId}] source=${sample.sourceValue}, target=${sample.targetMirror}`)
  }
})

Effect.runPromise(main).catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exitCode = 1
})
