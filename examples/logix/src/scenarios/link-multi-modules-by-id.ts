/**
 * @scenario Link 多模块协作（按 Module.id 访问）
 * @description
 *   演示使用 `Link.make` + `$[Module.id]` 在三个模块之间做胶水编排：
 *   - SourceModule：只派发 `ping`；
 *   - TargetModule：统计命中次数；
 *   - AuditModule：记录文本日志。
 *
 *   Link 监听 Source 的 actions$，每次收到 ping：
 *   - 向 Target 派发 hit；
 *   - 向 Audit 派发 log("ping -> hit")。
 */

import { Effect, Schema, Stream, Layer } from 'effect'
import * as Logix from '@logix/core'

// ---------------------------------------------------------------------------
// 1. 定义三个独立模块
// ---------------------------------------------------------------------------

const SourceState = Schema.Void
const SourceActions = {
  ping: Schema.Void,
}

const SourceDef = Logix.Module.make('SourceModule', {
  state: SourceState,
  actions: SourceActions,
})

const TargetState = Schema.Struct({
  count: Schema.Number,
})
const TargetActions = {
  hit: Schema.Void,
}

const TargetDef = Logix.Module.make('TargetModule', {
  state: TargetState,
  actions: TargetActions,
})

const AuditState = Schema.Struct({
  logs: Schema.Array(Schema.String),
})
const AuditActions = {
  log: Schema.String,
}

const AuditDef = Logix.Module.make('AuditModule', {
  state: AuditState,
  actions: AuditActions,
})

// ---------------------------------------------------------------------------
// 2. 各自的 Module 逻辑
// ---------------------------------------------------------------------------

// Target：每次收到 hit，count + 1
const TargetLogic = TargetDef.logic(($) => $.onAction('hit').update((state) => ({ ...state, count: state.count + 1 })))

// Audit：追加日志字符串
const AuditLogic = AuditDef.logic(($) =>
  $.onAction('log').update((state, action) => ({
    ...state,
    logs: [...state.logs, action.payload],
  })),
)

// ---------------------------------------------------------------------------
// 3. Link.make：基于 modules 数组 + Module.id 访问句柄
// ---------------------------------------------------------------------------

export const MultiModuleLink = Logix.Link.make(
  {
    // 不显式提供 id，默认会根据 modules.id 排序后拼接生成一个稳定 id
    modules: [SourceDef, TargetDef, AuditDef] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const source = $[SourceDef.id]
      const target = $[TargetDef.id]
      const audit = $[AuditDef.id]

      // 监听 Source 的所有 Action，这里只有 ping 一种
      yield* source.actions$.pipe(
        Stream.runForEach(() =>
          Effect.all(
            [
              // 命中统计
              target.dispatch({ _tag: 'hit', payload: undefined }),
              // 记录日志
              audit.dispatch({
                _tag: 'log',
                payload: 'ping -> hit',
              }),
            ],
            { concurrency: 'unbounded' },
          ),
        ),
      )
    }),
)

// ---------------------------------------------------------------------------
// 4. 组合 ModuleImpl 与运行 Demo
// ---------------------------------------------------------------------------

export const SourceModule = SourceDef.implement({
  initial: undefined,
})

export const TargetModule = TargetDef.implement({
  initial: { count: 0 },
  logics: [TargetLogic],
})

export const AuditModule = AuditDef.implement({
  initial: { logs: [] },
  logics: [AuditLogic],
})

export const SourceImpl = SourceModule.impl
export const TargetImpl = TargetModule.impl
export const AuditImpl = AuditModule.impl

export const AppLayer = Layer.mergeAll(SourceImpl.layer, TargetImpl.layer, AuditImpl.layer)

// 一个简单的 main：派发一次 ping，观察 Target / Audit 状态变化
export const main = Effect.gen(function* () {
  // 启动 Link（作为长驻 watcher）
  yield* MultiModuleLink.pipe(Effect.fork)

  const source = yield* SourceDef.tag
  const target = yield* TargetDef.tag
  const audit = yield* AuditDef.tag

  // 触发一次 ping
  yield* source.dispatch({ _tag: 'ping', payload: undefined })

  // 等待 watcher 生效
  yield* Effect.sleep(50)

  const targetState = yield* target.getState
  const auditState = yield* audit.getState

  yield* Effect.log(`Target.count=${targetState.count}, Audit.logs=${JSON.stringify(auditState.logs)}`)
}).pipe(Effect.provide(AppLayer))
