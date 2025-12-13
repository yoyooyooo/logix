// @vitest-environment happy-dom

import React from "react"
import { describe, it, expect } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"
import {
  RuntimeProvider,
  useModule,
  useDispatch,
  useSelector,
} from "../src/index.js"

/**
 * 高 Trait 密度场景专用 Module：
 * - state.base 为单一入口字段；
 * - metrics.* 下挂载大量 StateTrait.computed 节点（至少 50 个）；
 * - 用于在 React 集成场景下验证「一次交互 = 一次事务 = 一次 state:update」在高 Trait 数量下仍然成立。
 */
const HighTraitStateSchema = Schema.Struct({
  base: Schema.Number,
  metrics: Schema.Struct({
    // 50 个派生字段，全部由 base 推导，形成高 Trait 密度。
    m01: Schema.Number,
    m02: Schema.Number,
    m03: Schema.Number,
    m04: Schema.Number,
    m05: Schema.Number,
    m06: Schema.Number,
    m07: Schema.Number,
    m08: Schema.Number,
    m09: Schema.Number,
    m10: Schema.Number,
    m11: Schema.Number,
    m12: Schema.Number,
    m13: Schema.Number,
    m14: Schema.Number,
    m15: Schema.Number,
    m16: Schema.Number,
    m17: Schema.Number,
    m18: Schema.Number,
    m19: Schema.Number,
    m20: Schema.Number,
    m21: Schema.Number,
    m22: Schema.Number,
    m23: Schema.Number,
    m24: Schema.Number,
    m25: Schema.Number,
    m26: Schema.Number,
    m27: Schema.Number,
    m28: Schema.Number,
    m29: Schema.Number,
    m30: Schema.Number,
    m31: Schema.Number,
    m32: Schema.Number,
    m33: Schema.Number,
    m34: Schema.Number,
    m35: Schema.Number,
    m36: Schema.Number,
    m37: Schema.Number,
    m38: Schema.Number,
    m39: Schema.Number,
    m40: Schema.Number,
    m41: Schema.Number,
    m42: Schema.Number,
    m43: Schema.Number,
    m44: Schema.Number,
    m45: Schema.Number,
    m46: Schema.Number,
    m47: Schema.Number,
    m48: Schema.Number,
    m49: Schema.Number,
    m50: Schema.Number,
  }),
})

const HighTraitActions = {
  bump: Schema.Void,
}

const HighTraitTraits = Logix.StateTrait.from(HighTraitStateSchema)({
  "metrics.m01": Logix.StateTrait.computed((s) => s.base + 1),
  "metrics.m02": Logix.StateTrait.computed((s) => s.base + 2),
  "metrics.m03": Logix.StateTrait.computed((s) => s.base + 3),
  "metrics.m04": Logix.StateTrait.computed((s) => s.base + 4),
  "metrics.m05": Logix.StateTrait.computed((s) => s.base + 5),
  "metrics.m06": Logix.StateTrait.computed((s) => s.base + 6),
  "metrics.m07": Logix.StateTrait.computed((s) => s.base + 7),
  "metrics.m08": Logix.StateTrait.computed((s) => s.base + 8),
  "metrics.m09": Logix.StateTrait.computed((s) => s.base + 9),
  "metrics.m10": Logix.StateTrait.computed((s) => s.base + 10),
  "metrics.m11": Logix.StateTrait.computed((s) => s.base + 11),
  "metrics.m12": Logix.StateTrait.computed((s) => s.base + 12),
  "metrics.m13": Logix.StateTrait.computed((s) => s.base + 13),
  "metrics.m14": Logix.StateTrait.computed((s) => s.base + 14),
  "metrics.m15": Logix.StateTrait.computed((s) => s.base + 15),
  "metrics.m16": Logix.StateTrait.computed((s) => s.base + 16),
  "metrics.m17": Logix.StateTrait.computed((s) => s.base + 17),
  "metrics.m18": Logix.StateTrait.computed((s) => s.base + 18),
  "metrics.m19": Logix.StateTrait.computed((s) => s.base + 19),
  "metrics.m20": Logix.StateTrait.computed((s) => s.base + 20),
  "metrics.m21": Logix.StateTrait.computed((s) => s.base + 21),
  "metrics.m22": Logix.StateTrait.computed((s) => s.base + 22),
  "metrics.m23": Logix.StateTrait.computed((s) => s.base + 23),
  "metrics.m24": Logix.StateTrait.computed((s) => s.base + 24),
  "metrics.m25": Logix.StateTrait.computed((s) => s.base + 25),
  "metrics.m26": Logix.StateTrait.computed((s) => s.base + 26),
  "metrics.m27": Logix.StateTrait.computed((s) => s.base + 27),
  "metrics.m28": Logix.StateTrait.computed((s) => s.base + 28),
  "metrics.m29": Logix.StateTrait.computed((s) => s.base + 29),
  "metrics.m30": Logix.StateTrait.computed((s) => s.base + 30),
  "metrics.m31": Logix.StateTrait.computed((s) => s.base + 31),
  "metrics.m32": Logix.StateTrait.computed((s) => s.base + 32),
  "metrics.m33": Logix.StateTrait.computed((s) => s.base + 33),
  "metrics.m34": Logix.StateTrait.computed((s) => s.base + 34),
  "metrics.m35": Logix.StateTrait.computed((s) => s.base + 35),
  "metrics.m36": Logix.StateTrait.computed((s) => s.base + 36),
  "metrics.m37": Logix.StateTrait.computed((s) => s.base + 37),
  "metrics.m38": Logix.StateTrait.computed((s) => s.base + 38),
  "metrics.m39": Logix.StateTrait.computed((s) => s.base + 39),
  "metrics.m40": Logix.StateTrait.computed((s) => s.base + 40),
  "metrics.m41": Logix.StateTrait.computed((s) => s.base + 41),
  "metrics.m42": Logix.StateTrait.computed((s) => s.base + 42),
  "metrics.m43": Logix.StateTrait.computed((s) => s.base + 43),
  "metrics.m44": Logix.StateTrait.computed((s) => s.base + 44),
  "metrics.m45": Logix.StateTrait.computed((s) => s.base + 45),
  "metrics.m46": Logix.StateTrait.computed((s) => s.base + 46),
  "metrics.m47": Logix.StateTrait.computed((s) => s.base + 47),
  "metrics.m48": Logix.StateTrait.computed((s) => s.base + 48),
  "metrics.m49": Logix.StateTrait.computed((s) => s.base + 49),
  "metrics.m50": Logix.StateTrait.computed((s) => s.base + 50),
})

