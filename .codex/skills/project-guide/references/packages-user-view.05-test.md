# 5) `@logixjs/test`（测试工具：把“程序”变成可断言的执行）

## 你在什么情况下会用它

- 想用更少样板写“program 风格”的 Logix 测试（启动→交互→断言→释放）。

## 最小入口

- `itProgram/itProgramResult`：`packages/logix-test/src/Vitest.ts`
- `runTest`：`packages/logix-test/src/index.ts`

## 真实示例

- 优先看 `packages/logix-core/test/*`（引擎语义回归）
- 再看各 Feature Kits 的 `packages/*/test/*`
