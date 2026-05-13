# C1 MPR-3 Spine Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已冻结的 `C1 MPR-3 Spine` 结论真正消费到 live SSoT、`@logixjs/core` root barrel、witness tests，以及仍在教授旧 root canonical 心智的 docs/examples 中。

**Architecture:** 这一批只消费已经冻结的 `C1`，不重开 `C2`。实施顺序固定为：先回写 authority docs，再建立单轨 witness gate，然后收 root barrel 缩口带来的 repo 内 fallout，最后跑定向验证并把总提案进度回写为已实施。`Action` 当前没有独立 subpath，本批不新造 public entrypoint，也不替 `C2` 先做 fate 裁决；它只退出 `C1 canonical mainline` 身份，不在本批强行挪位。迁移期断言一律优先折回现有 kernel-adjacent 测试文件，不新增最终残留的 migration-only test file。

**Tech Stack:** TypeScript, pnpm, Vitest, Markdown docs, package root barrel, package exports

**Batch Scope:** 只消费 `docs/proposals/core-canonical-spine-final-shape-contract.md` 与 `docs/review-plan/runs/2026-04-18-c1-core-canonical-spine-review.md` 已冻结的 `MPR-3 Spine`。本批不进入新的 freeze，不裁 `C2` residual，不新增 `./Action` 之类 public subpath，也不自动执行 `git commit`。

---

## Chunk 1: Batch Frame

### Task 1: 把 Batch 2 的 planning 状态写进总提案

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 新增 Batch 2 planning 槽位**

要求写清：
- 名称：`C1 MPR-3 Spine Cutover`
- 当前状态：`planning`
- 范围：只消费 `MPR-3 Spine`
- 不包含：`C2` freeze、`C2` disposition、深层 runtime 重构

- [ ] **Step 2: 运行最小 diff 检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 2: Authority Writeback

### Task 2: 回写 live SSoT 与 guardrails 到 `MPR-3 Spine`

**Files:**
- Modify: `docs/ssot/runtime/01-public-api-spine.md`
- Modify: `docs/ssot/runtime/03-canonical-authoring.md`
- Modify: `docs/ssot/runtime/07-standardized-scenario-patterns.md`
- Modify: `docs/ssot/runtime/10-react-host-projection-boundary.md`
- Modify: `docs/standards/logix-api-next-guardrails.md`
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 回写 `runtime/01` 的主链公式**

要求：
- canonical mainline 改成 `Module.logic(...) -> Program.make(...) -> Runtime.make(...)`
- root canonical noun 改成 `Module / Program / Runtime`
- 不再把 `Logic` namespace 当 root canonical noun
- 不再把 `ModuleTag` 写进 core canonical spine

- [ ] **Step 2: 回写 `runtime/03` 的 authoring 主骨架**

要求：
- `Logic` 的 canonical 位置固定成 `Module.logic(id, build)`
- 不再把 `Logix.Logic` 当 day-one root 入口
- `ModuleTag` 只保留 host lookup authority，不再贴近 core mainline

- [ ] **Step 3: 回写 `runtime/07` 与 `runtime/10` 的 `ModuleTag` owner**

要求：
- 明确 `ModuleTag` 的 authority 在 React host law
- 明确它已退出 `C1` canonical mainline
- 不改变 host lookup 语义本身

- [ ] **Step 4: 回写 `guardrails` 与总提案**

要求：
- `guardrails` 对齐 `MPR-3 Spine`
- 总提案中的 `C1` 进展仍保持“已冻结但未完全落实”，不要提前写成已实施

- [ ] **Step 5: 跑文档格式检查**

Run:
```bash
git diff --check -- docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/10-react-host-projection-boundary.md docs/standards/logix-api-next-guardrails.md docs/proposals/public-api-surface-inventory-and-disposition-plan.md
```

Expected:
`无输出`

## Chunk 3: Witness Gate

### Task 3: 建立 `MPR-3` 的单轨 witness gate

**Files:**
- Modify: `packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts`
- Modify: `packages/logix-core/test/Contracts/KernelBoundary.test.ts`
- Modify: `packages/logix-core/test/Logix/Logix.test.ts`

- [ ] **Step 1: 在现有 contract tests 中补 `MPR-3` 失败断言**

测试目标：
- `package.json` 仍显式保留 `./Module`、`./Program`、`./Runtime`
- `./Logic`、`./ModuleTag`、`./Bound`、`./Handle`、`./State`、`./Actions` 仍存在，但只作为 residual witness
- root `Logix` 不再把 `Logic`、`ModuleTag`、`Bound`、`Handle`、`State`、`Actions` 当 canonical mainline requirement

