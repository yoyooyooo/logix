/**
 * @scenario 跨模块协作 (Cross-Module Link)
 * @description
 *   演示如何使用 `Link` (原 Orchestrator) 协调两个独立模块：
 *   - RegionModule: 负责省市区选择；
 *   - CartModule: 负责购物车与运费计算；
 *   - Link: 监听 Region 变化，当选择偏远地区时，向 Cart 派发“加收运费” Action。
 */

import { Effect, Schema, Context, Stream, Layer } from 'effect'
import * as Logix from '@logix/core'

// ---------------------------------------------------------------------------
// 1. Region Module (Simplified)
// ---------------------------------------------------------------------------

const RegionState = Schema.Struct({
  province: Schema.optional(Schema.String),
})

const RegionActions = {
  'region/select': Schema.String,
}

const RegionModule = Logix.Module.make('RegionModule', {
  state: RegionState,
  actions: RegionActions,
})

const RegionLogic = RegionModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('region/select').run((action) =>
      $.state.update((s) => ({ ...s, province: action.payload })),
    )
  }),
)

// ---------------------------------------------------------------------------
// 2. Cart Module (Simplified)
// ---------------------------------------------------------------------------

const CartState = Schema.Struct({
  items: Schema.Array(Schema.String),
  shippingFee: Schema.Number,
})

const CartActions = {
  'cart/addShippingFee': Schema.Number,
  'cart/resetShippingFee': Schema.Void,
}

const CartModule = Logix.Module.make('CartModule', {
  state: CartState,
  actions: CartActions,
})

const CartLogic = CartModule.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.all([
      $.onAction('cart/addShippingFee').run((action) =>
        $.state.update((s) => ({ ...s, shippingFee: action.payload })),
      ),
      $.onAction('cart/resetShippingFee').run(() =>
        $.state.update((s) => ({ ...s, shippingFee: 0 })),
      ),
    ])
  }),
)

// ---------------------------------------------------------------------------
// 3. Business Link Logic
// ---------------------------------------------------------------------------

const REMOTE_PROVINCES = ['Tibet', 'Xinjiang']

export const RegionShippingLink = Logix.Link.make(
  {
    modules: [RegionModule, CartModule] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const region = $[RegionModule.id]
      const cart = $[CartModule.id]

      // 监听 Region 变化
      yield* region.changes((s) => s.province).pipe(
        Stream.runForEach((province) =>
          Effect.gen(function* () {
            if (province && REMOTE_PROVINCES.includes(province)) {
              // 偏远地区：加收 20 运费
              yield* cart.actions["cart/addShippingFee"](20)
            } else {
              // 非偏远地区：重置运费
              yield* cart.actions['cart/resetShippingFee']()
            }
          })
        )
      )
    }),
)

// ---------------------------------------------------------------------------
// 5. Module Implementations & Runtime Composition
// ---------------------------------------------------------------------------

export const RegionImpl = RegionModule.implement({
  initial: { province: undefined },
  logics: [RegionLogic],
})

export const CartImpl = CartModule.implement({
  initial: { items: [], shippingFee: 0 },
  logics: [CartLogic],
})

export const RegionLive = RegionImpl.layer
export const CartLive = CartImpl.layer

// 组合应用层：包含 Region 和 Cart 的运行时
export const AppLayer = Layer.mergeAll(RegionLive, CartLive)

// 运行 Link 逻辑
// 注意：Link 本身是一个 Effect，它依赖 AppLayer 提供的环境
export const main = Effect.gen(function* () {
  yield* RegionShippingLink
}).pipe(
  Effect.provide(AppLayer)
)
