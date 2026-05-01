# Program Capabilities Cutover Pass Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `Program.make(...)` 的 canonical 装配面推进到 `initial / capabilities / logics`，让 `capabilities.services / capabilities.imports` 在 `core` 真正落地，并同步收口事实源、测试与最小示例。

**Architecture:** 保持现有 runtime/kernel 主线不动，只在公开装配面做前移收口。`capabilities.imports` 直接映射现有 imported-program 装配能力，`capabilities.services` 直接映射现有 program layer 能力，避免再长第二套 capability runtime。`roots` 当前没有稳定实现落点，这一轮显式保留为未落地槽位，在 docs 和类型面中清楚标注，避免口径继续漂移。

**Tech Stack:** TypeScript, Effect v4, Vitest, pnpm, Logix core runtime

---

## Scope Check

本计划只覆盖一个子系统：`@logixjs/core` 的 `Program.make(...)` canonical cutover，以及与之直接耦合的事实源、契约测试和最小示例。

本计划不覆盖：

- `runtime.check / runtime.trial / runtime.compare` 的公开入口收口
- `internal/runtime/**` forwarding shell 的批量删除
- `roots` 的真实宿主语义实现
- React hooks / RuntimeProvider 的大面积示例替换

理由：这 4 条会显著扩大变更面，超出当前一轮“单一主链 cutover”的可控范围。

## File Structure

- Modify: `packages/logix-core/src/Program.ts`
  - 引入 `ProgramCapabilities` 与 canonical config 正规化。
- Modify: `packages/logix-core/src/Module.ts`
  - 让 `assembleProgram(...)` 接收 program-level service layers，保持 shared assembler 为唯一装配实现。
- Modify: `packages/logix-core/test/Runtime/Runtime.make.Program.test.ts`
  - 覆盖 `capabilities.services / capabilities.imports` 的公开行为。
- Modify: `packages/logix-core/test/Contracts/KernelBoundary.test.ts`
  - 固化 `Program.make(...)` 公开主链和 `Module.implement(...)` 隐藏语义。
- Modify: `examples/logix/src/runtime/root.program.ts`
  - 把最小 canonical root example 切到 `capabilities.imports`。
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
  - 让 canonical authoring 示例和实际实现一致。
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
  - 固化 `services / imports` 已落地，`roots` 暂未落地的事实。
- Modify: `docs/ssot/runtime/05-logic-composition-and-override.md`
  - 保持 `Program` 装配叙事与 capabilities 口径一致。
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
  - 让“默认注入面是 services”在标准场景页有真实实现承接。
- Modify: `docs/standards/logix-api-next-guardrails.md`
  - 收紧 canonical 入口的文字护栏。
- Modify: `docs/standards/logix-api-next-postponed-naming-items.md`
  - 把 `roots` 明确归档为“名称保留、实现待补”的延后项。

## Chunk 1: Canonical Program Config

### Task 1: 给 `Program.make(...)` 增加真实可用的 `capabilities.services / capabilities.imports`

**Files:**
- Modify: `packages/logix-core/src/Program.ts`
- Modify: `packages/logix-core/src/Module.ts`
- Test: `packages/logix-core/test/Runtime/Runtime.make.Program.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelBoundary.test.ts`

- [x] **Step 1: 写失败测试，覆盖 canonical capabilities 路径**

在 `packages/logix-core/test/Runtime/Runtime.make.Program.test.ts` 增加最小用例：

```ts
class GreetingService extends ServiceMap.Service<GreetingService, { readonly greet: Effect.Effect<string> }>()(
  'GreetingService',
) {}

const ChildProgram = Logix.Program.make(ChildDef, {
  initial: { count: 1 },
})

const RootProgram = Logix.Program.make(RootDef, {
  initial: undefined,
  capabilities: {
    services: Layer.succeed(GreetingService, { greet: Effect.succeed('hi') }),
    imports: [ChildProgram.impl],
  },
  logics: [],
})
```

断言：

```ts
expect(await runtime.runPromise(Effect.service(GreetingService).pipe(...))).toBe('hi')
expect(await runtime.runPromise(Effect.service(ChildDef.tag).pipe(...))).toBeDefined()
```

- [x] **Step 2: 跑定向测试确认当前失败**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Runtime/Runtime.make.Program.test.ts \
  packages/logix-core/test/Contracts/KernelBoundary.test.ts
```

Expected: 至少一条和 `capabilities` 未生效相关的断言失败，或 TypeScript 编译阶段报 `capabilities` 不存在。

- [x] **Step 3: 在 `Program.ts` 引入 canonical config 正规化**

目标代码形态：

```ts
export interface ProgramCapabilities<Sh extends AnyModuleShape> {
  readonly services?: Layer.Layer<any, never, any> | ReadonlyArray<Layer.Layer<any, never, any>>
  readonly imports?: ReadonlyArray<Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>>
  readonly roots?: never
}

