/**
 * @scenario 乐观开关（Pattern 复用版）
 * @description
 *   与 optimistic-toggle.ts 场景使用相同的 State / Action / Service，但 Logic 完全复用
 *   `patterns/optimistic-toggle.ts` 中的 `ToggleLogicFromPattern`，用于验证 Logic Pattern 在多处挂载的可行性。
 */

import * as Logix from '@logix/core'
import {
  ToggleStateSchema,
  ToggleActionMap,
  type ToggleShape,
  makeOptimisticToggleLogicPattern,
} from '../patterns/optimistic-toggle.js'

// ---------------------------------------------------------------------------
// Module / Live：使用 Pattern 提供的 Logic 直接装配领域模块
// ---------------------------------------------------------------------------

export const ToggleModuleFromPattern = Logix.Module.make('ToggleFromPattern', {
  state: ToggleStateSchema,
  actions: ToggleActionMap,
})

export const ToggleLogicFromPattern = ToggleModuleFromPattern.logic(
  makeOptimisticToggleLogicPattern(),
)

export const ToggleImplFromPattern = ToggleModuleFromPattern.implement({
  initial: {
    id: 'toggle-from-pattern',
    enabled: true,
    lastSynced: true,
    isSaving: false,
    errorMessage: undefined,
  },
  logics: [ToggleLogicFromPattern],
})

export const ToggleLiveFromPattern = ToggleImplFromPattern.layer
