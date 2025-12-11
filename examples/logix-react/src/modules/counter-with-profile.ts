import * as Logix from "@logix/core"
import { StateTrait } from "@logix/core"
import { Schema } from "effect"

// 1) State Schema：包含原始字段 + computed 字段 + 资源字段
export const CounterStateSchema = Schema.Struct({
  a: Schema.Number,
  b: Schema.Number,
  sum: Schema.Number,
  profile: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
  }),
  // 在示例实现中，将 profileResource 视为结构化对象，便于类型推导路径：
  // - data-model 与 StateTrait 视角中，它是某逻辑资源的快照；
  // - Resource / Query 实际接线会在 Runtime 层实现。
  profileResource: Schema.Struct({
    name: Schema.String,
  }),
})

export type CounterState = Schema.Schema.Type<typeof CounterStateSchema>

// 2) Actions：这里只关注 traits 示例，保持最小集合
export const CounterActions = {
  increment: Schema.Void,
  loadProfile: Schema.String, // userId
}

// 3) Traits：使用 StateTrait.from(StateSchema) 声明 computed / source / link
export const CounterTraits = StateTrait.from(CounterStateSchema)({
  // sum 是 a + b 的派生字段
  sum: StateTrait.computed((s) => s.a + s.b),

  // profileResource 代表 "user/profile" 资源
  profileResource: StateTrait.source({
    resource: "user/profile",
    key: (s) => ({
      userId: s.profile.id,
    }),
  }),

  // profile.name 跟随 profileResource.name（内部字段联动）
  "profile.name": StateTrait.link({
    from: "profileResource.name",
  }),
})

// 4) Module 图纸：state + actions + traits
export const CounterWithProfile = Logix.Module.make("CounterWithProfile", {
  state: CounterStateSchema,
  actions: CounterActions,
  traits: CounterTraits,
})