落点要求：
- `KernelBoundary.test.ts` 承接 package exports 与负向边界 witness
- `CoreRootBarrel.allowlist.test.ts` 承接 root exact surface
- `Logix.test.ts` 承接正向 `MPR-3` 运行主路径
- 不新增独立 migration-only test 文件

- [ ] **Step 2: 先把 gate 跑成失败**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts test/Contracts/KernelBoundary.test.ts test/Logix/Logix.test.ts
```

Expected:
- 至少一个现有 witness 失败
- `KernelBoundary` 或 `Logix.test` 继续暴露旧 root canonical 假设

- [ ] **Step 3: 改 `Logix.test.ts` 为正向 `MPR-3` witness**

要求：
- 用 `TestModule.logic(...)` 创建 logic
- 用 `Program.make(TestModule, { initial, logics: [TestLogic] })`
- 用 `Runtime.make(program)` 跑通
- 让正向 witness 明确证明 `Module.logic -> Program.make -> Runtime.make`

示例骨架：
```ts
const TestLogic = TestModule.logic('inc', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)
```

- [ ] **Step 4: 改 `KernelBoundary.test.ts` 为负向 `MPR-3` witness**

要求：
- 不再把 `Logix.Logic.of` 当 root canonical requirement
- 新增或改写断言，确认 `Process`、`Workflow` 继续不在 root
- 若本批会收 root barrel，则同时断言 `Logic`、`ModuleTag`、`Bound`、`Handle`、`State`、`Actions` 不再作为 root canonical 入口

- [ ] **Step 5: 改 `CoreRootBarrel.allowlist.test.ts`**

要求：
- root allowlist 去掉 `Logic`、`ModuleTag`、`Bound`、`Handle`、`State`、`Actions`
- `Action` 先保留，显式视为 `C2 carry-over witness`
- 若需要，注释写明“本测试的 C1 authority 只承认 root canonical noun 与当前 carry-over witness”

- [ ] **Step 6: 再跑一次 witness gate**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts test/Contracts/KernelBoundary.test.ts test/Logix/Logix.test.ts
```

Expected:
PASS

## Chunk 4: Root Barrel Cutover

### Task 4: 把 `@logixjs/core` root barrel 收到 `MPR-3` + carry-over witness

**Files:**
- Modify: `packages/logix-core/src/index.ts`

- [ ] **Step 1: 先按 C1 freeze 改 barrel 顶部叙事**

要求：
- 顶部注释改成：root canonical mainline 只有 `Module / Program / Runtime`
- `Logic` 的 canonical 位置改写成 `Module.logic(...)`
- `ModuleTag` 改写成 host-owned support witness

- [ ] **Step 2: 移除 root re-export**

本批从 root barrel 移除：
- `Logic`
- `ModuleTag`
- `Bound`
- `Handle`
- `State`
- `Actions`

本批明确保留：
- `Module`
- `Program`
- `Runtime`
- `Action`
- 其它尚未进入 `C2` freeze 的 residual root surfaces

- [ ] **Step 3: 不动 package subpath**

要求：
- `./Logic`
- `./ModuleTag`
- `./Bound`
- `./Handle`
- `./State`
- `./Actions`

全部保留，不提前裁 `C2`

