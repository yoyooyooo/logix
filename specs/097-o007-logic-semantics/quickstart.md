# Quickstart: O-007 canonical setup/run 语义

## 目标

快速验证逻辑写法在 O-007 后的语义：所有 logic 都归一到 canonical setup/run。

## 推荐写法 1：显式 LogicPlan

```ts
const logic = Module.logic(($) => ({
  setup: Effect.sync(() => {
    // 只做注册
  }),
  run: Effect.gen(function* () {
    // Env/订阅/长期流程放在这里
    const svc = yield* $.use(ServiceTag)
    yield* svc.start
  }),
}))
```

## 推荐写法 2：单相 logic（会被自动归一为 run-only）

```ts
const logic = Module.logic(($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(ServiceTag)
    yield* svc.start
  }),
)
```

等价语义：runtime 会自动补 `setup = Effect.void`，并将原逻辑作为 `run`。

## 禁止写法

- 在 setup 中调用 run-only API（如 `$.use`、`$.onAction`）
- 在 run 中调用 setup-only API（如 `$.lifecycle.onInit`、`$.traits.declare`）

触发后统一得到：`logic::invalid_phase` 诊断。

## 迁移提示

- 历史“多重兼容分支”的行为已收敛到 canonical normalize；
- 若依赖旧分支的隐式行为，请按 `contracts/migration.md` 调整到明确 setup/run 写法。
