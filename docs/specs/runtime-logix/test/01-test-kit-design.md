# Logix Test Kit Design (@logix/test)

> **Status**: Draft
> **Purpose**: 为 Logic Intent 提供环境无关的、可时间旅行的、快照友好的测试基础设施。

## 1. 设计哲学：Pure Effect Testing

我们拒绝在 Effect 生态中引入 Jest 风格的命令式 API。测试代码必须与业务代码保持**同构**，即测试本身也是一个 `Effect` 程序。

*   **一致性**：使用 `Effect.gen` 编写测试场景。
*   **组合性**：测试步骤可以像积木一样组合（如 `Effect.repeat`, `Effect.race`）。
*   **类型安全**：复用 Logix Core 的泛型定义，实现端到端的类型推导。

## 2. API 设计

### 2.1 `TestProgram` + `runTest`

推荐入口：通过声明式配置构建测试场景，再以 Effect 形式运行。

```typescript
import { TestProgram, runTest } from '@logix/test';

const scenario = TestProgram.make({
  main: {
    module: CounterModule,
    initial: { count: 0 },
    logics: [CounterLogic],
  },
  modules: [
    {
      module: AuthModule,
      initial: { loggedIn: false },
      logics: [AuthLogic],
    },
  ],
  layers: [
    LinkLayer,
  ],
});

const myTest = scenario.run((api) => Effect.gen(function*() {
  // 1. Action: 触发信号 (复用 Core 语义)
  yield* api.dispatch({ _tag: 'submit', payload: { id: 1 } });

  // 2. Assertion: 状态断言 (Effect)
  yield* api.assert.state(s => s.count === 100);

  // 3. Assertion: 信号断言
  yield* api.assert.signal('toast', { msg: 'Success' });
}));

// 执行测试，返回 ExecutionResult（包含 Trace）
const result = await runTest(myTest);
```

## 3. 高级能力

### 3.1 模糊测试 (Fuzzing)

由于测试是 Effect，我们可以轻松结合 `@effect/schema/Arbitrary` 生成随机输入进行模糊测试。

```typescript
import * as Arb from '@effect/schema/Arbitrary';
import * as fc from 'fast-check';

const fuzzTest = scenario.run((api) => Effect.gen(function*() {
  const input = yield* Arb.make(InputSchema);
    yield* api.dispatch({ _tag: 'submit', payload: input });
  yield* api.assert.state(s => s.isValid);
}));
```

### 3.2 并发测试

模拟竞态条件。

```typescript
const raceTest = scenario.run((api) => Effect.gen(function*() {
  // 模拟快速点击两次
    yield* Effect.all([
    api.dispatch({ _tag: 'submit', payload: { id: 1 } }),
    api.dispatch({ _tag: 'submit', payload: { id: 2 } })
  ], { concurrency: 'unbounded' });
  
  // 断言只发生了一次 API 调用
  yield* api.assert.serviceCalls(MyServiceTag, 1);
}));
```

## 4. AI 自愈支持

`runTest` 在失败时会抛出结构化的 `ExecutionDump`，包含完整的 Trace 和 State 变更记录，供 AI 分析。
