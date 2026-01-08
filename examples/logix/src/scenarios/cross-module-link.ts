/**
 * @scenario 跨模块协作（Process.link）
 * @description
 *   演示如何使用 `Process.link`（`Link.make` 等价别名）协调两个独立模块：
 *   - RegionModule: 负责省市区选择；
 *   - CartModule: 负责购物车与运费计算；
 *   - Process: 监听 Region 变化，当选择偏远地区时，向 Cart 派发“加收运费” Action。
 *
 * 运行：
 *   pnpm -C examples/logix exec tsx src/scenarios/cross-module-link.ts
 */

import { Effect, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'

// ---------------------------------------------------------------------------
// 1. Region Module (Simplified)
// ---------------------------------------------------------------------------

const RegionState = Schema.Struct({
  province: Schema.optional(Schema.String),
})

const RegionActions = {
  'region/select': Schema.String,
}

const RegionDef = Logix.Module.make('RegionModule', {
  state: RegionState,
  actions: RegionActions,
})

const RegionLogic = RegionDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('region/select').run((action) => $.state.update((s) => ({ ...s, province: action.payload })))
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

const CartDef = Logix.Module.make('CartModule', {
  state: CartState,
  actions: CartActions,
})

const CartLogic = CartDef.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.all([
      $.onAction('cart/addShippingFee').run((action) => $.state.update((s) => ({ ...s, shippingFee: action.payload }))),
      $.onAction('cart/resetShippingFee').run(() => $.state.update((s) => ({ ...s, shippingFee: 0 }))),
    ])
  }),
)

// ---------------------------------------------------------------------------
// 3. Business Link Logic
// ---------------------------------------------------------------------------

const REMOTE_PROVINCES = ['Tibet', 'Xinjiang']

export const RegionShippingProcess = Logix.Process.link(
  {
    modules: [RegionDef, CartDef] as const,
  },
  ($) =>
    Effect.gen(function* () {
      const region = $[RegionDef.id]
      const cart = $[CartDef.id]

      yield* region
        .changes((s) => s.province)
        .pipe(
          Stream.runForEach((province) =>
            province && REMOTE_PROVINCES.includes(province)
              ? cart.actions['cart/addShippingFee'](20)
              : cart.actions['cart/resetShippingFee'](),
          ),
        )
    }),
)

// ---------------------------------------------------------------------------
// 5. Module Implementations & Runtime Composition
// ---------------------------------------------------------------------------

export const RegionModule = RegionDef.implement({
  initial: { province: undefined },
  logics: [RegionLogic],
})

export const CartModule = CartDef.implement({
  initial: { items: [], shippingFee: 0 },
  logics: [CartLogic],
})

const RootDef = Logix.Module.make('CrossModuleLinkRoot', {
  state: Schema.Void,
  actions: {},
})

const RootImpl = RootDef.implement({
  initial: undefined,
  imports: [RegionModule.impl, CartModule.impl],
  processes: [RegionShippingProcess],
})

const runtime = Logix.Runtime.make(RootImpl)

const waitShippingFee = (cart: any, expected: number) =>
  cart
    .changes((s: any) => s.shippingFee as number)
    .pipe(
      Stream.filter((fee: number) => fee === expected),
      Stream.take(1),
      Stream.runDrain,
      Effect.timeoutFail({
        duration: '2 seconds',
        onTimeout: () => new Error(`[cross-module-link] timeout waiting shippingFee=${expected}`),
      }),
    )

const main = Effect.gen(function* () {
  try {
    yield* Effect.promise(() =>
      runtime.runPromise(
        Effect.gen(function* () {
          const region: any = yield* RegionDef.tag
          const cart: any = yield* CartDef.tag

          yield* region.dispatch({
            _tag: 'region/select',
            payload: 'Tibet',
          } as any)
          yield* waitShippingFee(cart, 20)
          // eslint-disable-next-line no-console
          console.log('[Cart] shippingFee =', (yield* cart.getState).shippingFee)

          yield* region.dispatch({
            _tag: 'region/select',
            payload: 'Beijing',
          } as any)
          yield* waitShippingFee(cart, 0)
          // eslint-disable-next-line no-console
          console.log('[Cart] shippingFee =', (yield* cart.getState).shippingFee)
        }) as any,
      ),
    )
  } finally {
    yield* Effect.promise(() => runtime.dispose())
  }
})

Effect.runPromise(main).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