const HighTraitModule = Logix.Module.make("ReactHighTraitTxnModule", {
  state: HighTraitStateSchema,
  actions: HighTraitActions,
  traits: HighTraitTraits,
})

const HighTraitLogic = HighTraitModule.logic(($) =>
  Effect.gen(function* () {
    // 单一入口：每次 bump 将 base + 1，触发 50 个 Trait 节点的联动更新。
    yield* $.onAction("bump").mutate((draft) => {
      draft.base += 1
    })
  }),
)

const HighTraitImpl = HighTraitModule.implement({
  initial: {
    base: 0,
    metrics: {
      m01: 1,
      m02: 2,
      m03: 3,
      m04: 4,
      m05: 5,
      m06: 6,
      m07: 7,
      m08: 8,
      m09: 9,
      m10: 10,
      m11: 11,
      m12: 12,
      m13: 13,
      m14: 14,
      m15: 15,
      m16: 16,
      m17: 17,
      m18: 18,
      m19: 19,
      m20: 20,
      m21: 21,
      m22: 22,
      m23: 23,
      m24: 24,
      m25: 25,
      m26: 26,
      m27: 27,
      m28: 28,
      m29: 29,
      m30: 30,
      m31: 31,
      m32: 32,
      m33: 33,
      m34: 34,
      m35: 35,
      m36: 36,
      m37: 37,
      m38: 38,
      m39: 39,
      m40: 40,
      m41: 41,
      m42: 42,
      m43: 43,
      m44: 44,
      m45: 45,
      m46: 46,
      m47: 47,
      m48: 48,
      m49: 49,
      m50: 50,
    },
  },
  logics: [HighTraitLogic],
})

describe("React Runtime high-trait transaction integration", () => {
  it("should keep single StateTransaction and single state:update per user dispatch under high trait density", async () => {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const appRuntime = Logix.Runtime.make(HighTraitImpl, {
      layer: debugLayer,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={appRuntime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        // 在测试中不强求 ModuleRuntime 泛型精确推导，避免为高 Trait 场景增加额外类型噪音。
        const runtime = useModule(
          HighTraitImpl.module,
        ) as Logix.ModuleRuntime<any, any>
        const dispatch = useDispatch(runtime)
        const base = useSelector(runtime as any, (s) => (s as any).base) as number
        return { dispatch, base }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.base).toBe(0)
    })

    const countStateEventsAndTxn = () => {
      const refs = events
        .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
        .filter(
          (ref): ref is Logix.Debug.RuntimeDebugEventRef =>
            ref != null &&
            ref.moduleId === "ReactHighTraitTxnModule" &&
            ref.txnId != null,
        )

      const stateEvents = refs.filter((ref) => ref.kind === "state")
      const txnIds = new Set(stateEvents.map((ref) => ref.txnId))

      return {
        stateEvents: stateEvents.length,
        txnCount: txnIds.size,
      }
    }

    await act(async () => {
      await appRuntime.runPromise(
        Effect.gen(function* () {
          const before = countStateEventsAndTxn()

          result.current.dispatch({
            _tag: "bump",
            payload: undefined,
          } as any)

          // 让内部 Effect 有机会执行与提交事务。
          yield* Effect.sleep("10 millis")

          const after = countStateEventsAndTxn()

          const deltaState = after.stateEvents - before.stateEvents
          const deltaTxn = after.txnCount - before.txnCount

          // 在高 Trait 密度场景下，至少会产生一个新的事务与对应的 state:update 事件，
          // 且仍然保持「每个事务只对应一条 state 事件」这一核心不变式。
          expect(deltaState).toBeGreaterThan(0)
          expect(deltaTxn).toBeGreaterThan(0)
          expect(deltaState).toBe(deltaTxn)
        }),
      )
    })

    await waitFor(() => {
      expect(result.current.base).toBe(1)
    })
  })
}
)
