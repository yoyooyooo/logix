/**
 * @scenario 乐观开关（Pattern 复用版）
 * @description
 *   与 optimistic-toggle.ts 场景使用相同的 State / Action / Service，但 Logic 完全复用
 *   `patterns/optimistic-toggle.ts` 中的 `ToggleLogicFromPattern`，用于验证 Logic Pattern 在多处挂载的可行性。
 */

import { Store } from '../shared/logix-v3-core'
import {
  ToggleStateSchema,
  ToggleActionSchema,
  type ToggleShape,
  ToggleLogicFromPattern,
} from '../patterns/optimistic-toggle'

// ---------------------------------------------------------------------------
// Store：使用 Pattern 提供的 Logic 直接装配 Store
// ---------------------------------------------------------------------------

const ToggleStateLayerFromPattern = Store.State.make(ToggleStateSchema, {
  id: 'toggle-from-pattern',
  enabled: true,
  lastSynced: true,
  isSaving: false,
  errorMessage: undefined,
})

const ToggleActionLayerFromPattern = Store.Actions.make(ToggleActionSchema)

export const ToggleStoreFromPattern = Store.make<ToggleShape>(
  ToggleStateLayerFromPattern,
  ToggleActionLayerFromPattern,
  ToggleLogicFromPattern,
)