export interface Config<Sh extends AnyModuleShape, R = never> {
  readonly initial: StateOf<Sh>
  readonly capabilities?: ProgramCapabilities<Sh>
  readonly logics?: Array<ModuleLogic<Sh, R, any>>
  readonly imports?: ReadonlyArray<...> // legacy carry-over
  readonly processes?: ReadonlyArray<...>
  readonly workflows?: ReadonlyArray<Workflow>
  readonly stateTransaction?: ModuleImplementStateTransactionOptions
}
```

新增 `normalizeProgramConfig(...)`：

- `capabilities.imports` 优先并入最终 `imports`
- `capabilities.services` 归一化为 `ReadonlyArray<Layer.Layer<any, never, any>>`
- 若传入 `capabilities.roots`，直接抛显式错误，说明 core 当前未实现该槽位

- [x] **Step 4: 让 shared assembler 真实承接 service layers**

在 `packages/logix-core/src/Module.ts` 给 `ProgramAssemblyConfig` 增加：

```ts
readonly serviceLayers?: ReadonlyArray<Layer.Layer<any, never, any>>
```

在 `assembleProgram(...)` / `createProgram(...)` 中把它和现有 `layers` 统一拼接：

```ts
const serviceLayers = config.serviceLayers ?? []
...
layers: [...serviceLayers, ...state.layers]
```

要求：

- service layer 是 program-level 装配能力
- 不新增第二套 layer/capability 运行时语义
- `withLayer(s)` 仍然继续工作

- [x] **Step 5: 跑定向测试确认通过**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Runtime/Runtime.make.Program.test.ts \
  packages/logix-core/test/Contracts/KernelBoundary.test.ts
```

Expected: PASS。

- [x] **Step 6: 跑 core 类型检查**

Run:

```bash
pnpm -C packages/logix-core exec tsc -p tsconfig.json --noEmit
```

Expected: PASS。

- [x] **Step 7: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 2: Facts And Canonical Example

### Task 2: 让 docs 与最小 canonical example 回到同一口径

**Files:**
- Modify: `examples/logix/src/runtime/root.program.ts`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- Modify: `docs/ssot/runtime/05-logic-composition-and-override.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/standards/logix-api-next-postponed-naming-items.md`

- [x] **Step 1: 改最小 canonical example**

把 `examples/logix/src/runtime/root.program.ts` 改成：

```ts
export const RootProgram = Logix.Program.make(RootDef, {
  initial: undefined,
  capabilities: {
    imports: [CustomerSearchProgram.impl, CustomerDetailProgram.impl],
  },
  processes: [CustomerSearchToDetailProcess],
})
```

要求：

- `imports` 的 canonical 写法走 `capabilities.imports`
- `processes` 继续明确保留为升级能力

- [x] **Step 2: 回写 runtime SSoT**

文档口径统一为：

- canonical surface: `initial / capabilities / logics`
- 本轮在 core 已落地：`capabilities.services / capabilities.imports`
- `processes / workflows / stateTransaction` 继续算升级能力
- `roots` 名称保留，但 core 当前尚未实现该 capability 槽位

- [x] **Step 3: 跑最小验证，确认 example 与测试不回退**

Run:

```bash
pnpm vitest run packages/logix-core/test/Runtime/Runtime.make.Program.test.ts
pnpm typecheck
```

Expected: PASS。

- [x] **Step 4: 自查交叉引用**

人工检查以下文件是否保持一致：

- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md`
- `docs/ssot/runtime/05-logic-composition-and-override.md`
- `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- `docs/standards/logix-api-next-guardrails.md`
- `docs/standards/logix-api-next-postponed-naming-items.md`

核对项：

- 是否都明确写出 `services / imports` 已落地
- 是否都避免把 `roots` 写成已落地事实
- 是否都没有把 `processes / workflows` 再抬回 canonical 主面

- [x] **Step 5: 按仓库策略跳过 commit**

说明：当前仓库禁止自动 `git add/commit`，本任务不执行提交。

## Chunk 3: Verification Gate

### Task 3: 做一轮只覆盖本次 cutover 的回归验证

**Files:**
- Test: `packages/logix-core/test/Runtime/Runtime.make.Program.test.ts`
- Test: `packages/logix-core/test/Contracts/KernelBoundary.test.ts`

- [x] **Step 1: 跑定向测试**

Run:

```bash
pnpm vitest run \
  packages/logix-core/test/Runtime/Runtime.make.Program.test.ts \
  packages/logix-core/test/Contracts/KernelBoundary.test.ts
```

Expected: PASS。

- [x] **Step 2: 跑仓库级类型检查**

Run:

```bash
pnpm typecheck
```

Expected: PASS。

- [x] **Step 3: 检查 diff 只覆盖本轮 cutover**

Run:

```bash
git diff -- packages/logix-core/src/Program.ts \
  packages/logix-core/src/Module.ts \
  packages/logix-core/test/Runtime/Runtime.make.Program.test.ts \
  packages/logix-core/test/Contracts/KernelBoundary.test.ts \
  examples/logix/src/runtime/root.program.ts \
  docs/ssot/runtime/03-canonical-authoring.md \
  docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md \
  docs/ssot/runtime/05-logic-composition-and-override.md \
  docs/ssot/runtime/07-standardized-scenario-patterns.md \
  docs/standards/logix-api-next-guardrails.md \
  docs/standards/logix-api-next-postponed-naming-items.md
```

Expected: 只出现本轮 canonical cutover 相关改动。
