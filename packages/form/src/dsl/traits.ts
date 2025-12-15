import type { Schema } from "effect"
import type * as Logix from "@logix/core"

/**
 * Form.traits：
 * - Phase 3：作为“类型收窄 + 片段组织”的最小入口；
 * - 允许业务 mix-in raw StateTrait.node/list 片段；
 * - 最终返回可直接 spread 的 StateTraitSpec 片段（供 Form.make 组装）。
 */
export const traits =
  <TValues extends object, I>(_valuesSchema: Schema.Schema<TValues, I>) =>
  <S extends Logix.StateTrait.StateTraitSpec<TValues>>(spec: S): S =>
    spec

