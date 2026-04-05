---
title: 测试与可运行教程：@effect/vitest / deterministic scheduler / fixture 设计 教程 · 剧本集
status: draft
version: 1
---

# 测试与可运行教程：@effect/vitest / deterministic scheduler / fixture 设计 教程 · 剧本集

> **定位**：这是 `docs/ssot/handbook/` 的“维护者教程/剧本集”（how-to），用于新成员上手、老成员回味：把本仓库的测试栈（`@effect/vitest` + `@logixjs/test`）与“确定性时间/调度”“fixture 组织方式”讲清楚，避免测试退化成「偶尔灵验的魔法」。  
> **重要**：本文不是裁决来源；协议/边界最终以 SSoT 为准（`docs/ssot/platform/**` 与 `docs/ssot/runtime/**`）。

---

## 0. 最短阅读路径（10–20 分钟先能写出一条稳定测试）

1. 质量门与一次性测试（避免 watch）：`docs/ssot/handbook/playbooks/quality-gates.md`
2. 测试工具包（SSoT，权威）：`docs/ssot/runtime/logix-test/01-test-kit-design.md`
3. `@effect/vitest` 的 `layer(...)` 用法（上游源码注释）：`packages/logix-test/node_modules/@effect/vitest/src/index.ts`
4. `@logixjs/test` 的 program 运行器（实现）：`packages/logix-test/src/internal/api/TestProgram.ts`
5. 真实测试参考：
   - core：`packages/logix-core/test/*`
   - form fixtures：`packages/logix-core/test/fixtures/listScopeCheck.ts`
   - converge auto fixture：`packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.fixtures.ts`

---

## 1. 心智模型：测试即 Effect（Runner 只是执行器）

本仓库测试栈的第一性原则是：

> **测试即 Effect**：测试体本身是 `Effect` 程序（可组合、可注入 Layer、可放进 Scope、可用 TestClock），runner 只是“把 Effect 跑起来”的外壳。

这带来三个直接收益：

1. **与业务同构**：依赖统一用 Tag + Layer 注入；你在测试里如何 mock，在业务里就如何提供。
2. **确定性更容易**：时间/随机/调度可以用 Effect 的 TestContext 控制，而不是靠 `setTimeout` 祈祷。
3. **失败可解释**：你可以断言“证据/trace”，而不是只看末态（更稳定、更可回归）。

### 1.1 两套工具的分工（别混用）

- `@effect/vitest`：负责把 `Effect` 跑起来（`it.effect/it.scoped/layer(...)`），并提供 `TestContext/TestClock` 等能力。
- `@logixjs/test`：在 `Effect` 之上提供 Logix 特化能力（`TestProgram/TestRuntime/ExecutionResult`），让“program 风格测试”更少样板。

仓库约定（非常关键）：

- `@logixjs/core` / runtime 核心包的单元测试 **不反向依赖** `@logixjs/test`（避免循环依赖），通常只用 `@effect/vitest`。
- 业务仓库 / 上层应用 / 示例场景，可以直接用 `@logixjs/test` 把场景封成一个可运行程序。

（权威口径见：`docs/ssot/runtime/logix-test/01-test-kit-design.06-effect-vitest.md`）

---

## 2. 核心链路（从 0 到 1）：把不稳定测试变成可回归证据

### 2.1 三个最常用的测试“形态”

1. **`it.effect`**：测试体返回 `Effect`（最常见）
2. **`it.scoped`**：测试体需要 Scope（有资源/订阅/长期 fiber，需要确保释放）
3. **`layer(Live)(...)`**：在一组测试里共享 Layer（减少样板 + 统一依赖）

#### 2.1.1 `it.effect`（推荐默认）

代码形态（仓库大量用法可参考 `packages/logix-core/test/Debug/Debug.test.ts`）：

```ts
import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

describe('demo', () => {
  it.effect('something', () =>
    Effect.gen(function* () {
      expect(1 + 1).toBe(2)
    }),
  )
})
```

