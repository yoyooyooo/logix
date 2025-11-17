/**
 * @pattern 乐观开关通用模式 (Optimistic Toggle Pattern)
 * @description
 *   基于 optimistic-toggle.ts 场景，抽离出一个尽可能包含 state / action 的可复用 Logic Pattern。
 *
 * 设计要点：
 *   - Pattern 直接使用 Logix 的 state / flow / control 能力，内部包含完整的点击→乐观更新→远端调用→回滚/提交链路；
 *   - 调用方只需将其作为 Logic 层的一部分挂到对应的 Store 上即可复用；
 *   - 这是“状态感知型 Pattern”的示例，相比场景版更加抽象，便于在多处开关/点赞/收藏场景下复用。
 */

import { Data, Effect, Schema } from 'effect'
import * as Logix from '@logix/core'

// ---------------------------------------------------------------------------
// Schema → Shape：与 optimistic-toggle.ts 场景保持一致的 State / Action 形状
// ---------------------------------------------------------------------------

export const ToggleStateSchema = Schema.Struct({
  id: Schema.String,
  enabled: Schema.Boolean,
  lastSynced: Schema.Boolean,
  isSaving: Schema.Boolean,
  errorMessage: Schema.optional(Schema.String),
})

export const ToggleActionMap = {
  'toggle/click': Schema.Void,
  'toggle/resetError': Schema.Void,
}

export type ToggleShape = Logix.Shape<typeof ToggleStateSchema, typeof ToggleActionMap>
export type ToggleState = Logix.StateOf<ToggleShape>
export type ToggleAction = Logix.ActionOf<ToggleShape>

// ---------------------------------------------------------------------------
// 错误与 Service：作为 Pattern 的领域依赖，对外导出供场景复用
// ---------------------------------------------------------------------------

export class ToggleServiceError extends Data.TaggedError('ToggleServiceError')<{
  readonly id: string
  readonly nextValue: boolean
  readonly reason: string
}> {}

export class ToggleService extends Effect.Service<ToggleService>()('ToggleService', {
  effect: Effect.gen(function* () {
    const toggle = (input: { id: string; nextValue: boolean }) =>
      Effect.gen(function* () {
        console.log('[ToggleService] toggle', input.id, '=>', input.nextValue)

        // PoC：当 id 为 "fail" 时模拟后端失败，触发 ToggleServiceError。
        if (input.id === 'fail') {
          return yield* Effect.fail(
            new ToggleServiceError({
              id: input.id,
              nextValue: input.nextValue,
              reason: 'Simulated failure for demo',
            }),
          )
        }
      })

    return {
      toggle,
    }
  }),
}) {}

/**
 * Pattern 配置：预留给未来扩展（例如自定义错误文案、统计埋点等）。
 * 当前示例不需要额外配置，因此保持为空对象结构。
 */
export interface OptimisticToggleLogicPatternConfig {}

/**
 * Pattern 运行时：在 ToggleShape 对应的 Store 上运行完整的“乐观切换”逻辑。
 *
 * 注意：
 * - 与 optimistic-toggle.ts 中的 ToggleLogic 行为等价，但被包装为一个可复用的 Logic 模板；
 * - 依赖环境为 ToggleService，错误类型为 ToggleServiceError；
 * - 调用方可以在不同 Store 实例上复用本 Logic（前提是 State / Action 形状兼容 ToggleShape）。
 */
export const makeOptimisticToggleLogicPattern =
  (_config: OptimisticToggleLogicPatternConfig = {}) =>
  ($Toggle: Logix.BoundApi<ToggleShape, ToggleService>): Logix.ModuleLogic<ToggleShape, ToggleService, never> =>
    Effect.gen(function* () {
      const click$ = $Toggle.flow.fromAction(
        (a): a is { _tag: 'toggle/click'; payload: void } => a._tag === 'toggle/click',
      )
      const resetError$ = $Toggle.flow.fromAction(
        (a): a is { _tag: 'toggle/resetError'; payload: void } => a._tag === 'toggle/resetError',
      )

      const handleClick = Effect.gen(function* () {
        const current = yield* $Toggle.state.read
        const previousValue = current.enabled
        const nextValue = !previousValue

        // 1. 乐观更新：立即切换开关并进入 saving 状态
        yield* $Toggle.state.update((prev) => ({
          ...prev,
          enabled: nextValue,
          isSaving: true,
          errorMessage: undefined,
        }))

        // 2. 调用服务，并显式处理错误；错误时回滚 enabled
        const svc = yield* $Toggle.use(ToggleService)

        yield* svc.toggle({ id: current.id, nextValue }).pipe(
          Effect.catchTag('ToggleServiceError', (err: ToggleServiceError) =>
            $Toggle.state.update((prev) => ({
              ...prev,
              enabled: previousValue,
              isSaving: false,
              errorMessage: err.reason,
            })),
          ),
        )

        // 3. 若仍处于 saving，说明没有错误，结束 saving 并更新 lastSynced
        const latest = yield* $Toggle.state.read
        if (latest.isSaving) {
          yield* $Toggle.state.update((prev) => ({
            ...prev,
            isSaving: false,
            lastSynced: prev.enabled,
          }))
        }
      })

      const handleResetError = $Toggle.state.update((prev) => ({
        ...prev,
        errorMessage: undefined,
      }))

      yield* Effect.all([
        click$.pipe($Toggle.flow.runExhaust(handleClick)),
        resetError$.pipe($Toggle.flow.run(handleResetError)),
      ])
    }) as Logix.ModuleLogic<ToggleShape, ToggleService, never>

/**
 * 消费方使用示例：
 *
 *   // 1) 在 Logic 层复用 Pattern：
 *   export const ToggleLogicFromPattern =
 *     ToggleModule.logic<ToggleService>(makeOptimisticToggleLogicPattern())
 *
 *   // 2) 在 Module 层装配（示意，与 optimistic-toggle.ts 中类似）：
 *   const ToggleModule = Logix.Module.make('Toggle', { state: ToggleStateSchema, actions: ToggleActionSchema })
 *   export const ToggleImpl = ToggleModule.make<ToggleService>({
 *     initial: initialState,
 *     logics: [ToggleLogicFromPattern],
 *   })
 *
 * 实际项目中，只需在 Logic 部分替换为本 Pattern，即可在多处复用同一套乐观切换行为。
 */

/**
 * 备注：
 * - 平台侧可以将本 Pattern 视为“状态感知型逻辑资产”：在 IntentRule 中只需标记使用该 Pattern，
 *   由 Codegen 生成与 optimistic-toggle.ts 中 ToggleLogic 等价的实现；
 * - 与场景文件成对存在：optimistic-toggle.ts 展示“未抽离”写法，本文件展示“最大化抽离到 Pattern”的写法。
 */
