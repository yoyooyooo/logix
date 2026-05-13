---
title: Logix Test 手册（Effect-first）
---

# Logix Test 手册（Effect-first）

## 0) 适用场景

- 你在写 Logix 运行时/模块行为测试。
- 你要在 `@effect/vitest` 与 `@logixjs/test` 之间做正确选型。

## 1) 选型原则

- 纯 Effect / Runtime 行为测试：优先 `@effect/vitest`（`it.effect` / `it.scoped` / `it.layer`）。
- 场景 DSL/执行模型测试：使用 `@logixjs/test` 组织场景，再交给 Effect runner 执行。
- core/runtime 包测试不反向依赖 `@logixjs/test`（避免循环依赖）。

## 2) 运行命令（非 watch）

- workspace 默认：`<pkg-manager> run test:turbo`（优先）
- 全量对照：`<pkg-manager> run test`
- 包内一次性：`<pkg-manager> -C <pkg> exec vitest run`

> 若某个测试脚本默认是 watch，请改用一次性执行命令用于自动化闭环。

## 3) 最小测试矩阵

1. 语义层：declaration/run semantics、reducer/mutate/update 行为。
2. 并发层：latest/exhaust/parallel + 取消/中断分支。
3. 事务层：IO 禁令、enqueue guard、async escape。
4. 诊断层：关键 code 是否可解释。
5. 集成层：React/CLI/Worker 的入口行为。

## 4) 断言风格

- 高风险路径做行为断言，不只 snapshot。
- 每个新增语义至少有一个“失败路径”断言。
- 结果要能回链到模块/事务/流程边界。

## 5) 回归收口

- 类型：`pnpm typecheck`
- 规则：`pnpm lint`
- 测试：`pnpm test:turbo`（必要时 `pnpm test`）

## 6) 延伸阅读（Skill 内）

- `references/llms/07-testing-basics.md`
- `references/llms/04-runtime-transaction-rules.md`
