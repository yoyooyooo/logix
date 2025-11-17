# Quickstart: Logic Traits in Setup（规划草案）

> 目标：演示“一个可复用 Logic 携带 traits 能力”，在多个 Module 中组合复用时 traits 同步生效，且冲突可定位。

## 可运行示例

- Pattern：`examples/logix/src/patterns/traits-reuse.ts`
- Scenarios：
  - `examples/logix/src/scenarios/traits-reuse.ts`
  - `examples/logix/src/scenarios/traits-reuse-from-pattern.ts`
- 运行命令（示例）：`pnpm -C examples/logix exec tsx src/scenarios/traits-reuse.ts`

## 场景

- 你有一段通用能力（例如：为某些 state 字段声明派生/联动/source 行为），希望封装成一个可复用 Logic。
- 该 Logic 被多个 Module 引入后，不仅行为逻辑复用，traits 声明也随之复用。

## 期望的使用方式（示意）

1. 用 `module.logic(build, { id })` 定义一个“带 traits 的可复用 Logic Unit”（traits 在 setup 阶段声明）。
2. 在多个 Module（定义对象）上通过 `withLogic/withLogics` 复用该 Logic Unit（并确保 `logicUnitId` 明确且稳定）。
3. 启动后：
   - 最终 traits 集可枚举（包含来源=该 Logic）；
   - 发生重复 traitId 时启动前硬失败并输出冲突来源；
   - Devtools/证据导出可解释“为何生效/来自哪里”。

## 示例：在 Logic setup 内定义 traits（示意）

> 下面是“预期写法”的示意，具体 API 以实现阶段最终裁决为准；关键点是：traits 只允许在 setup 阶段声明，setup 结束后冻结。

```ts
const ProfileModule = Logix.Module.make("Profile", {
  state: ProfileState,
  actions: ProfileActions,
}).implement({ initial: initialProfileState })

const sharedTraits = Logix.StateTrait.from(ProfileState)({
  "profile.name": Logix.StateTrait.link({ from: "profileResource.name" }),
  sum: Logix.StateTrait.computed({
    deps: ["a", "b"],
    get: (a, b) => a + b,
  }),
})

const ReusableLogic = ProfileModule.logic(
  ($) => ({
    setup: Effect.sync(() => {
      // 只在 setup 阶段声明 traits；provenance 自动绑定到当前 logicUnitId（022 对齐）
      $.traits.declare(sharedTraits)
    }),
    run: Effect.void,
  }),
  { id: "ReusableLogic" },
)

const Live = ProfileModule.withLogic(ReusableLogic)

// 建议：为保证 provenance 稳定，显式提供 logicUnitId（两种等价方式，二选一即可）
// const ReusableLogic = ProfileModule.logic(build, { id: "ReusableLogic" })
// const Live = ProfileModule.withLogic(ReusableLogic, { id: "ReusableLogic" })
```

## 验收自测清单（与 spec 对齐）

- 在不同组合顺序下，最终 traits 集与来源映射保持一致。
- 重复 traitId 必须启动前失败，错误中列出所有冲突来源。
- 导出的证据可序列化且跨环境对比无漂移（traits+provenance+稳定标识）。
