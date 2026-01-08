import { Effect, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'

// Source：只派发 ping，不持有复杂状态
const SourceState = Schema.Void
const SourceActions = {
  ping: Schema.Void,
}

export const SourceDef = Logix.Module.make('ReactLinkSource', {
  state: SourceState,
  actions: SourceActions,
})

// Target：统计命中次数
const TargetState = Schema.Struct({
  count: Schema.Number,
})
const TargetActions = {
  hit: Schema.Void,
}

export const TargetDef = Logix.Module.make('ReactLinkTarget', {
  state: TargetState,
  actions: TargetActions,
})

// Audit：记录日志字符串
const AuditState = Schema.Struct({
  logs: Schema.Array(Schema.String),
})
const AuditActions = {
  log: Schema.String,
}

export const AuditDef = Logix.Module.make('ReactLinkAudit', {
  state: AuditState,
  actions: AuditActions,
})

// Target 逻辑：每次 hit，count + 1
export const TargetLogic = TargetDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('hit').update((state) => ({ ...state, count: state.count + 1 }))
  }),
)

// Audit 逻辑：追加日志
export const AuditLogic = AuditDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('log').update((state, action) => ({
      ...state,
      logs: [...state.logs, action.payload],
    }))
  }),
)

// Link.make：监听 Source.actions$，驱动 Target 和 Audit
export const ReactMultiModuleLink = Logix.Link.make(
  {
    modules: [SourceDef, TargetDef, AuditDef] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const source = $[SourceDef.id]
      const target = $[TargetDef.id]
      const audit = $[AuditDef.id]

      // 每次收到 ping，都向 Target 派发 hit，并在 Audit 中记录一条日志
      yield* source.actions$.pipe(
        Stream.runForEach(() =>
          Effect.all(
            [
              target.dispatch({ _tag: 'hit', payload: undefined }),
              audit.dispatch({
                _tag: 'log',
                payload: 'ReactLinkSource.ping -> ReactLinkTarget.hit',
              }),
            ],
            { concurrency: 'unbounded' },
          ),
        ),
      )
    }),
)

// program module：供 React Runtime 组合使用（其 `.impl` 才是 ModuleImpl 蓝图）
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