#### 2.1.2 `it.scoped`（当你创建了“必须释放”的东西）

适用：你 fork 了 fiber、订阅了 Stream、open 了 Runtime/Program、注册了 finalizer……  
最关键的原则：**测试结束时必须可收束**（否则会出现间歇性挂起/泄漏）。

如果你不确定是否需要 scope，宁可用 `it.scoped` 或在 `it.effect` 里显式 `.pipe(Effect.scoped)`。

#### 2.1.3 `layer(...)`（把一组测试共享的依赖固定下来）

`@effect/vitest` 提供 `layer(Live)(...)`，它会把 Layer “共享/缓存/注入”给块内测试，并支持嵌套：

```ts
import { layer } from '@effect/vitest'
import { Context, Effect, Layer } from 'effect'

class Foo extends Context.Tag('Foo')<Foo, 'foo'>() {
  static Live = Layer.succeed(Foo, 'foo')
}

layer(Foo.Live)('Foo layer', (it) => {
  it.effect('reads Foo', () =>
    Effect.gen(function* () {
      const foo = yield* Foo
      // ...
    }),
  )
})
```

源码注释示例（可直接照抄）在：`packages/logix-test/node_modules/@effect/vitest/src/index.ts`

### 2.2 时间相关测试：用 `TestClock`，不要用真实时间

你需要记住一句话：

> 在 TestContext 下，`Effect.sleep` 不会自动“变快”，你必须显式 `TestClock.adjust(...)` 推进虚拟时间。

典型用法在 `@logixjs/test` 的实现里随处可见：`packages/logix-test/src/internal/api/TestProgram.ts`、`packages/logix-test/src/internal/utils/waitUntil.ts`

### 2.3 宿主调度与 Tick：用 deterministic HostScheduler（否则会漂）

Logix 在 React/ExternalStore 场景下会使用宿主调度（microtask/macrotask/raf/timeout）。  
如果你的测试需要断言这些行为，必须引入“可控宿主调度”，否则测试会被机器负载/事件循环扰动。

有两条常用路径：

1. 业务/集成测试：使用 `@logixjs/test` 的 `Act`（推荐）  
   - `packages/logix-test/src/Act.ts`（`makeTestHostScheduler/flushAllHostScheduler/advanceTicks`）
2. core/runtime 内部测试：直接从 `Logix.InternalContracts` 注入 deterministic scheduler（不依赖 logix-test）

并且要注意“build-time capture”陷阱：

- 可控调度应在 `Logix.Runtime.make(root, { hostScheduler })` 构造时一次性注入，而不是最后 `Layer.mergeAll(...)` 覆盖 Env。  
  口径说明见：`docs/ssot/runtime/logix-core/api/02-module-and-logic-api.06-runtime-container.md`

---

## 3. 剧本集（用例驱动）

### 3.1 我在写 core/runtime 的单测：只用 `@effect/vitest`

推荐模式：

- `describe` 从 `vitest` 导入；
- `it/expect` 从 `@effect/vitest` 导入；
- 测试体返回 `Effect`（`it.effect/it.scoped`）。

参考：

- `packages/logix-core/test/Debug/Debug.test.ts`
- `packages/logix-query/test/Engine.combinations.test.ts`

### 3.2 我在写 “program 风格” 的业务测试：用 `@logixjs/test` 把场景封起来

你可以选择两种 runner 形态：

1. “简易版”：`runTest`（非 Vitest 环境/过渡期）  
   文档：`docs/ssot/runtime/logix-test/01-test-kit-design.02-runtest.md`
2. “推荐版”：`@effect/vitest` 运行 `TestProgram.runProgram(...)` 返回的 Effect

核心实现入口：

- `packages/logix-test/src/internal/api/TestProgram.ts`：`runProgram(program, body, options?)`
- `packages/logix-test/src/internal/api/vitest.ts`：`itProgram/itProgramResult`（vitest sugar）

