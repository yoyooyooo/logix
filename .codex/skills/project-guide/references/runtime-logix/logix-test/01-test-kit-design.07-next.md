# 4. 后续实现要点

- 代码结构（目标形态）：

  ```text
  packages/logix-test/
    src/
      index.ts              # 公共 API：runTest, TestProgram, TestRuntime, Execution, Assertions
      api/
        TestProgram.ts      # TestProgram.make + 场景实现（内部可使用 builder，但不导出）
        TestApi.ts          # TestApi 类型
        defineTest.ts       # runTest 实现（提供 TestContext）
      runtime/
        TestRuntime.ts      # TestRuntime.make + TestRuntimeTag
      ExecutionResult.ts    # ExecutionResult + 期望工具
      utils/
        assertions.ts       # assertState/assertSignal 等底层 Effect 断言
        waitUntil.ts        # 带 TestClock 的重试工具
  ```

- 现有 `Scenario.ts` 可以下沉为 `api/TestProgram` 的内部实现，不再单独作为公共概念暴露；后续可以根据需要调整实现细节，而不影响上层使用。

- 文档视角：
  - 本文件作为 `@logixjs/test` 的 SSoT 规格；
  - apps/docs 中则以「如何测试一个 Counter Module / 多模块联动场景」的教程形式出现，示例代码统一采用原生 Effect + `@effect/vitest` 写法，并在必要处引用本规格中的名词。