- [ ] **Step 4: 重新运行 core witness gate**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts test/Contracts/KernelBoundary.test.ts test/Logix/Logix.test.ts
```

Expected:
PASS

## Chunk 5: Repo Fallout

### Task 5: 迁移用户文档与 examples 中的旧 root canonical 写法

**Files:**
- Modify: `apps/docs/content/docs/guide/recipes/unified-api.md`
- Modify: `apps/docs/content/docs/guide/recipes/unified-api.cn.md`
- Modify: `examples/logix/src/patterns/cascade.ts`
- Modify: `examples/logix/src/scenarios/batch-archive-flow.ts`
- Modify: `examples/logix/src/scenarios/file-import-flow.ts`

- [ ] **Step 1: 去掉 `Logix.Logic.*` 的教学写法**

要求：
- 若只是类型位，改成 `import type { Of, Draft } from '@logixjs/core/Logic'`
- 若只是 authoring 表达，优先改成 `Module.logic(...)`
- 不在用户面继续教 root `Logix.Logic`

- [ ] **Step 2: 运行 grep 确认用户面干净**

Run:
```bash
rg -n "Logix\\.(Logic|ModuleTag|Bound|Handle|State|Actions)\\b" apps/docs/content/docs/guide/recipes examples/logix/src/patterns examples/logix/src/scenarios
```

Expected:
无命中

### Task 6: 迁移 repo 内直接依赖已移除 root export 的代码与测试

**Files:**
- Modify: `packages/domain/demos/optimistic-crud/OptimisticCrudProgram.ts`
- Modify: `packages/logix-form/src/internal/form/commands.ts`
- Modify: `packages/logix-form/test/Form/Form.FieldBehavior.Guardrails.test.ts`
- Modify: `packages/logix-query/src/internal/logics/auto-trigger.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConfigErrors.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.Converge.DegradeRuntimeErrorRollback.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.ConvergeBudgetConfig.test.ts`
- Modify: `packages/logix-core/test/FieldKernel/FieldKernel.Degrade.test.ts`
- Modify: `packages/logix-core/test/Module/Module.Manage.extendDef.test.ts`
- Modify: `packages/logix-core/test/Module/Module.make.extendDef.test.ts`
- Modify: `packages/logix-core/test/internal/Reflection/Manifest.Actions.test.ts`
- Modify: `packages/logix-core/src/Bound.ts`
- Modify: `packages/logix-core/src/ModuleTag.ts`

- [ ] **Step 1: Logic type位迁到 subpath**

要求：
- 把 `Logix.Logic.Draft` 改成 `Draft`
- 把 `Logix.Logic.Of` 改成 `Of`
- 统一从 `@logixjs/core/Logic` 或 core tests 的 `../../src/Logic.js` 导入

- [ ] **Step 2: Bound / State / ModuleTag type位迁到 subpath**

要求：
- `Logix.Bound.make` 改成从 `@logixjs/core/Bound` 导入的 `Bound.make`
- `Logix.State.Tag` 改成从 `@logixjs/core/State` 导入的 `Tag`
- `Logix.ModuleTag.*` 的注释或示例改成 `ModuleTag.*` 或本地命名导入，不再写 root `Logix.ModuleTag`

- [ ] **Step 3: 跑 fallout grep**

Run:
```bash
rg -n "Logix\\.(Logic|ModuleTag|Bound|State|Actions)\\b" packages/domain/demos packages/logix-form packages/logix-query packages/logix-core/test packages/logix-core/src
```

Expected:
- 无命中
- 若仍有命中，只允许明确写入注释 allowlist 的 `C2 carry-over witness`

## Chunk 6: Batch Close

### Task 7: 定向验证与总提案进度回写

**Files:**
- Modify: `docs/proposals/public-api-surface-inventory-and-disposition-plan.md`

- [ ] **Step 1: 跑 core witness gate**

Run:
```bash
pnpm -C packages/logix-core exec vitest run test/Contracts/CoreRootBarrel.allowlist.test.ts test/Contracts/KernelBoundary.test.ts test/Logix/Logix.test.ts
```

Expected:
PASS

- [ ] **Step 2: 跑 cross-package fallout tests**

Run:
```bash
pnpm -C packages/logix-form exec vitest run test/Form/Form.FieldBehavior.Guardrails.test.ts
```

Expected:
PASS

- [ ] **Step 3: 跑 workspace typecheck**

Run:
```bash
pnpm typecheck
```

Expected:
PASS

- [ ] **Step 4: 回写总提案**

要求：
- `C1` 从“已冻结但未完全落实”移到已实施
- Batch 2 `C1 MPR-3 Spine Cutover` 状态改成 `implemented`
- `当前最可能的下一批` 改成回到 `C2` freeze

- [ ] **Step 5: 跑最终格式检查**

Run:
```bash
git diff --check -- docs/proposals/public-api-surface-inventory-and-disposition-plan.md docs/ssot/runtime/01-public-api-spine.md docs/ssot/runtime/03-canonical-authoring.md docs/ssot/runtime/07-standardized-scenario-patterns.md docs/ssot/runtime/10-react-host-projection-boundary.md docs/standards/logix-api-next-guardrails.md packages/logix-core/src/index.ts packages/logix-core/test/Contracts/CoreRootBarrel.allowlist.test.ts packages/logix-core/test/Contracts/KernelBoundary.test.ts packages/logix-core/test/Logix/Logix.test.ts
```

Expected:
`无输出`
