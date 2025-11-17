/**
 * @scenario 乐观开关 (Optimistic Toggle)
 * @description 演示典型的“UI 先乐观更新，再调用后端；失败时回滚状态并提示错误”的场景。
 *
 * 场景：
 *   - State 中有一个布尔开关 `enabled` 与最后一次成功同步的值 `lastSynced`；
 *   - 用户点击按钮触发 `toggle/click`，UI 立即切换开关，并进入 saving 状态；
 *   - 调用后端 `ToggleService.toggle`，成功则更新 `lastSynced`；失败则回滚 `enabled` 并记录错误信息。
 */

import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import {
  ToggleStateSchema,
  ToggleActionMap,
  type ToggleShape,
  type ToggleState,
  type ToggleAction,
  ToggleService,
  ToggleServiceError,
} from '../patterns/optimistic-toggle.js'

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义 FeatureToggleModule 模块
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Module：使用 Logix.Module 定义 FeatureToggleModule 模块
// ---------------------------------------------------------------------------

export const FeatureToggleDef = Logix.Module.make('FeatureToggleModule', {
  state: ToggleStateSchema,
  actions: ToggleActionMap,
})

// ---------------------------------------------------------------------------
// Logic：监听 Action，触发乐观更新与服务调用（未抽离 Pattern 版），通过 Module.logic 注入 $
// ---------------------------------------------------------------------------

export const FeatureToggleLogic = FeatureToggleDef.logic<ToggleService>(($) =>
  Effect.gen(function* () {
    const handleClick = Effect.gen(function* () {
      const current = yield* $.state.read
      const previousValue = current.enabled
      const nextValue = !previousValue

      // 1. 乐观更新：立即切换开关并进入 saving 状态
      yield* $.state.update((prev) => ({
        ...prev,
        enabled: nextValue,
        isSaving: true,
        errorMessage: undefined,
      }))

      // 2. 调用服务，并显式处理错误；错误时回滚 enabled
      const svc = yield* $.use(ToggleService)

      yield* svc.toggle({ id: current.id, nextValue }).pipe(
        Effect.catchTag('ToggleServiceError', (err: ToggleServiceError) =>
          $.state.update((prev) => ({
            ...prev,
            enabled: previousValue,
            isSaving: false,
            errorMessage: err.reason,
          })),
        ),
      )

      // 3. 若仍处于 saving，说明没有错误，结束 saving 并更新 lastSynced
      const latest = yield* $.state.read
      if (latest.isSaving) {
        yield* $.state.update((prev) => ({
          ...prev,
          isSaving: false,
          lastSynced: prev.enabled,
        }))
      }
    })

    const handleResetError = $.state.update((prev) => ({
      ...prev,
      errorMessage: undefined,
    }))

    yield* $.onAction('toggle/click').runExhaust(handleClick)
    yield* $.onAction('toggle/resetError').run(handleResetError)
  }),
)

// ---------------------------------------------------------------------------
// Impl / Live：组合 State / Action / Logic
// ---------------------------------------------------------------------------

export const FeatureToggleModule = FeatureToggleDef.implement<ToggleService>({
  initial: {
    id: 'toggle-1',
    enabled: false,
    lastSynced: false,
    isSaving: false,
    errorMessage: undefined,
  },
  logics: [FeatureToggleLogic],
})

export const FeatureToggleImpl = FeatureToggleModule.impl
export const ToggleLive = FeatureToggleImpl.layer