### 3.3 我想做“共享 Layer 的测试组”：用 `layer(Live)(...)`

适用：

- 一组测试需要同一份依赖（比如同一个 in-memory repo、同一套 fake clock、同一组 service stubs）
- 你想把“依赖注入”与“断言逻辑”彻底分离

建议：优先用于“服务层/纯 Effect 场景”，Logix module/runtime 场景仍以 `Runtime.make(..., { layer })` 明确装配为主。

### 3.4 fixture 怎么写：一个 fixture 只服务一条链路

fixture 的目标不是“复用更多”，而是“让测试可读、可解释、可维护”。

你可以把 fixture 视为“局部 SSoT”：

- 固定 moduleId、固定 diagnosticsLevel、固定 sinks；
- 把易错的装配过程封装成 `makeXFixture()`；
- 把断言辅助函数封成 `pickXxxEvents()` 或 `assertXxx()`；
- 任何随机/时间相关输入都必须可注入（默认值只用于本地调试）。

现成参考：

- `packages/logix-core/test/fixtures/lifecycle.ts`：`makeEventCollectorSink`
- `packages/logix-core/test/fixtures/listScopeCheck.ts`：把“list identity + 跨行互斥校验”封成可复用 trait/初始状态
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.fixtures.ts`：`makeConvergeAutoFixture`（runtime + ring buffer + pick events）

### 3.5 如何避免“偶尔灵验”：把断言从末态提升为证据/trace

当你发现测试变得 flaky，90% 的原因是你只在断言末态，而没有把“过程证据”纳入断言：

- action 是否发出（actions$）
- state changes 是否发生（changes）
- 诊断事件是否按顺序出现（DebugSink / evidence）
- tick/txn 是否在预期窗口内 flush

相关心智模型见：

- `docs/ssot/handbook/reading-room/long-chain/long-chain-j-test-plane.md`
- `docs/ssot/handbook/tutorials/04-observability-evidence-replay.md`

---

## 4. 代码锚点（Code Anchors）

### 4.1 `@effect/vitest`

- `packages/logix-test/node_modules/@effect/vitest/src/index.ts`：`it.effect/it.scoped/layer(...)` 的官方注释示例

### 4.2 `@logixjs/test`

- `packages/logix-test/src/internal/api/TestProgram.ts`：`runProgram`（program module 测试主入口）
- `packages/logix-test/src/internal/api/vitest.ts`：`itProgram/itProgramResult`
- `packages/logix-test/src/Act.ts`：deterministic HostScheduler 辅助（flush/advanceTicks）

### 4.3 本仓库 fixture 参考

- `packages/logix-core/test/fixtures/lifecycle.ts`
- `packages/logix-core/test/fixtures/listScopeCheck.ts`
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.fixtures.ts`

---

## 5. 验证方式（Evidence）

### 5.1 一次性跑测试（不要 watch）

总入口：`docs/ssot/handbook/playbooks/quality-gates.md`

提醒：`packages/logix-test/package.json` 的 `test` 默认是 `vitest`（watch），自动化/一次性验证应使用：

- workspace：`pnpm test`
- 或显式：`pnpm -C packages/logix-test exec vitest run`

---

## 6. 常见坑（Anti-patterns）

1. **在自动化里跑 watch**：测试会驻留、阻塞终端；一律用 `vitest run` 或 workspace `pnpm test`。
2. **用 `setTimeout` 等真实时间**：会引入机器负载扰动；用 `Effect.sleep` + `TestClock.adjust`。
3. **忘记收束 scope**：fork 的 fiber、订阅的 Stream、open 的 Runtime 如果不释放，测试会间歇性 hang。
4. **最后才 merge override layer**：可能覆盖不到 build-time 捕获的服务（hostScheduler/tick services）；应在 `Runtime.make(..., { hostScheduler/layer })` 构造期注入。
5. **只断言末态、不断言证据**：尤其在并发/调度场景里会变成 flaky；优先把断言绑定到 trace/evidence/tick 序列。

